import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { FloatingAiTutor } from "@/components/ai-tutor";

// Fonts are self-hosted via @fontsource CSS with correct Unicode ranges.
// This keeps Devanagari visible without any build-time Google Fonts request.
export const metadata: Metadata = {
  title: "Pragyan (प्रज्ञान) — Open Digital Learning & Assessment Portal",
  description:
    "NCERT-aligned learning portal for Class 7 & 8: verified lectures, peer-reviewed notes, PYQ assessments gamified leaderboards and an AI tutor. Smart India Hackathon 2026 · Team PRAGYAN.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('vs_theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.saver=localStorage.getItem('vs_saver')==='1'?'1':'0'}catch(e){}})()` }} />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-saffron-500 focus:px-4 focus:py-2 focus:font-bold focus:text-navy-950"
        >
          Skip to main content
        </a>
        {children}
        <FloatingAiTutor />
      </body>
    </html>
  );
}
