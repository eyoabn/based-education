"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, RotateCw } from "lucide-react"
import PostComposer, { type PublishedPost } from "@/components/feed/PostComposer"
import PostCard from "@/components/feed/PostCard"
import { EmptyFeed } from "@/components/ui/EmptyState"
import { PostFeedSkeleton } from "@/components/ui/SkeletonLoaders"
import { triggers } from "@/lib/e2e-triggers"

/**
 * Phase 7 — the publishing end of the announcement workflow.
 *
 * The composer prepends optimistically the instant the API confirms the write,
 * so the teacher sees their own post land before the notification fan-out has
 * even finished. The toast that follows tells them how many students it
 * reached.
 */
export default function TeacherFeedPage() {
  const [posts, setPosts] = useState<PublishedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/posts", { cache: "no-store" })
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error ?? "Could not load your post stream.")
        return
      }

      setPosts(Array.isArray(payload) ? payload : [])
      setError(null)
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const focusComposer = () => {
    composerRef.current?.querySelector("textarea")?.focus()
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-semibold tracking-wider uppercase mb-3">
          Faculty Dispatch Desk
        </div>
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#f7f3e8]">Post Stream</h1>
        <p className="text-sm sm:text-base text-[#9d9b95]">Publish announcements, broadcast resources, and interact with your students.</p>
      </div>

      <div ref={composerRef}>
        <PostComposer onPublished={post => setPosts(prev => [post, ...prev])} />
      </div>

      {loading && <PostFeedSkeleton count={2} />}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-rose-400" />
          <p className="text-sm font-semibold text-rose-300">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs sm:text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/30"
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <EmptyFeed canPost onCompose={focusComposer} size="lg" />
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isTeacher
              onCommentPosted={() => triggers.feed.commentPosted(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
