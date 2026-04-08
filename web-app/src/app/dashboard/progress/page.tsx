"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Calendar, Info, Brain, Target } from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function ProgressPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    streak: 0,
    totalEntries: 0,
    topMood: "None",
    stability: 0
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (data) {
        setEntries(data);
        calculateStats(data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const calculateStats = (data: any[]) => {
    if (!data || data.length === 0) {
      setStats({
        streak: 0,
        totalEntries: 0,
        topMood: "None",
        stability: 0
      });
      return;
    }

    // 1. Calculate Streak
    const dates = data.map(e => new Date(e.created_at).toDateString());
    const uniqueDates = Array.from(new Set(dates)).reverse();
    
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let currentIdx = 0;
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      streak = 1;
      let checkDate = new Date(uniqueDates[0]);
      
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i]);
        const diff = (new Date(uniqueDates[i-1]).getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
        if (diff <= 1.1) {
          streak++;
        } else {
          break;
        }
      }
    }

    // 2. Top Mood
    const counts: any = {};
    data.forEach(e => {
      const m = e.mood || 'Unknown';
      counts[m] = (counts[m] || 0) + 1;
    });
    const topMood = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

    // 3. Stability (variance in mood scores)
    const scores = data.map(e => {
        const m = (e.mood || '').toLowerCase();
        return m === 'happy' ? 5 : m === 'calm' ? 4 : m === 'stress' ? 3 : m === 'angry' ? 2 : 1;
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
    const stability = Math.max(0, Math.min(100, (1 - variance / 4) * 100));

    setStats({
      streak,
      totalEntries: data.length,
      topMood,
      stability: Math.round(stability)
    });
  };

  const chartData = entries.map(e => {
    const m = (e.mood || '').toLowerCase();
    const score = m === 'happy' ? 5 : m === 'calm' ? 4 : m === 'stress' ? 3 : m === 'angry' ? 2 : 1;
    return {
      date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score,
      mood: e.mood
    };
  });

  const moodDistribution = Object.entries(
    entries.reduce((acc: any, curr) => {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#22c55e', '#60a5fa', '#f97316', '#ef4444', '#64748b'];

  if (loading) return <div className="p-8 text-slate-400">Loading your progress...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
          <TrendingUp size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Progress</h1>
          <p className="text-slate-400">Tracking your emotional growth over time.</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center gap-3 text-orange-400 mb-2">
            <Flame size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">Streak</span>
          </div>
          <div className="text-4xl font-bold text-white">{stats.streak} <span className="text-sm font-normal text-slate-400">days</span></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Calendar size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">Total Checkups</span>
          </div>
          <div className="text-4xl font-bold text-white">{stats.totalEntries}</div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 text-violet-400 mb-2">
            <Brain size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">Common Mood</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.topMood}</div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <Target size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">Stability Index</span>
          </div>
          <div className="text-4xl font-bold text-white">{stats.stability}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mood Trend Chart */}
        <div className="glass-panel p-8 rounded-3xl border border-white/5 min-h-[400px]">
          <h3 className="text-xl font-bold text-white mb-6">Mood Trajectory</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    const labelMap: any = { 5: 'Happy', 4: 'Calm', 3: 'Stress', 2: 'Angry', 1: 'Sad' };
                    return labelMap[val] || '';
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-white/5 min-h-[400px]">
          <h3 className="text-xl font-bold text-white mb-6">Emotional Landscape</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {moodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patterns & Insights Section */}
      <section className="glass-panel p-8 rounded-3xl border border-white/5">
        <div className="flex items-center gap-2 mb-6 text-blue-400">
          <Info size={20} />
          <h3 className="text-xl font-bold text-white">MindMate Patterns</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
              Consistency Insights
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              {stats.streak > 3 
                ? `Incredible! A ${stats.streak}-day streak shows significant dedication to your mental wellbeing.`
                : stats.totalEntries > 0 
                ? "You've started your journey. Consistency is key to unlocking deeper emotional patterns."
                : "Complete your first checkup to see consistency insights."}
            </p>
          </div>
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              Emotional Resilience
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your Stability Index is {stats.stability}%. {stats.stability > 70 
                ? "A high index suggests you're maintaining a very steady emotional state." 
                : "Variations in mood are normal; tracking them helps you understand what triggers shifts."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
