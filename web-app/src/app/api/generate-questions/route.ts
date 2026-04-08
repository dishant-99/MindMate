import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getEnvVar } from "@/lib/env-config";

export async function POST(req: Request) {
  try {
    const { prevMood, prevJournal } = await req.json();

    const cleanKey = getEnvVar("GROQ_API_KEY");

    if (!cleanKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not set or empty." }, { status: 500 });
    }
    
    // Fallback defaults
    const moodToUse = prevMood || "calm";
    const journalToUse = prevJournal || "Had a regular day.";
    
    // Attempt to fetch profile context from cookies
    let userContext = "";
    try {
      const { cookies } = require("next/headers");
      const { createServerClient } = require("@supabase/ssr");
      const cookieStore = await cookies();
      const supabaseClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: () => {},
          },
        }
      );
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData?.user?.id) {
        const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", userData.user.id).single();
        if (profile) {
          userContext = `\nAbout the student:\nName: ${profile.name}\nMajor: ${profile.degree}\nHobbies: ${profile.interests}\n`;
        }
      }
    } catch (e) {
      console.error("Generate Qs Profile Fetch Error:", e);
    }

    const prompt = `You are MindMate, a mental wellness companion designed specifically for college students. You deeply understand student-specific stressors like exam pressure, assignment deadlines, career anxiety, job hunting, CGPA stress, social pressure, homesickness, and burnout.
Your tone is warm, non-judgmental, and peer-like — not clinical. You give practical, student-friendly advice. You are not a therapist but a supportive friend who understands student life deeply.

Yesterday the student felt: ${moodToUse}
Yesterday they wrote: "${journalToUse.substring(0, 500)}"${userContext}

Generate exactly 8 varied, conversational questions for today's checkup. 
CRITICAL: Use the 'MindMate' persona (peer-like, non-judgmental) to ask these questions. 
Sync your personality with their specific journal thoughts or major/hobbies mentioned above.
Keep them concise. Number 1-8. No extra text. Use student-friendly language.`;

    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen-2.5-32b"
    ];
    
    const groq = new Groq({ apiKey: cleanKey });
    let rawContent = "";
    let lastError: any = null;

    try {
      for (const m of models) {
        try {
          const completion = await groq.chat.completions.create({
            model: m,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.85,
            max_tokens: 400,
          });

          if (completion.choices?.[0]?.message?.content) {
            rawContent = completion.choices[0].message.content;
            break; // Success!
          }
        } catch (e: any) {
          console.error(`Model ${m} failed:`, e.message || e);
          lastError = e;
          continue; 
        }
      }

      if (!rawContent) {
        throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown"}. Key snippet: ${cleanKey.substring(0, 8)}`);
      }
      
      // Clean lines
      const questions = rawContent
        .split('\n')
        .map(line => line.trim().replace(/^[-•]\s*/, '').replace(/^\d+[\.\)]\s*/, ''))
        .filter(line => line.length > 0)
        .slice(0, 8);

      // Pad if less than 8
      while (questions.length < 8) {
        questions.push("(Extra question - What else is on your mind?)");
      }

      return NextResponse.json({ questions: questions.slice(0, 8) });

    } catch (err: any) {
      console.error("Groq Generation Error:", err);
      return NextResponse.json({ error: err.message || "Failed to generate questions." }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
