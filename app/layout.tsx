import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider as NextThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { EventsProvider } from "@/context/events-context"
import { ViewProvider } from "@/context/view-context"
import { ThemeProvider } from "@/context/theme-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Herd - Campus Events",
  description: "Find and join events happening around your campus",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light" data-theme="light">  
      <body className={inter.className}>
        <NextThemeProvider defaultTheme="light" enableSystem={false} disableTransitionOnChange attribute='class' >
          <AuthProvider>
            <ThemeProvider>
              <EventsProvider>
                <ViewProvider>
                  {children}
                  <Toaster />
                </ViewProvider>
              </EventsProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextThemeProvider>
      </body>
    </html>
  )
}
