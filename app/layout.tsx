import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { OfflineFallback } from "@/components/offline-fallback"
import { FirebaseStatus } from "@/components/firebase-status"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "AqwaCloud - Cloud File Transfer Platform",
  description:
    "Transfer files directly between cloud services like Google Drive, OneDrive, and Dropbox. Completely free with bank-grade security.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <OfflineFallback />
          <FirebaseStatus />
        </AuthProvider>
      </body>
    </html>
  )
}
