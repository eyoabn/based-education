import { Users, FileText, CheckCircle, Radio } from "lucide-react"

export default function TeacherDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Teacher Studio Dashboard</h1>
          <p className="text-slate-500">Manage your classes, students, and grading.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all hover:scale-105">
          <Radio className="w-5 h-5 animate-pulse" />
          Start Quick Live Session
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Total Students</h3>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">142</div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Active Exams</h3>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">2</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Ungraded Submissions</h3>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">28</div>
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent Class Activity</h2>
        </div>
        <div className="p-6 text-center text-slate-500">
          No recent activity to display.
        </div>
      </div>
    </div>
  )
}
