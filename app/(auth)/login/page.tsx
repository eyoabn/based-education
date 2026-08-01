"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export default function LoginPage() {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Mock auth — in production this calls POST /api/auth/login and reads the
    // role from the JWT response. We default to STUDENT for demo purposes.
    await new Promise(r => setTimeout(r, 700))

    const mockName = emailRef.current?.value.split("@")[0] ?? "Student"
    const mockRole = "STUDENT" as const

    triggers.auth.loggedIn(mockName, mockRole)
    router.push("/dashboard/student")
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold text-white">⚡</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Sign in to your Educonnect account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              ref={emailRef}
              type="email" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex justify-between">
              Password
              <Link href="#" className="text-indigo-400 hover:text-indigo-300 text-xs">Forgot password?</Link>
            </label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all mt-6 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
