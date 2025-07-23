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

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Herd Project",
  description: "Manage and join community events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <EventsProvider>
            <ViewProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </ViewProvider>
          </EventsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}