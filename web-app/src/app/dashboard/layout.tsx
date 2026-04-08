"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, LayoutDashboard, LogOut, Activity, TrendingUp, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 py-4 px-3 md:px-6 flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Brain size={20} />
          </div>
          <span className="text-lg md:text-xl font-bold text-white tracking-tight hidden sm:inline">MindMate</span>
        </Link>
        
        <nav className="flex items-center justify-center gap-4 md:gap-8 text-sm font-medium shrink-0">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-2 transition-colors ${pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> <span className="hidden md:inline">Dashboard</span>
          </Link>
          <Link 
            href="/checkup" 
            className={`flex items-center gap-2 transition-colors ${pathname === '/checkup' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity size={18} /> <span className="hidden md:inline">Daily Checkup</span>
          </Link>
          <Link 
            href="/dashboard/progress" 
            className={`flex items-center gap-2 transition-colors ${pathname === '/dashboard/progress' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            <TrendingUp size={18} /> <span className="hidden md:inline">My Progress</span>
          </Link>
          <Link 
            href="/dashboard/profile" 
            className={`flex items-center gap-2 transition-colors ${pathname === '/dashboard/profile' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            <User size={18} /> <span className="hidden md:inline">Profile</span>
          </Link>
        </nav>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium shrink-0"
        >
          <LogOut size={18} /> <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-6xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
