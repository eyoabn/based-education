"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { BookOpen, FileText, Link as LinkIcon, ExternalLink, ArrowLeft } from "lucide-react"

interface Material {
  id: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
  createdAt: string
}

export default function StudentCourseMaterialsPage() {
  const { id: courseId } = useParams()
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/materials`)
        if (res.ok) {
          const data = await res.json()
          setMaterials(data.materials || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [courseId])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Materials</h1>
          <p className="text-sm text-slate-500">Readings, slides, and links provided by your instructor.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">No Materials Available</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Your instructor hasn't uploaded any materials for this course yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {materials.map(mat => (
            <div key={mat.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                {mat.fileType === "pdf" ? <FileText className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900">{mat.title}</h3>
                {mat.description && <p className="text-sm text-slate-500 mt-1">{mat.description}</p>}
                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Material
                </a>
              </div>
              <div className="shrink-0 text-xs text-slate-400">
                {new Date(mat.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
