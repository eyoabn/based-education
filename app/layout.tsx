import { type ReactNode } from "react"
import ToastProvider from "@/components/ui/ToastProvider"
import "./globals.css"

export const metadata = {
  title: "Educonnect",
  description: "The Next-Gen Unlimited Live Learning Platform",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* Phase 7: single feedback surface for every module. */}
        <ToastProvider />
      </body>
    </html>
  )
}
