import os
import sys
import json
import re
from typing import List, Tuple

# -------------------------------
# GROQ CLIENT INITIALIZATION
# -------------------------------
from groq import Groq
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY not set in environment variables.")
client = Groq(api_key=api_key)


# -------------------------------
# LLM CALL WRAPPER
# -------------------------------
def ask_llm(prompt: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
    """Send prompt to LLM through Groq and return response."""
    # Try preferred model first, then fallbacks if the model is decommissioned
    preferred = "mixtral-8x7b-32768"
    fallbacks = [
        "mixtral-8x7b-instant",
        "mixtral-8x7b",
        "llama-3.1-8b-instant",
    ]

    last_exc = None
    for model_name in [preferred] + fallbacks:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            # log if we had to fallback
            if model_name != preferred:
                print(f"[INFO] used fallback model: {model_name}")
            return response.choices[0].message.content.strip()
        except Exception as e:
            last_exc = e
            # If the error indicates the model is decommissioned / not found / access issue,
            # try the next fallback model. Otherwise stop and raise.
            err_text = str(e).lower()
            if (
                "decommissioned" in err_text
                or "model_not_found" in err_text
                or "does not exist" in err_text
                or "not found" in err_text
                or "do not have access" in err_text
                or "not have access" in err_text
            ):
                # try next fallback
                continue
            # other errors -> stop here
            break

    # If we get here, all attempts failed
    raise RuntimeError(f"LLM call failed (all models tried). Last error: {last_exc}")


# -------------------------------
# CLEAN OUTPUT LINES
# -------------------------------
def _clean_lines(text: str) -> List[str]:
    lines = []
    for line in text.splitlines():
        line = line.strip().lstrip("-•").lstrip()
        while line and (line[0].isdigit() or line[0] in ".)"):
            line = line[1:].lstrip(" .) ")
        if line:
            lines.append(line)
    return lines[:8]


# -------------------------------
# GENERATE FOLLOW-UP QUESTIONS
# -------------------------------
def generate_followup_questions(prev_mood: str, prev_journal: str) -> List[str]:

    prompt = f"""
You are a caring student wellness assistant. Generate exactly 8 diverse, thoughtful questions.

Yesterday:
Mood: {prev_mood}
Journal: "{prev_journal[:500]}"

Generate 8 short, varied, conversational questions.
Number 1-8. No extra text.
    """

    out = ask_llm(prompt, max_tokens=400, temperature=0.85)
    questions = _clean_lines(out)

    if len(questions) < 6:  # fallback attempt
        simple = f"""
Generate 8 wellness check-in questions. Yesterday mood: {prev_mood}.
Yesterday text: "{prev_journal[:300]}"
Format: numbered 1-8.
        """
        out = ask_llm(simple, max_tokens=250)
        questions = _clean_lines(out)

    if len(questions) < 8:
        questions += ["(extra question)"] * (8 - len(questions))

    return questions[:8]


# -------------------------------
# MOOD PREDICTION
# -------------------------------
def predict_mood_with_llm(text: str) -> Tuple[str, float]:

    prompt = f"""
Analyze the student's emotion from this text:

"{text[:1500]}"

Choose ONE: angry, stress, sad, happy, calm.
Answer only the word.
    """

    result = ask_llm(prompt, max_tokens=10, temperature=0.1).lower()
    result = re.sub(r"[^a-z]", "", result)

    moods = ["angry", "stress", "sad", "happy", "calm"]
    for m in moods:
        if m in result:
            return m, 0.9

    return "calm", 0.5


# -------------------------------
# GENERATE SUGGESTION
# -------------------------------
def generate_solution(mood_label: str, combined_text: str, answers: List[str]) -> str:

    prompt = f"""
Student mood: {mood_label}
Student wrote: "{combined_text[:1200]}"

Write 2-4 sentences of warm, personalized advice.
Reference EXACT things they said.
End with: "Next step: …"
    """

    response = ask_llm(prompt, max_tokens=250, temperature=0.7)
    return response


# -------------------------------
# LOAD YESTERDAY FILE
# -------------------------------
def load_yesterday(path="yesterday.json"):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    if os.path.exists("today.json"):
        with open("today.json", "r", encoding="utf-8") as f:
            return json.load(f)
    return {"mood": "calm", "journal": "Had a regular day."}


# -------------------------------
# MAIN PROGRAM
# -------------------------------
if __name__ == "__main__":

    print("\nLoading yesterday's context...")
    yesterday = load_yesterday()
    print("Mood:", yesterday["mood"])

    print("\nGenerating questions...")
    prev_answers = " ".join(yesterday.get("answers", [])) if "answers" in yesterday else ""
    prev_ctx = (yesterday["journal"] + " " + prev_answers).strip()

    questions = generate_followup_questions(yesterday["mood"], prev_ctx)

    print("\nToday's Questions:")
    answers = []
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q}")
        ans = input("Your answer (Enter = skip): ").strip()
        if ans:
            answers.append(ans)

    print("\nWrite your journal entry (empty line to end):")
    lines = []
    while True:
        line = input()
        if not line.strip():
            break
        lines.append(line)
    journal = " ".join(lines) if lines else "(no journal)"

    combined = " ".join(answers + [journal])

    print("\nPredicting mood...")
    mood, conf = predict_mood_with_llm(combined)

    print("\nGenerating personalized suggestion...")
    suggestion = generate_solution(mood, combined, answers)

    print("\n=== RESULT ===")
    print("Mood:", mood, f"(confidence {conf:.2f})")
    print("\nSuggestion:")
    print(suggestion)

    # Save
    today = {"mood": mood, "confidence": conf, "journal": journal, "answers": answers}
    with open("today.json", "w", encoding="utf-8") as f:
        json.dump(today, f, indent=2)
    print("\nSaved to today.json")
