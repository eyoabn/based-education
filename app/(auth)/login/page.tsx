"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, KeyRound, CheckCircle2, AlertCircle, X, Mail } from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Check your email and password, then try again.")
      }

      triggers.auth.loggedIn(data.user.name, data.user.role)
      router.push(data.redirect)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Check your email and password, then try again."
      setError(message)
      triggers.auth.failed(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request.")
      }

      setForgotSuccess(true)
    } catch (err: any) {
      setForgotError(err?.message || "An error occurred while submitting your request.")
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgotModal = () => {
    setShowForgotModal(false)
    setForgotSuccess(false)
    setForgotError(null)
    setForgotEmail("")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-[#C9A94A] selection:text-black">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C9A94A]/20 rounded-3xl shadow-2xl p-8 relative">
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
        <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h2>
        <p className="text-[#C9A94A] text-center mb-8 text-sm font-medium">
          Sign in to access your sacred teachings and classes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A94A] focus:border-transparent transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex justify-between">
              Password
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email)
                  setShowForgotModal(true)
                }}
                className="text-[#C9A94A] hover:text-[#d4af37] text-xs font-semibold hover:underline cursor-pointer transition-all"
              >
                Forgot password?
              </button>
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A94A] focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#C9A94A] hover:bg-[#b5953e] disabled:opacity-70 text-black font-bold rounded-lg shadow-lg shadow-[#C9A94A]/25 transition-all mt-6 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#C9A94A] hover:text-[#d4af37] font-medium">
            Join the Sanctuary
          </Link>
        </p>
      </div>

      {/* Forgot Password Request Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0F0F12] border border-[#C9A94A]/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200">
            <button
              onClick={closeForgotModal}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {!forgotSuccess ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#C9A94A]/10 border border-[#C9A94A]/25 text-[#C9A94A] flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Forgot Your Password?</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Enter your registered email address. We will submit a password reset request to the system administrator, who will issue and email your link.
                </p>

                {forgotError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Your Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-[#16161B] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A94A] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-colors border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-2.5 rounded-xl bg-[#C9A94A] hover:bg-[#b5953e] disabled:opacity-60 text-black text-sm font-bold shadow-lg shadow-[#C9A94A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {forgotLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                      <span>{forgotLoading ? "Submitting..." : "Submit Request"}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-2 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Request Submitted!</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                  An administrator has been notified of your password reset request for <span className="font-semibold text-[#C9A94A]">{forgotEmail}</span>.
                </p>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs text-left leading-relaxed">
                  The link that will allow you to enter your new password will be sent to your email once reviewed by the administrator.
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full mt-2 py-3 bg-[#C9A94A] hover:bg-[#b5953e] text-black font-bold rounded-xl transition-all shadow-lg shadow-[#C9A94A]/25 cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

