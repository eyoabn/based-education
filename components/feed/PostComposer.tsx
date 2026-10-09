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
    <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111110] shadow-xl shadow-black/40">
      {/* Target Selector Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#181817]/60 px-4 py-3">
        <select
          value={targetClass}
          onChange={e => setTargetClass(e.target.value)}
          aria-label="Announcement audience"
          className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#141413] px-3 py-1.5 text-xs font-semibold text-[#f7f3e8] focus:border-[rgba(212,175,55,0.4)] focus:outline-none"
        >
          <option value="all" className="bg-[#181817] text-[#f7f3e8]">All Enrolled Students</option>
          <option value="math101" className="bg-[#181817] text-[#f7f3e8]">Mathematics 101</option>
          <option value="physics_adv" className="bg-[#181817] text-[#f7f3e8]">Physics Advanced</option>
        </select>

        <button
          onClick={() => setIsPinned(!isPinned)}
          aria-pressed={isPinned}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            isPinned
              ? "border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.18)] text-[#d4af37]"
              : "text-[#9d9b95] hover:bg-white/[0.06] hover:text-[#f7f3e8]"
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
          placeholder="Share an announcement, resource, or assignment update with your cohort..."
          className="min-h-[110px] w-full resize-none border-none bg-transparent p-0 text-sm text-[#f7f3e8] placeholder:text-[#9d9b95]/50 focus:ring-0"
        />
      </div>

      {error && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Formatting & Attachments Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-[#181817]/40 px-4 py-3">
        <div className="flex items-center gap-1 text-[#9d9b95]">
          <button className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]" title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]" title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="mx-2 h-4 w-px bg-white/[0.08]" />

          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]"
            title="Attach Image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]"
            title="Attach File"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] hover:text-[#d4af37]"
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-medium text-[#9d9b95]/60 sm:inline">⌘↵</span>
          <button
            onClick={handlePublish}
            disabled={!content.trim() || isPublishing}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6ca65] px-4 py-2 text-xs sm:text-sm font-semibold text-[#050505] shadow-lg shadow-[rgba(212,175,55,0.2)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
          >
            {isPublishing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
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
