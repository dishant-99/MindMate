"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckupPage() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(0); // 0 = loading q's, 1 = questions, 2 = journal, 3 = loading result, 4 = result
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [journal, setJournal] = useState("");
  const [result, setResult] = useState<{ mood: string; suggestion: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);
      
      // Fetch latest journal to get prior mood for context
      let prevMood = "calm";
      let prevJournal = "Had a regular day.";
      try {
        const { data } = await supabase
          .from("journal_entries")
          .select("mood, journal")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) {
          prevMood = data.mood;
          prevJournal = data.journal;
        }
      } catch (e) {}

      // Fetch questions
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prevMood, prevJournal })
        });
        const data = await res.json();
        
        if (!res.ok) {
           setErrorMsg(data.error || "Failed to contact LLM");
           setQuestions(["Fallback: How are you feeling today?", "Fallback: What's on your mind?"]);
        } else {
           setQuestions(data.questions || []);
        }
        setStep(1);
      } catch (e: any) {
        setErrorMsg("Network error: " + e.message);
        setQuestions(["Fallback: How are you feeling today?", "Fallback: What's on your mind?"]);
        setStep(1);
      }
    }
    init();
  }, []);

  const handleNextQuestion = () => {
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setStep(2); // move to journal
    }
  };

  const submitCheckup = async () => {
    setStep(3); // Analyzing
    const combinedText = [...answers, journal].join(" ");
    
    try {
      const res = await fetch("/api/analyze-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          combinedText,
          answers,
          journal,
          userId: user?.id
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ mood: "unknown", suggestion: "Error analyzing journal. Take care of yourself today." });
    }
    setStep(4);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#020817] flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        <Link href="/dashboard" className="text-blue-400 hover:text-white transition-colors mb-8 inline-flex items-center gap-2">
           {"←"} Back to Dashboard
        </Link>
        
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 text-slate-300">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
              <p>Preparing your daily checkup...</p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="questions" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-8 rounded-3xl relative"
            >
              {errorMsg && (
                <div className="absolute -top-12 left-0 right-0 bg-red-500/20 text-red-300 text-sm p-2 rounded-xl text-center border border-red-500/50">
                  <span className="font-bold">LLM Warning:</span> {errorMsg}
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-medium text-slate-400 mb-6">
                <span>{currentQuestionIdx + 1} of {questions.length}</span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full w-4 ${i <= currentQuestionIdx ? 'bg-blue-500' : 'bg-slate-700'}`} />
                  ))}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
                {questions[currentQuestionIdx]}
              </h2>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Your answer (optional)"
                className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  {currentQuestionIdx === questions.length - 1 ? "Proceed to Journal" : "Next"} <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="journal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-2">Freeflow Journal</h2>
              <p className="text-slate-400 mb-6">Write down anything else on your mind today. Let it all out.</p>
              
              <textarea
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="Dear journal..."
                className="w-full h-48 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="mt-6 flex justify-end">
                <button
                  onClick={submitCheckup}
                  className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  Analyze & Save
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 text-slate-300">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto text-violet-500 mb-4" />
              <h2 className="text-xl text-white font-medium mb-2">Analyzing your Entry...</h2>
              <p>Our LLM is formulating targeted advice for you.</p>
            </motion.div>
          )}

          {step === 4 && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl text-center">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Checkup Complete</h2>
              <div className="inline-block px-4 py-1.5 bg-slate-800 rounded-full text-slate-300 text-sm font-medium mb-6 border border-white/10">
                Detected Mood: <span className="text-white capitalize">{result.mood}</span>
              </div>
              
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 text-left mb-8">
                <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  <Brain size={18} /> MindMate Suggestion
                </h3>
                <p className="text-slate-300 leading-relaxed text-lg">{result.suggestion}</p>
              </div>

              <Link href="/dashboard" className="px-8 py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-medium transition-all inline-block">
                Return to Dashboard
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
