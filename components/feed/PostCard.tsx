"use client"

import { useState } from "react"
import { MoreHorizontal, Pin, Heart, MessageSquare, Bookmark, FileText } from "lucide-react"
import CommentSection from "./CommentSection"

export default function PostCard({
  post,
  isTeacher = false,
  onCommentPosted,
}: {
  post: any
  isTeacher?: boolean
  onCommentPosted?: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0)
  const [commentCount, setCommentCount] = useState<number>(post._count?.comments || 0)

  const handleCommentPosted = () => {
    setCommentCount((c: number) => c + 1)
    onCommentPosted?.()
  }

  const toggleLike = async () => {
    // Optimistic update
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? Math.max(0, likeCount - 1) : likeCount + 1)
    
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to toggle like")
    } catch (err) {
      // Revert on error
      setIsLiked(isLiked)
      setLikeCount(likeCount)
    }
  }

  return (
    <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden mb-6 transition-all hover:border-[rgba(212,175,55,0.25)]">
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#181817] overflow-hidden border border-white/10 shrink-0">
            <img
              src={
                post.author.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.author.name)}&backgroundColor=181817,262624,3f3f3e`
              }
              alt={post.author.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#f7f3e8] text-sm sm:text-base">{post.author.name}</span>
              {post.author.role === 'TEACHER' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.3)] tracking-wider">
                  FACULTY
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9d9b95]">
              <span>{new Date(post.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {post.isPinned && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="flex items-center gap-1 text-[#d4af37] font-semibold">
                    <Pin className="w-3 h-3 fill-current" /> Pinned
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isTeacher && (
          <button className="text-[#9d9b95] hover:text-[#f7f3e8] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-4 text-[#f7f3e8]/90 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
        {post.content}
      </div>

      {/* Mock Attachments */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#181817] hover:border-[rgba(212,175,55,0.3)] hover:bg-[#1e1e1d] transition-all cursor-pointer w-fit pr-10 group">
            <div className="w-10 h-10 rounded-lg bg-[rgba(212,175,55,0.12)] text-[#d4af37] border border-[rgba(212,175,55,0.25)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#f7f3e8] group-hover:text-[#d4af37] transition-colors">Course_Resource.pdf</div>
              <div className="text-xs text-[#9d9b95]">Attached Document • 2.4 MB</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Actions */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-[#181817]/40">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLike}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isLiked ? 'text-rose-400 font-semibold' : 'text-[#9d9b95] hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
            <span>{likeCount}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-medium text-[#9d9b95] hover:text-[#d4af37] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount} Comments</span>
          </button>
        </div>
        
        <button className="text-[#9d9b95] hover:text-[#d4af37] transition-colors p-1">
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} onCommentPosted={handleCommentPosted} />}
    </div>
  )
}
