import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Groq from "groq-sdk";
import { getEnvVar } from "@/lib/env-config";

export async function POST(req: Request) {
  try {
    const cleanKey = getEnvVar("GROQ_API_KEY");

    if (!cleanKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not set." }, { status: 500 });
    }

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
    if (!userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch up to last 10 entries for context
    const { data: entries } = await supabaseClient
      .from("journal_entries")
      .select("created_at, mood, journal")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
      
    if (!entries || entries.length === 0) {
      return NextResponse.json({ analysis: "Not enough data yet. Complete a few checkups first!" });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    let context = "";
    if (profile) {
      context = `Student Profile: ${profile.name}, Age ${profile.age}, studying ${profile.degree}. Interests: ${profile.interests}\n\n`;
    }

    const entriesStr = entries.reverse().map(e => `Date: ${new Date(e.created_at).toLocaleDateString()} | Mood: ${e.mood} | Thoughts: ${e.journal}`).join('\n');

    const prompt = `You are MindMate, a holistic wellness AI companion designed specifically for college students. You deeply understand student-specific stressors like exam pressure, assignment deadlines, career anxiety, job hunting, CGPA stress, social pressure, homesickness, and burnout. 
Your tone is warm, non-judgmental, and peer-like. You are a supportive friend who understands student life deeply.

Analyze this student's recent history and profile.
${context}
Recent Journals:
${entriesStr}

Provide a "Deep AI Insight" - a high-level, generalized assessment of their overarching emotional state.
Identify recurring patterns, give high-level validation, and suggest one overarching lifestyle shift.
Keep it to exactly one tight, engaging paragraph (max 4 sentences). Use student-friendly Language.`;

    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen-2.5-32b"
    ];

    const groq = new Groq({ apiKey: cleanKey });
    let lastError;
    for (const m of models) {
      try {
        const completion = await groq.chat.completions.create({
          model: m,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          max_tokens: 250,
        });

        if (completion.choices?.[0]?.message?.content) {
          return NextResponse.json({ analysis: completion.choices[0].message.content });
        }
      } catch (e: any) {
        console.error(`Model ${m} failed:`, e.message || e);
        lastError = e;
        continue;
      }
    }

    return NextResponse.json({ error: "LLM Generation Failed" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
