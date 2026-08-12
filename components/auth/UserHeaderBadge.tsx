"use client";

import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  teacherStatus?: string | null;
}

export default function UserHeaderBadge() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
      <div className="text-right">
        <div className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{name}</div>
        <div className="text-xs text-slate-500 font-medium">{role}</div>
      </div>
      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-indigo-200 overflow-hidden shadow-sm">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials || <UserIcon className="w-4 h-4" />}</span>
        )}
      </div>
    </div>
  );
}
