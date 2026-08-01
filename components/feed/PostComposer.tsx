"use client"

import { useState } from "react"
import { Image as ImageIcon, Link as LinkIcon, Paperclip, Pin, Send, Bold, Italic, List, Code } from "lucide-react"

export default function PostComposer() {
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [targetClass, setTargetClass] = useState("all")

  const handlePublish = async () => {
    if (!content.trim()) return
    setIsPublishing(true)
    
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, isPinned, targetClass })
      })
      setContent("")
      setIsPinned(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Target Selector Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <select 
          value={targetClass}
          onChange={(e) => setTargetClass(e.target.value)}
          className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="all">All Enrolled Students</option>
          <option value="math101">Mathematics 101</option>
          <option value="physics_adv">Physics Advanced</option>
        </select>
        
        <button 
          onClick={() => setIsPinned(!isPinned)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors ${
            isPinned ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          {isPinned ? 'Pinned' : 'Pin Post'}
        </button>
      </div>

      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an announcement, resource, or update..."
          className="w-full min-h-[100px] resize-none border-none focus:ring-0 p-0 text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Formatting & Attachments Toolbar */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-1 text-slate-400">
          <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" title="Code Block"><Code className="w-4 h-4" /></button>
          
          <div className="w-px h-4 bg-slate-300 mx-2" />
          
          <button className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors" title="Attach Image"><ImageIcon className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors" title="Attach File"><Paperclip className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors" title="Add Link"><LinkIcon className="w-4 h-4" /></button>
        </div>

        <button 
          onClick={handlePublish}
          disabled={!content.trim() || isPublishing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPublishing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Publish Announcement
        </button>
      </div>
    </div>
  )
}
