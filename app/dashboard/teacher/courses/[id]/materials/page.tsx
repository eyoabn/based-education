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
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-[#111110] hover:bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] rounded-xl transition-all text-[#9d9b95] hover:text-[#f7f3e8]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37] shadow-lg shadow-black/40 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-[#f7f3e8] tracking-tight">Course Materials</h1>
            <p className="text-sm text-[#9d9b95]">Upload slides, PDFs, or links for your students.</p>
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-[rgba(212,175,55,0.15)] transition-all min-h-[44px] active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#9d9b95]">
          <Loader2 className="w-6 h-6 animate-spin text-[#d4af37] mx-auto mb-3" />
          Loading materials...
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-[#111110] p-12 rounded-2xl border border-white/[0.08] shadow-lg text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mx-auto text-[#d4af37]">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-black text-[#f7f3e8] text-lg">No Materials Yet</h3>
          <p className="text-[#9d9b95] text-sm max-w-sm mx-auto">
            Share important documents, reading links, and slides with your enrolled students.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black font-extrabold text-sm rounded-xl inline-flex items-center gap-2 shadow-lg shadow-[rgba(212,175,55,0.15)] transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add First Material
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {materials.map(mat => (
            <div
              key={mat.id}
              className="bg-[#111110] p-5 rounded-2xl border border-white/[0.08] shadow-lg flex items-start gap-4 hover:border-[rgba(212,175,55,0.25)] transition-all group"
            >
              <div className="p-3 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] rounded-xl text-[#d4af37] shrink-0 shadow-sm">
                {mat.fileType === "pdf" ? <FileText className="w-6 h-6" /> : mat.fileType === "video" ? <ExternalLink className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-[#f7f3e8]">{mat.title}</h3>
                {mat.description && <p className="text-sm text-[#9d9b95] mt-1">{mat.description}</p>}
                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-[#d4af37] hover:text-[#f5d77f] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Material
                </a>
              </div>
              <div className="shrink-0 text-xs text-[#9d9b95] font-mono">
                {new Date(mat.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div
            className="fixed inset-0"
            onClick={() => setIsModalOpen(false)}
            aria-hidden
          />
          <div className="relative bg-[#111110] rounded-3xl max-w-md w-full shadow-2xl border border-white/[0.08] animate-fade-up z-10">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#181817] via-[#141413] to-[#111110] p-6 border-b border-white/[0.08] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] rounded-2xl text-[#d4af37]">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-[#f7f3e8]">Add Course Material</h2>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f7f3e8] mb-2">
                  Title <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Lecture 3 Slides"
                  className="w-full px-4 py-3 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f7f3e8] mb-2">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional short description for students..."
                  className="w-full px-4 py-3 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f7f3e8] mb-2">
                  File or Link URL <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  required
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f7f3e8] mb-2">
                  Type
                </label>
                <select
                  value={fileType}
                  onChange={e => setFileType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="link" className="bg-[#181817]">External Link</option>
                  <option value="pdf" className="bg-[#181817]">PDF Document</option>
                  <option value="video" className="bg-[#181817]">Video</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-[#9d9b95] hover:text-[#f7f3e8] font-semibold hover:bg-white/[0.04] rounded-xl transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-[rgba(212,175,55,0.15)] transition-all min-h-[44px] active:scale-95"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
