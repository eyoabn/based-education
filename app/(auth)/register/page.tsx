"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export default function RegisterPage() {
  const router = useRouter()
  // Hardcode role to STUDENT (Member) for the single-teacher platform
  const role = "STUDENT"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Always pass role as STUDENT and specialty as empty
        body: JSON.stringify({ name, email, password, role, specialty: "" }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create the account.")
      }

      triggers.auth.studentRegistered(data.user.name)
      router.push(data.redirect)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the account."
      setError(message)
      triggers.auth.failed(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-primary selection:text-black">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-primary/20 rounded-3xl shadow-2xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 flex items-center justify-center">
            {/* Using the logo instead of the EC letters */}
            <img src="/logo.png" alt="Sanctuary Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Join the Sanctuary
        </h2>
        <p className="text-primary text-center mb-8 text-sm font-medium">
          Create an account to access live teachings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={event => setName(event.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
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
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-400 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-[#FCE69B] text-black font-bold rounded-xl shadow-lg shadow-primary/20 transition-all mt-6 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-primary hover:text-[#FCE69B] font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
