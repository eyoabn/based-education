"use client"

import { useState, useEffect, useCallback } from "react"
import { Send, Loader2, MessageSquare, Trash2, CheckCircle2 } from "lucide-react"

interface Author {
  name: string
  avatarUrl?: string | null
  role: "STUDENT" | "TEACHER" | "ADMIN"
}

interface CommentItem {
  id: string
  content: string
  createdAt: string
  author: Author
  authorId?: string
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const past = new Date(dateString)
  const diffInSeconds = Math.max(1, Math.floor((now.getTime() - past.getTime()) / 1000))

  if (diffInSeconds < 60) return "Just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  return past.toLocaleDateString()
}

export default function CommentSection({
  postId,
  onCommentPosted,
}: {
  postId: string
  onCommentPosted?: () => void
}) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ name: string; avatarUrl?: string | null } | null>(null)

  // Fetch current user for avatar preview
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setCurrentUser({
            name: data.user.name || "User",
            avatarUrl: data.user.avatarUrl || null,
          })
        }
      })
      .catch(() => {})
  }, [])

  // Fetch real comments for this post
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" })
      if (!res.ok) throw new Error("Could not load comments")
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || "Failed to load comments")
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newComment.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to post comment")
      }

      const createdComment: CommentItem = await res.json()
      setComments(prev => [...prev, createdComment])
      setNewComment("")
      onCommentPosted?.()
    } catch (err: any) {
      setError(err?.message || "Error posting comment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const userAvatar = currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.name || "User")}`

  return (
    <div className="bg-slate-50/80 border-t border-slate-100 p-4 sm:p-5">
      {/* Comments List */}
      <div className="space-y-3 mb-4 max-h-[320px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading discussion…</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
            <p className="font-medium text-slate-500">No comments yet</p>
            <p className="text-[11px] mt-0.5">Start the conversation below.</p>
          </div>
        ) : (
          comments.map(comment => {
            const isTeacher = comment.author.role === "TEACHER"
            const isAdmin = comment.author.role === "ADMIN"
            const authorSeed = comment.author.name || "User"
            const avatar = comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorSeed)}`

            return (
              <div key={comment.id} className="flex gap-2.5 sm:gap-3 group">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden border border-slate-200/80">
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div
                  className={`flex-1 rounded-2xl px-3.5 py-2.5 text-sm transition-shadow ${
                    isTeacher
                      ? "bg-indigo-50/70 border border-indigo-100/90 text-slate-800"
                      : isAdmin
                      ? "bg-amber-50/70 border border-amber-100 text-slate-800"
                      : "bg-white border border-slate-200 text-slate-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {comment.author.name}
                    </span>
                    {isTeacher && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 tracking-wide">
                        TEACHER
                      </span>
                    )}
                    {isAdmin && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 tracking-wide">
                        ADMIN
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 ml-auto tabular-nums">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden border border-slate-200 hidden sm:block">
          <img src={userAvatar} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            disabled={isSubmitting}
            placeholder="Write a comment..."
            className="w-full bg-white border border-slate-200 rounded-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-11 transition-all"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            aria-label="Send comment"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-full transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
