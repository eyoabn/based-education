"use client"

import { useEffect, useState } from "react"
import { Database, Trash2, Users, BookOpen, AlertCircle, Loader2, RefreshCw } from "lucide-react"

export default function AdminDatabasePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "courses">("overview")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (type: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/database?type=${type}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || "Failed to fetch data")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab])

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to completely delete this ${type}? This bypasses safety checks.`)) return
    try {
      const res = await fetch(`/api/admin/database?id=${id}&type=${type}`, {
        method: "DELETE"
      })
      if (res.ok) {
        fetchData(activeTab)
      } else {
        const json = await res.json()
        alert(json.error || "Failed to delete record")
      }
    } catch {
      alert("Error occurred while deleting")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Database Reports & Management
          </h1>
          <p className="text-slate-500">
            Raw access to database statistics, bulk reports, and deep record management.
          </p>
        </div>
        <button
          onClick={() => fetchData(activeTab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Overview Report
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Users Registry
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "courses" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Courses Registry
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : activeTab === "overview" && data?.reports ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(data.reports).map(([key, value]) => (
            <div key={key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total {key}</h3>
              <div className="text-4xl font-extrabold text-slate-900">{value as number}</div>
            </div>
          ))}
        </div>
      ) : activeTab === "users" && data?.users ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Stats</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'TEACHER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                      {user.isBanned && <span className="ml-2 text-xs text-red-600 font-bold">BANNED</span>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      Enrolled: {user._count.enrolledIn} | Taught: {user._count.taughtCourses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(user.id, "user")}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Force Delete User Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "courses" && data?.courses ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Teacher</th>
                  <th className="px-6 py-4">Metrics</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.courses.map((course: any) => (
                  <tr key={course.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{course.title}</div>
                      <div className="text-xs text-slate-500 font-mono">{course.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      {course.teacher.name}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course._count.students}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(course.id, "course")}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Force Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
