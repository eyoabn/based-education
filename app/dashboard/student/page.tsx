import { BookOpen, Trophy, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function StudentDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back, Jane! 👋</h1>
        <p className="text-slate-500">You have 2 classes today and 1 upcoming assignment.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Enrolled Courses</h3>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">4</div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Average Score</h3>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">92%</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Study Hours</h3>
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">14.5<span className="text-base font-normal text-slate-500 ml-1">hrs</span></div>
        </div>
      </div>

      {/* Upcoming Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Today's Schedule</h2>
          <Link href="/dashboard/student/calendar" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View full calendar
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { time: '10:00 AM', title: 'Advanced Calculus', teacher: 'Dr. Smith', type: 'Live Class', status: 'upcoming' },
            { time: '02:00 PM', title: 'Physics 101', teacher: 'Prof. Johnson', type: 'Assignment Due', status: 'pending' },
          ].map((item, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-sm font-bold text-slate-900 w-20">{item.time}</div>
                <div>
                  <div className="font-semibold text-slate-800">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.type} • {item.teacher}</div>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                Join <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
