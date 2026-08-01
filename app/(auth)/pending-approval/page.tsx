import Link from "next/link"
import { Clock } from "lucide-react"

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8 backdrop-blur-sm text-center">
        
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-slate-900 border-2 border-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">Account Pending Review</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your Teacher Account is currently under review by the Super Admin. We need to verify your credentials to maintain the quality of our platform.
          <br /><br />
          You will receive an email notification once your account has been approved.
        </p>

        <Link 
          href="/"
          className="inline-block w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
