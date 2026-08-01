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
        <h1 className="mb-1 text-2xl font-bold text-slate-900">My Feed</h1>
        <p className="text-slate-500">
          Latest announcements and discussions from your enrolled classes.
        </p>
      </div>

      {/* Realtime pill — sticky so it stays reachable while scrolled. */}
      {pendingCount > 0 && (
        <div className="sticky top-0 z-20 mb-4 flex justify-center">
          <button
            onClick={revealPending}
            className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-500"
          >
            <Sparkles className="h-4 w-4" />
            {pendingCount} new {pendingCount === 1 ? "announcement" : "announcements"}
          </button>
        </div>
      )}

      {loading && <PostFeedSkeleton count={3} />}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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
