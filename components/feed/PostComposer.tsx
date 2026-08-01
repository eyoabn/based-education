"use client"

import { useState } from "react"
import {
  AlertCircle,
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  Paperclip,
  Pin,
  Send,
} from "lucide-react"
import { triggers } from "@/lib/e2e-triggers"

export interface PublishedPost {
  id: string
  content: string
  mediaUrls: string[]
  createdAt: string
  isPinned?: boolean
  author: { name: string; avatarUrl: string | null; role: string }
  _count?: { comments: number }
}

/**
 * Phase 7 — step one of the announcement workflow.
 *
 * Publish → `POST /api/posts` → the route writes a `Notification` per student
 * and pushes it down SSE → every online student's bell toasts and their feed
 * prepends the post. This component owns the first link in that chain and the
 * teacher's own confirmation; `triggers.feed.published` handles both the toast
 * copy and the cross-tab broadcast.
 */
export default function PostComposer({
  onPublished,
}: {
  /** Lets the parent feed prepend the new post without a refetch. */
  onPublished?: (post: PublishedPost) => void
}) {
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [targetClass, setTargetClass] = useState("all")
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    const body = content.trim()
    if (!body || isPublishing) return

    setIsPublishing(true)
    setError(null)

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: body, isPinned, targetClass }),
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        const message = payload.error ?? "The server rejected this announcement."
        setError(message)
        triggers.feed.publishFailed(message)
        return
      }

      const post: PublishedPost = { ...payload.post, isPinned }

      // Clear only after a confirmed write — a failed publish must not eat the draft.
      setContent("")
      setIsPinned(false)

      onPublished?.(post)
      triggers.feed.published(post.id, post.author.name, post.content, payload.notifiedCount)
    } catch {
      const message = "Network error — your draft is still here. Try again."
      setError(message)
      triggers.feed.publishFailed(message)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Target Selector Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <select
          value={targetClass}
          onChange={e => setTargetClass(e.target.value)}
          aria-label="Announcement audience"
          className="cursor-pointer bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
        >
          <option value="all">All Enrolled Students</option>
          <option value="math101">Mathematics 101</option>
          <option value="physics_adv">Physics Advanced</option>
        </select>

        <button
          onClick={() => setIsPinned(!isPinned)}
          aria-pressed={isPinned}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors ${
            isPinned ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
          {isPinned ? "Pinned" : "Pin Post"}
        </button>
      </div>

      <div className="p-4">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            // Cmd/Ctrl+Enter publishes — the shortcut teachers expect from
            // every other composer they use.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              void handlePublish()
            }
          }}
          placeholder="Share an announcement, resource, or update..."
          className="min-h-[100px] w-full resize-none border-none p-0 text-slate-800 placeholder-slate-400 focus:ring-0"
        />
      </div>

      {error && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Formatting & Attachments Toolbar */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-1 text-slate-400">
          <button className="rounded p-1.5 transition-colors hover:bg-slate-200" title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button className="rounded p-1.5 transition-colors hover:bg-slate-200" title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1.5 transition-colors hover:bg-slate-200"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1.5 transition-colors hover:bg-slate-200"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="mx-2 h-4 w-px bg-slate-300" />

          <button
            className="rounded p-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Attach Image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Attach File"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">⌘↵</span>
          <button
            onClick={handlePublish}
            disabled={!content.trim() || isPublishing}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
          >
            {isPublishing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isPublishing ? "Publishing..." : "Publish Announcement"}
          </button>
        </div>
      </div>
    </div>
  )
}
