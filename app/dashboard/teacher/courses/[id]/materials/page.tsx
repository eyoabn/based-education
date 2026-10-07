"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { BookOpen, FileText, Link as LinkIcon, Plus, Trash2, ExternalLink, Loader2, ArrowLeft } from "lucide-react"

interface Material {
  id: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
  createdAt: string
}

export default function TeacherCourseMaterialsPage() {
  const { id: courseId } = useParams()
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [fileType, setFileType] = useState("link")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMaterials()
  }, [courseId])

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, fileUrl, fileType })
      })
      if (res.ok) {
        setIsModalOpen(false)
        setTitle("")
        setDescription("")
        setFileUrl("")
        setFileType("link")
        fetchMaterials()
      }
    } catch (err) {
      alert("Failed to upload material")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Materials</h1>
          <p className="text-sm text-slate-500">Upload slides, PDFs, or links for your students.</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">No Materials Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Share important documents, reading links, and slides with your enrolled students.
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Course Material</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">File or Link URL *</label>
                <input required type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                <select value={fileType} onChange={e => setFileType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="link">External Link</option>
                  <option value="pdf">PDF Document</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
