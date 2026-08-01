import { type ReactNode } from "react"
import "../src/index.css" // Import the existing tailwind styles if any

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
