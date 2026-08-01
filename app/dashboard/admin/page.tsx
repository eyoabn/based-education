import { Users, Server, Activity, ArrowUpRight } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Platform Analytics</h1>
        <p className="text-slate-500">Overview of system health and platform growth.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Total Users</h3>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-slate-900">24,592</div>
            <div className="text-sm font-medium text-emerald-500 flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-4 h-4" /> 12%
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Active Live Rooms</h3>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-slate-900">142</div>
            <div className="text-sm font-medium text-emerald-500 flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-4 h-4" /> 5%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">System Load</h3>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-slate-900">42%</div>
            <div className="text-sm font-medium text-slate-500 mb-1">Stable</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Widget */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            Pending Teacher Approvals
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">5</span>
          </h2>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { name: 'Sarah Connor', specialty: 'Computer Science', applied: '2 hours ago' },
            { name: 'Michael Scott', specialty: 'Business Management', applied: '5 hours ago' },
          ].map((item, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{item.name}</div>
                <div className="text-sm text-slate-500">{item.specialty} • Applied {item.applied}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">Approve</button>
                <button className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
