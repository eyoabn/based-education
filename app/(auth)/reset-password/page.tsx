"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("No reset token provided. Please click the link sent by your administrator.");
      setIsValidatingToken(false);
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok || !data.valid) {
          setTokenError(data.error || "This password reset link is invalid or has expired.");
        } else {
          setTargetEmail(data.email || null);
        }
      } catch {
        if (isMounted) {
          setTokenError("Failed to verify the password reset link. Please check your connection.");
        }
      } finally {
        if (isMounted) {
          setIsValidatingToken(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password. Please try again.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C9A94A]/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
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

      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-[#C9A94A]/10 border border-[#C9A94A]/20 text-[#C9A94A] mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Reset Your Password</h2>
        <p className="text-[#C9A94A] text-sm font-medium">
          {targetEmail ? `Setting a new password for ${targetEmail}` : "Enter your new password below"}
        </p>
      </div>

      {isValidatingToken ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Loader2 className="w-8 h-8 text-[#C9A94A] animate-spin" />
          <p className="text-sm text-neutral-400">Verifying reset authorization...</p>
        </div>
      ) : tokenError ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Invalid Reset Link</p>
              <p className="text-xs text-red-300 leading-relaxed">{tokenError}</p>
            </div>
          </div>
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Sign In
          </Link>
        </div>
      ) : isSuccess ? (
        <div className="text-center space-y-6 py-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Password Reset Complete</h3>
            <p className="text-sm text-neutral-400">
              Your password has been securely updated. You will be redirected to the sign-in page in a few seconds.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl bg-[#C9A94A] hover:bg-[#d4af37] text-black font-semibold text-sm transition-all shadow-lg shadow-[#C9A94A]/20"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A94A] focus:border-transparent transition-all text-sm"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A94A] focus:border-transparent transition-all text-sm"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#C9A94A] hover:bg-[#d4af37] text-black font-semibold text-sm transition-all shadow-lg shadow-[#C9A94A]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs text-[#C9A94A] hover:text-[#d4af37] inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-[#C9A94A] selection:text-black">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C9A94A]/20 rounded-3xl p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#C9A94A] animate-spin" />
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
