import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnvVar } from "@/lib/env-config";

export async function POST(req: Request) {
  try {
    const { combinedText, answers, journal, userId } = await req.json();

    const cleanKey = getEnvVar("GROQ_API_KEY");

    if (!cleanKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not set." }, { status: 500 });
    }
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen-2.5-32b"
    ];

    const groq = new Groq({ apiKey: cleanKey });

    async function callLLM(prompt: string, maxTokens: number, temp: number): Promise<string> {
      let lastError;
      for (const m of models) {
        try {
          const completion = await groq.chat.completions.create({
            model: m,
            messages: [{ role: "user", content: prompt }],
            temperature: temp,
            max_tokens: maxTokens,
          });

          if (completion.choices?.[0]?.message?.content) {
            return completion.choices[0].message.content;
          }
        } catch (e: any) {
          console.error(`Model ${m} failed:`, e.message || e);
          lastError = e;
          continue;
        }
      }
      throw lastError || new Error("All Groq models failed.");
    }

    // 1. Predict Mood
    const moodPrompt = `Analyze the student's emotion from this text:
"${combinedText.substring(0, 1500)}"
Choose ONE: angry, stress, sad, happy, calm.
Answer only the word.`;

    let mood = "calm";
    let confidence = 0.5;

    try {
      const respText = await callLLM(moodPrompt, 15, 0.1);
      const rawMood = respText.toLowerCase().replace(/[^a-z]/g, "");
      const moods = ["angry", "stress", "sad", "happy", "calm"];
      for (const m of moods) {
        if (rawMood.includes(m)) {
          mood = m;
          confidence = 0.9;
          break;
        }
      }
    } catch (e) {
      console.error("Mood prediction failed", e);
    }

    // Fetch Profile Context if available
    let userContext = "";
    let supabaseClient: any = null;
    let cookieStore: any = null;
    
    if (userId) {
      try {
        cookieStore = await cookies();
        supabaseClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => cookieStore.getAll(),
              setAll: (cookiesToSet) => {
                try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch (_) {}
              },
            },
          }
        );

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profile) {
          userContext = `\nContext regarding the student:\nName: ${profile.name}\nAge: ${profile.age}\nStudying/Degree: ${profile.degree}\nHobbies & Interests: ${profile.interests}\n`;
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      }
    }

    // 2. Generate Suggestion
    const suggestionPrompt = `Student mood: ${mood}
Student wrote: "${combinedText.substring(0, 1200)}"${userContext}

You are MindMate, a mental wellness companion designed specifically for college students. You deeply understand student-specific stressors like exam pressure, assignment deadlines, career anxiety, job hunting, CGPA stress, social pressure, homesickness, and burnout.
Your tone is warm, non-judgmental, and peer-like — not clinical. You give practical, student-friendly advice. You are not a therapist but a supportive friend who understands student life deeply.

Write exactly 3 to 4 sentences of highly personalized, meaningful advice for the student based on their entry. 
Make sure to reference their specific degree, interests, or past journal entries to make them feel heard.
End directly with a very short actionable "Next step: …"`;

    let suggestion = "Take a deep breath and give yourself some grace today. You are doing much better than you realize. Next step: Try resting for 10 minutes.";
    try {
      const sugOutput = await callLLM(suggestionPrompt, 150, 0.7);
      if (sugOutput) {
        suggestion = sugOutput.trim();
      }
    } catch (e) {
      console.error("Suggestion failed", e);
    }

    // Attempt to save to Supabase if userId is provided
    if (userId && supabaseClient) {
      try {
        await supabaseClient.from("journal_entries").insert({
          user_id: userId,
          mood,
          confidence,
          journal,
          answers,
          suggestion,
          questions: [] // Ideally from the checkup state
        });
      } catch (dbError) {
        console.error("Failed to save to db (maybe table doesn't exist yet):", dbError);
      }
    }

    return NextResponse.json({ mood, confidence, suggestion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
