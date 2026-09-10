import { TranslatedText as T } from "@/components/language-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { FloatingAiTutor } from "@/components/ai-tutor";
import { ServiceWorkerRegistrar } from "@/components/service-worker";

// Fonts are self-hosted via @fontsource CSS with correct Unicode ranges.
// This keeps Devanagari visible without any build-time Google Fonts request.
export const metadata: Metadata = {
  title:
    "Pragyan (प्रज्ञान) — National Digital Learning Portal | Ministry of Education",
  description:
    "NCERT-aligned learning and assessment portal for Class 6 to 10: verified faculty lectures, moderated community notes, PYQ assessments, leaderboards and an AI tutor. Department of School Education & Literacy, Government of India.",
  manifest: "/manifest.webmanifest",
  applicationName: "Pragyan",
  appleWebApp: { title: "Pragyan", capable: true, statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#133b5c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vs_theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.saver=localStorage.getItem('vs_saver')==='1'?'1':'0'}catch(e){}})()`,
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
          <ServiceWorkerRegistrar />
        </LanguageProvider>
      </body>
    </html>
  );
}
