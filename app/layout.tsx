import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { AuthProvider } from "@/context/auth-context";
import { EventsProvider } from "@/context/events-context";
import { ViewProvider } from "@/context/view-context";
import { ThemeProvider } from "@/context/theme-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Herd | Find Your Next Event",
  description: "Manage and join community events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
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
