"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT")
  const [isLoading, setIsLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise(r => setTimeout(r, 700))
    const name = nameRef.current?.value || "User"

    if (role === "STUDENT") {
      triggers.auth.studentRegistered(name)
      router.push("/dashboard/student")
    } else {
      triggers.auth.teacherApplicationSubmitted()
      router.push("/pending-approval")
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold text-white">⚡</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Create an account</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Join Educonnect and start learning today.</p>

        {/* Role Switcher */}
        <div className="flex p-1 bg-slate-900 rounded-lg mb-6 border border-slate-700">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              role === "STUDENT" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setRole("STUDENT")}
          >
            I am a Student
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              role === "TEACHER" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setRole("TEACHER")}
          >
            I am a Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input 
              ref={nameRef}
              type="text" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {role === "TEACHER" && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <label className="block text-sm font-medium text-slate-300 mb-1">Teaching Specialty</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g. Advanced Mathematics"
              />
              <p className="text-xs text-slate-500 mt-2">
                Your account will require admin approval before you can host live rooms.
              </p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all mt-6 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
