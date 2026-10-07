"use client";

import { useEffect, useState } from "react";
import { Camera, User as UserIcon } from "lucide-react";
import ProfileSettingsModal, { type UserProfileData } from "@/components/profile/ProfileSettingsModal";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  teacherStatus?: string | null;
  bio?: string | null;
  specialty?: string | null;
}

export default function UserHeaderBadge() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    fetchMe();

    const onProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfileData>;
      if (customEvent.detail) {
        setUser(prev => (prev ? { ...prev, ...customEvent.detail } : customEvent.detail));
      }
    };

    window.addEventListener("user-profile-updated", onProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", onProfileUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 pl-6 border-l border-slate-200 animate-pulse">
        <div className="text-right space-y-1">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-3 w-16 bg-slate-200 rounded ml-auto" />
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-200" />
      </div>
    );
  }

  const name = user?.name ?? "Guest User";
  const role = user?.role === "ADMIN" ? "Administrator" : user?.role === "TEACHER" ? "Educator" : "Student";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 md:pl-6 border-l border-slate-200 hover:opacity-90 transition-opacity text-left group cursor-pointer focus:outline-none"
        title="Click to edit profile picture and details"
      >
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-slate-800 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors">
            {name}
          </div>
          <div className="text-xs text-slate-500 font-medium">{role}</div>
        </div>
        <div 
          className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-indigo-200 overflow-hidden shadow-sm shrink-0 group-hover:border-indigo-400 transition-colors"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials || <UserIcon className="w-4 h-4" />}</span>
          )}
          <span className="absolute inset-0 bg-slate-900/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {user && (
        <ProfileSettingsModal
          user={user}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={updated => setUser(prev => (prev ? { ...prev, ...updated } : updated))}
        />
      )}
    </>
  );
}
