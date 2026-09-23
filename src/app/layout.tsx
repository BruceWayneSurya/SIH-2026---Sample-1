import { TranslatedText as T } from "@/components/language-provider";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { FloatingAiTutor } from "@/components/ai-tutor";

// Fonts are self-hosted via @fontsource CSS with correct Unicode ranges.
// This keeps Devanagari visible without any build-time Google Fonts request.
export const metadata: Metadata = {
  title:
    "Pragyan (प्रज्ञान) — National Digital Learning Portal | Ministry of Education",
  description:
    "NCERT-aligned learning and assessment portal for Class 6 to 10: verified faculty lectures, moderated community notes, PYQ assessments, learning analytics, leaderboards and an AI tutor. Department of School Education & Literacy, Government of India.",
  applicationName: "Pragyan Learning Portal",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Pragyan (प्रज्ञान) — National Digital Learning Portal",
    description:
      "NCERT-aligned learning, PYQ assessments, learning analytics and an AI tutor for Class 6 to 10 — in six Indian languages.",
    url: "/",
    siteName: "Pragyan Learning Portal",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pragyan — National Digital Learning Portal, Ministry of Education, Government of India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pragyan (प्रज्ञान) — National Digital Learning Portal",
    description:
      "NCERT-aligned learning, assessments, analytics and an AI tutor for Class 6 to 10.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c2a43" },
    { media: "(prefers-color-scheme: dark)", color: "#081f33" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Applies the saved appearance settings before first paint so the
            // portal never flashes the wrong theme, text size or contrast.
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('vs_theme');var dark=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light';d.classList.toggle('dark',dark);d.dataset.saver=localStorage.getItem('vs_saver')==='1'?'1':'0';var fs=localStorage.getItem('vs_fontscale');if(fs==='1'||fs==='2'){d.dataset.fontscale=fs}if(localStorage.getItem('vs_contrast')==='high'){d.dataset.contrast='high'}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-saffron-500 focus:px-4 focus:py-2 focus:font-bold focus:text-navy-950"
          >
            <T>Skip to main content</T>
          </a>
          {children}
          <FloatingAiTutor />
        </LanguageProvider>
      </body>
    </html>
  );
}
