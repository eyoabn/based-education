"use client"

import { useState } from "react"
import { MoreHorizontal, Pin, Heart, MessageSquare, Bookmark, FileText } from "lucide-react"
import CommentSection from "./CommentSection"

export default function PostCard({ post, isTeacher = false }: { post: any, isTeacher?: boolean }) {
  const [showComments, setShowComments] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <img src={post.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.name}`} alt={post.author.name} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{post.author.name}</span>
              {post.author.role === 'TEACHER' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">TEACHER</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{new Date(post.createdAt || Date.now()).toLocaleDateString()}</span>
              {post.isPinned && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isTeacher && (
          <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-4 text-slate-800 whitespace-pre-wrap">
        {post.content}
      </div>

      {/* Mock Attachments */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer w-fit pr-12">
            <div className="w-10 h-10 rounded bg-red-100 text-red-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">Syllabus_Update.pdf</div>
              <div className="text-xs text-slate-500">PDF Document • 2.4 MB</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Actions */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isLiked ? 'text-red-500' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>24</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post._count?.comments || 0} Comments</span>
          </button>
        </div>
        
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} />}
    </div>
  )
}
