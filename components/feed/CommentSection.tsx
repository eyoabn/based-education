"use client"

import { useState, useEffect } from "react"
import { Send } from "lucide-react"

export default function CommentSection({
  postId,
  onCommentPosted,
}: {
  postId: string
  onCommentPosted?: () => void
}) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Mock initial fetch
  useEffect(() => {
    // In real app, fetch from `/api/posts/${postId}/comments`
    setComments([
      {
        id: "1",
        content: "Will this be covered in the midterm?",
        createdAt: new Date().toISOString(),
        author: { name: "Sarah Connor", role: "STUDENT" }
      },
      {
        id: "2",
        content: "Yes, please review chapter 4.",
        createdAt: new Date().toISOString(),
        author: { name: "Dr. Alex Morgan", role: "TEACHER" }
      }
    ])
  }, [postId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    setIsLoading(true)
    setTimeout(() => {
      setComments([...comments, {
        id: Date.now().toString(),
        content: newComment,
        createdAt: new Date().toISOString(),
        author: { name: "Jane Student", role: "STUDENT" }
      }])
      setNewComment("")
      setIsLoading(false)
      onCommentPosted?.()
    }, 500)
  }

  return (
    <div className="bg-slate-50 border-t border-slate-100 p-4">
      {/* Comments List */}
      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.name}`} alt="" />
            </div>
            <div className={`flex-1 rounded-xl p-3 text-sm ${comment.author.role === 'TEACHER' ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-800">{comment.author.name}</span>
                {comment.author.role === 'TEACHER' && (
                  <span className="text-[9px] font-bold px-1.5 rounded bg-indigo-100 text-indigo-700">TEACHER</span>
                )}
                <span className="text-xs text-slate-400 ml-auto">Just now</span>
              </div>
              <p className="text-slate-700">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Jane`} alt="" />
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-white border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
