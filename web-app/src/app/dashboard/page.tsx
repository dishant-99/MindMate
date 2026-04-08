"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { Activity, CalendarHeart, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Brain } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [analytics, setAnalytics] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const { data: entriesData } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (entriesData) setEntries(entriesData);

      setLoading(false);
    }
    getUser();
  }, []);

  const generateAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/generate-analytics", { method: "POST" });
      const data = await res.json();
      if (data.analysis) setAnalytics(data.analysis);
      else setAnalytics("Could not generate insights right now.");
    } catch (e) {
      setAnalytics("Error connecting to LLM for insights.");
    }
    setAnalyticsLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse text-slate-400 flex justify-center py-20">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-slate-400 mt-1">{user?.email}</p>
        </div>
        <Link 
          href="/checkup" 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]"
        >
          <Sparkles size={18} /> Start Today's Checkup <ArrowRight size={18} />
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats / Info Cards */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Your Mood Trends</h3>
          </div>
          
          {entries.length > 0 ? (
            <div className="h-48 w-full mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart barSize={35} data={[...entries].reverse().map(e => {
                   const m = (e.mood || '').toLowerCase();
                   const score = m === 'happy' ? 5 : m === 'calm' ? 4 : m === 'stress' ? 3 : m === 'angry' ? 2 : 1;
                   const emojiMap: any = { happy: '😊', calm: '😌', stress: '😤', angry: '😡', sad: '😔' };
                   const colorMap: any = { happy: '#22c55e', calm: '#60a5fa', stress: '#f97316', angry: '#ef4444', sad: '#64748b' };
                   return {
                     date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                     score,
                     rawMood: e.mood,
                     emoji: emojiMap[m] || '😶',
                     fillColor: colorMap[m] || '#64748b',
                   };
                })}>
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis 
                    domain={[0, 5]} 
                    ticks={[1, 2, 3, 4, 5]} 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (val === 5) return 'Happy';
                      if (val === 4) return 'Calm';
                      if (val === 3) return 'Stress';
                      if (val === 2) return 'Angry';
                      if (val === 1) return 'Sad';
                      return '';
                    }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                    itemStyle={{ color: '#bae6fd', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(val: any, name: any, props: any) => [`${props.payload.emoji} ${props.payload.rawMood}`, 'Mood']}
                  />
                  <Bar dataKey="score" radius={[8, 8, 8, 8]} animationDuration={1500}>
                    { [...entries].reverse().map((entry, index) => {
                        const m = (entry.mood || '').toLowerCase();
                        const colorMap: any = { happy: '#22c55e', calm: '#60a5fa', stress: '#f97316', angry: '#ef4444', sad: '#64748b' };
                        return <Cell key={`cell-${index}`} fill={colorMap[m] || '#64748b'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-400 mt-1">Consistency builds resilience. Start today's checkup to build your chart.</p>
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between md:col-span-2 relative overflow-hidden group">
          <div className="z-10 text-left flex-1">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               Deep AI Analytics
            </h3>
            
            {analytics ? (
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 mt-3 animate-in fade-in zoom-in duration-500">
                <p className="text-sm text-slate-300 leading-relaxed italic">"{analytics}"</p>
              </div>
            ) : (
               <>
                 <p className="text-base text-slate-300 max-w-lg mb-6 leading-relaxed">
                   Want to know what Deep AI Analytics thinks about your mental wellbeing? 🧠✨
                 </p>
                 <button 
                   onClick={generateAnalytics}
                   disabled={analyticsLoading || entries.length === 0}
                   className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm text-white font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                 >
                   {analyticsLoading ? "Processing Synapses..." : entries.length === 0 ? "No Entries Yet" : "Generate Deep Insight"}
                 </button>
               </>
            )}
          </div>

          <div className="absolute -right-8 -bottom-8 opacity-[0.15] text-[#6366f1] pointer-events-none transform rotate-12">
            <Brain size={240} strokeWidth={1} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Entries</h2>
             {entries && entries.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {entries.map(entry => {
                   const safeMood = (entry.mood || '').toLowerCase();
                   return (
                   <div 
                     key={entry.id} 
                     onClick={() => setSelectedEntry(entry)}
                     className="glass-panel p-5 rounded-2xl flex flex-col gap-3 cursor-pointer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all duration-300"
                   >
                     <div className="flex justify-between items-center">
                       <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                       <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase ${
                         safeMood === 'happy' || safeMood === 'calm' ? 'bg-green-500/20 text-green-400' : 
                         safeMood === 'stress' || safeMood === 'angry' ? 'bg-red-500/20 text-red-400' : 
                         'bg-blue-500/20 text-blue-400'
                       }`}>
                         {entry.mood}
                       </span>
                     </div>
                     <p className="text-sm text-slate-300 line-clamp-3 italic">"{entry.journal || 'No written journal'}"</p>
                     <div className="mt-auto pt-3 border-t border-white/10">
                       <p className="text-xs text-slate-400 line-clamp-2">💡 {entry.suggestion}</p>
                     </div>
                   </div>
                 )})}
               </div>
             ) : (
               <div className="glass-panel rounded-2xl p-8 text-center border border-dashed border-white/20">
                 <p className="text-slate-400">Your recent journal entries will appear here.</p>
               </div>
             )}
      </div>

      {/* Full Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 p-6 md:p-8 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400"
            >
              ✕
            </button>
            <div className="flex justify-between items-center mb-6 pr-8">
              <h2 className="text-2xl font-bold text-white">Checkup Analysis</h2>
              <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm font-semibold uppercase tracking-wider text-slate-300 border border-white/5">
                {selectedEntry.mood}
              </span>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2"><Sparkles size={16} /> Counselors Advice</h3>
                <p className="text-slate-200 leading-relaxed text-sm md:text-base">{selectedEntry.suggestion}</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Your Freeflow Journal</h3>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                  <p className="text-slate-300 italic text-sm md:text-base">"{selectedEntry.journal || 'No journal written'}"</p>
                </div>
              </div>

              {selectedEntry.answers?.length > 0 && selectedEntry.questions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider mt-6">Guided Questions & Answers</h3>
                  <div className="space-y-3">
                    {selectedEntry.questions.map((q: string, i: number) => (
                      <div key={i} className="bg-slate-800/30 p-4 rounded-xl border border-white/5">
                        <p className="text-sm font-semibold text-slate-300 mb-2">{q}</p>
                        <p className="text-sm text-slate-400 pl-4 border-l-2 border-slate-600">
                          {selectedEntry.answers[i] || "No answer provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
