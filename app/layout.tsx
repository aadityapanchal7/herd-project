// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { cookies } from "next/headers";
import { AuthProvider } from "@/context/auth-context";
import { EventsProvider } from "@/context/events-context";
import { ViewProvider } from "@/context/view-context";
import { ThemeProvider } from "@/context/theme-context";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Herd | Find Your Next Event",
  description: "Manage and join community events",
};

// same util as before
function hexToHslString(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const bigint = parseInt(full, 16);
  let r = ((bigint >> 16) & 255) / 255;
  let g = ((bigint >> 8) & 255) / 255;
  let b = (bigint & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hdeg = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hdeg = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hdeg = (b - r) / d + 2; break;
      case b: hdeg = (r - g) / d + 4; break;
    }
    hdeg *= 60;
  }

  const H = Math.round(hdeg || 0);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ✅ await cookies() in Next 15
  const cookieStore = await cookies();
  const uniCookie = cookieStore.get("uni_color")?.value;
  const decoded = uniCookie ? decodeURIComponent(uniCookie) : null;

  const htmlStyle: React.CSSProperties | undefined = decoded
    ? ({
        ["--primary-color" as any]: decoded,
        ["--primary" as any]: hexToHslString(decoded),
      } as React.CSSProperties)
    : undefined;

  return (
    <html lang="en" className={manrope.className} style={htmlStyle}>
      <body>
        <AuthProvider>
          <EventsProvider>
            <ViewProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </ViewProvider>
          </EventsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
