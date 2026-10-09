"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, RotateCw, Sparkles } from "lucide-react"
import PostCard from "@/components/feed/PostCard"
import { EmptyFeed } from "@/components/ui/EmptyState"
import { PostFeedSkeleton } from "@/components/ui/SkeletonLoaders"
import { triggers, useEduEvent } from "@/lib/e2e-triggers"
import type { PublishedPost } from "@/components/feed/PostComposer"

/**
 * Phase 7 — the receiving end of the announcement workflow.
 *
 * A teacher publishes → the API fans out notifications over SSE → the
 * notification bell toasts and republishes on the client event bus → this page
 * hears it and slides the announcement in at the top. No polling, no refresh,
 * and it works across tabs.
 *
 * New posts stage behind a "N new" pill rather than being injected directly:
 * yanking the list out from under someone mid-read is the classic realtime-feed
 * mistake. The student decides when the feed moves.
 */
export default function StudentFeedPage() {
  const [posts, setPosts] = useState<PublishedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const load = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true)

    try {
      const res = await fetch("/api/posts", { cache: "no-store" })
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error ?? "Could not load your feed.")
        return
      }

      setPosts(Array.isArray(payload) ? payload : [])
      setError(null)
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      if (showSkeleton) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Same-tab and cross-tab: a teacher published while this page was open.
  useEduEvent("post:published", () => setPendingCount(n => n + 1))

  // The SSE path: the server pushed a NEW_POST alert to this student. Both
  // routes converge on the same counter, and the reveal refetches once — so a
  // duplicate signal costs at most an inflated badge, never a duplicated card.
  useEduEvent("notification:received", notification => {
    if (notification.type === "NEW_POST") setPendingCount(n => n + 1)
  })

  const revealPending = () => {
    setPendingCount(0)
    // Quiet refetch — no skeleton, because what is on screen is still valid.
    void load(false)
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-semibold tracking-wider uppercase mb-3">
          Campus Dispatch
        </div>
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#f7f3e8]">My Feed</h1>
        <p className="text-sm sm:text-base text-[#9d9b95]">
          Latest announcements, academic dispatches, and cohort discussions.
        </p>
      </div>

      {/* Realtime pill — sticky so it stays reachable while scrolled. */}
      {pendingCount > 0 && (
        <div className="sticky top-4 z-20 mb-6 flex justify-center">
          <button
            onClick={revealPending}
            className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] to-[#e6ca65] px-5 py-2 text-xs sm:text-sm font-bold text-[#050505] shadow-xl shadow-[rgba(212,175,55,0.35)] transition-all hover:brightness-110 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            {pendingCount} new {pendingCount === 1 ? "announcement" : "announcements"}
          </button>
        </div>
      )}

      {loading && <PostFeedSkeleton count={3} />}

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

      {!loading && !error && posts.length === 0 && <EmptyFeed size="lg" />}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isTeacher={false}
              onCommentPosted={() => triggers.feed.commentPosted(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
