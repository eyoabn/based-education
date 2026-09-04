import { type ReactNode } from "react"
import MaintenanceGate from "@/components/admin/MaintenanceGate"
import StudentLayoutClient from "@/components/layout/StudentLayoutClient"

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGate>
      <StudentLayoutClient>{children}</StudentLayoutClient>
    </MaintenanceGate>
  )
}
