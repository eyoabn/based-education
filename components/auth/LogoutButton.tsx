"use client"

import { useState } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { triggers } from "@/lib/e2e-triggers"

export default function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const logout = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      triggers.auth.loggedOut()
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoading}
      title="Sign out"
      aria-label="Sign out"
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Sign out
    </button>
  )
}
