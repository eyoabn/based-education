import { type ReactNode } from "react"
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
      </body>
    </html>
  )
}
