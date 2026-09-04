import { type ReactNode } from "react"
import MaintenanceGate from "@/components/admin/MaintenanceGate"
import TeacherLayoutClient from "@/components/layout/TeacherLayoutClient"

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGate>
      <TeacherLayoutClient>{children}</TeacherLayoutClient>
    </MaintenanceGate>
  )
}
