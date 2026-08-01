"use client"

import { useState, useEffect } from "react"
import PostComposer from "@/components/feed/PostComposer"
import PostCard from "@/components/feed/PostCard"

export default function TeacherFeedPage() {
  const [posts, setPosts] = useState<any[]>([])
  
  // Mock fetching posts
  useEffect(() => {
    // In a real app, this would be: await fetch('/api/posts')
    setPosts([
      {
        id: "post1",
        author: { name: "Dr. Alex Morgan", role: "TEACHER", avatarUrl: "" },
        content: "Welcome to the new semester! Please review the updated syllabus attached below before our first live class tomorrow.",
        mediaUrls: ["syllabus.pdf"],
        createdAt: new Date().toISOString(),
        isPinned: true,
        _count: { comments: 2 }
      },
      {
        id: "post2",
        author: { name: "Dr. Alex Morgan", role: "TEACHER", avatarUrl: "" },
        content: "I have extended the deadline for the Physics Lab Report to this Friday at 11:59 PM. Please make sure to submit on time.",
        mediaUrls: [],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPinned: false,
        _count: { comments: 14 }
      }
    ])
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Post Stream</h1>
        <p className="text-slate-500">Publish announcements and interact with your students.</p>
      </div>

      <PostComposer />

      <div className="space-y-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} isTeacher={true} />
        ))}
      </div>
    </div>
  )
}
