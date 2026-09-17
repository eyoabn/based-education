"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-[#C9A94A] selection:text-black">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-[#C9A94A]/20 rounded-3xl shadow-2xl p-8">
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
              <Link href="#" className="text-[#C9A94A] hover:text-[#d4af37] text-xs">
                Forgot password?
              </Link>
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
            className="w-full py-3 bg-[#C9A94A] hover:bg-[#b5953e] disabled:opacity-70 text-black font-bold rounded-lg shadow-lg shadow-[#C9A94A]/25 transition-all mt-6 flex items-center justify-center gap-2"
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
    </div>
  )
}
