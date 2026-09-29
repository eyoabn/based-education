"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Home, Loader2 } from "lucide-react";
import { triggers } from "@/lib/e2e-triggers";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      triggers.auth.loggedOut();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-[#C9A94A] selection:text-black">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C9A94A]/20 rounded-3xl shadow-2xl p-8 backdrop-blur-sm text-center relative overflow-hidden">
        <div className="flex justify-center mb-6">
          <Link href="/" className="w-16 h-16 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sanctuary Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(201,169,74,0.4)]"
            />
          </Link>
        </div>

        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-[#C9A94A]/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-[#111] border-2 border-[#C9A94A] rounded-full flex items-center justify-center shadow-lg shadow-[#C9A94A]/20">
            <Clock className="w-10 h-10 text-[#C9A94A]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Application Under Review</h2>
        <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
          Your Teacher Application is currently being reviewed by the administration.
          We verify each instructor&apos;s credentials to ensure exceptional quality across all courses.
          <br /><br />
          You will receive an update once your account has been reviewed.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#C9A94A] hover:bg-[#d4af37] text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#C9A94A]/20"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-medium rounded-xl text-sm transition-all border border-white/10 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A94A]" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign in with a different account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
