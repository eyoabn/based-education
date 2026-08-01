import { type ReactNode } from "react"
import Link from "next/link"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
              <span className="text-sm font-bold">⚡</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Educonnect</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-800 py-12 bg-slate-900 mt-20">
        <div className="container mx-auto px-4 text-center text-slate-500 max-w-7xl">
          <p>© {new Date().getFullYear()} Educonnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
