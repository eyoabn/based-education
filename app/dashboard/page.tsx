import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"

export default async function DashboardRootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  if (!token) {
    redirect("/login")
  }

  const session = await verifyToken(token)
  if (!session) {
    redirect("/login")
  }

  switch (session.role) {
    case "TEACHER":
      if (session.teacherStatus === "PENDING") {
        redirect("/pending-approval")
      }
      redirect("/dashboard/teacher")
    case "ADMIN":
      redirect("/dashboard/admin")
    case "STUDENT":
    default:
      redirect("/dashboard/student")
  }
}
