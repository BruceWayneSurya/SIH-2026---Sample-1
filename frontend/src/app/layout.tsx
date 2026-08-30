import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/footer";

/**
 * Self-hosted fonts (via @fontsource) instead of next/font/google: the portal
 * must build and run on restricted/low-bandwidth networks where Google Fonts
 * is unreachable, and next/font/google hard-fails `next build` there.
 */
const mukta = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-devanagari-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-devanagari-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-devanagari-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-latin-700-normal.woff2",
      weight: "700",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-devanagari-700-normal.woff2",
      weight: "700",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-latin-800-normal.woff2",
      weight: "800",
    },
    {
      path: "../../node_modules/@fontsource/mukta/files/mukta-devanagari-800-normal.woff2",
      weight: "800",
    },
  ],
  variable: "--font-mukta",
});

const deva = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-700-normal.woff2",
      weight: "700",
    },
    {
      path: "../../node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-latin-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-deva",
});

export const metadata: Metadata = {
  title: "Pragyan (प्रज्ञान) — Open Digital Learning & Assessment Portal",
  description:
    "NCERT-aligned learning portal for Class 7 & 8: verified lectures, peer-reviewed notes, PYQ assessments and gamified leaderboards. Smart India Hackathon (SIH 2026).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vs_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark')}else{document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${mukta.variable} ${deva.variable} font-sans antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-saffron-500 focus:px-4 focus:py-2 focus:font-bold focus:text-navy-950"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="min-h-[calc(100vh-8rem)]">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
