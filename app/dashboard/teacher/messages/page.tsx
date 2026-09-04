"use client"

import { use } from "react"
import ChatWindow from "@/components/chat/ChatWindow"

export default function TeacherMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ courseId?: string }>
}) {
  const resolvedParams = searchParams ? use(searchParams) : undefined
  const initialCourseId = resolvedParams?.courseId

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Message Center</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Connect directly with enrolled students and manage ongoing course discussion channels outside live sessions.
        </p>
      </div>

      <ChatWindow initialCourseId={initialCourseId} />
    </div>
  )
}
