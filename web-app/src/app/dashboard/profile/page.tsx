"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Mail, GraduationCap, Sparkles, BookOpen, Pencil, Check, X } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", degree: "", interests: "" });
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setEditForm({
          name: data.name || "",
          degree: data.degree || "",
          interests: data.interests || ""
        });
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editForm.name,
          degree: editForm.degree,
          interests: editForm.interests
        })
        .eq("id", user.id);

      if (!error) {
        setProfile({ ...profile, ...editForm });
        setIsEditing(false);
      } else {
        alert("Failed to update profile: " + error.message);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-600/20 rounded-2xl text-violet-400">
            <User size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Profile</h1>
            <p className="text-slate-400 text-sm md:text-base">Manage your student digital identity.</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all border border-white/5"
          >
            <Pencil size={16} /> Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all border border-green-500/10"
            >
              <Check size={20} />
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/10"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </header>

      <div className="glass-panel p-8 rounded-3xl border border-white/5 space-y-10 relative overflow-hidden">
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/10 shadow-xl">
             {(isEditing ? editForm.name : profile?.name)?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left flex-1 w-full">
            {isEditing ? (
              <input 
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xl font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Full Name"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{profile?.name || "Student"}</h2>
            )}
            <div className="flex items-center gap-2 text-slate-400 mt-2 justify-center md:justify-start">
               <Mail size={14} /> {user?.email}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5 relative z-10">
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <GraduationCap size={16} className="text-blue-400" /> Academic Context
              </h3>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 h-full">
                 <p className="text-xs text-slate-500 mb-2">Studying / Degree</p>
                 {isEditing ? (
                   <input 
                     type="text"
                     value={editForm.degree}
                     onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                     className="w-full bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                     placeholder="e.g. B.Tech CS"
                   />
                 ) : (
                   <p className="text-white font-medium">{profile?.degree || "Not specified"}</p>
                 )}
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Sparkles size={16} className="text-violet-400" /> Personal Interests
              </h3>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 h-full">
                 <p className="text-xs text-slate-500 mb-2">Hobbies & Focus</p>
                 {isEditing ? (
                   <textarea 
                     value={editForm.interests}
                     onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                     className="w-full bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 h-20"
                     placeholder="What do you enjoy?"
                   />
                 ) : (
                   <p className="text-white font-medium">{profile?.interests || "Keep exploring..."}</p>
                 )}
              </div>
           </div>
        </div>

        <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 mt-6 relative z-10">
           <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
              <BookOpen size={16} /> MindMate Integration
           </h3>
           <p className="text-xs text-slate-400 leading-relaxed">
              Your profile data is meticulously analyzed by MindMate to provide deeply personalized mental wellness guidance tailored to your specific academic stressors and personal interests.
           </p>
        </div>
      </div>
    </div>
  );
}
