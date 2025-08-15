import type React from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

import { AuthProvider } from "@/context/auth-context";
import { EventsProvider } from "@/context/events-context";
import { ViewProvider } from "@/context/view-context";
import { ThemeProvider } from "@/context/theme-context";

const manrope = Manrope({ subsets: ["latin"] });

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
  <html lang="en" className={manrope.className}>
      <body>
        {/* Inline hydration script: read persisted university color cookie and set CSS var before React mounts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `;(function(){try{var m=document.cookie.match('(?:^|; )uni_color=([^;]*)'); if(m && m[1]){document.documentElement.style.setProperty('--primary-color', decodeURIComponent(m[1])); var hex = decodeURIComponent(m[1]); function hexToHsl(hex){var h=hex.replace('#',''); var bigint=parseInt(h.length===3? h.split('').map(c=>c+c).join('') : h,16); var r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255; r/=255; g/=255; b/=255; var max=Math.max(r,g,b), min=Math.min(r,g,b); var hdeg=0, s=0, l=(max+min)/2; if(max!==min){var d=max-min; s=l>0.5? d/(2-max-min) : d/(max+min); switch(max){case r: hdeg=(g-b)/d + (g<b?6:0); break; case g: hdeg=(b-r)/d + 2; break; case b: hdeg=(r-g)/d + 4; break;} hdeg = Math.round(hdeg*60);} var H = Math.round(hdeg||0); var S = Math.round(s*100); var L = Math.round(l*100); return H + ' ' + S + '% ' + L + '%'; } document.documentElement.style.setProperty('--primary', hexToHsl(hex)); } }catch(e){} })();`,
          }}
        />
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
