"use client"

import { use } from "react"
import ChatWindow from "@/components/chat/ChatWindow"

export default function StudentMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ courseId?: string }>
}) {
  const resolvedParams = searchParams ? use(searchParams) : undefined
  const initialCourseId = resolvedParams?.courseId

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages &amp; Discussions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Communicate with your course instructors and collaborate with your peers outside live sessions.
        </p>
      </div>

      <ChatWindow initialCourseId={initialCourseId} />
    </div>
  )
}
