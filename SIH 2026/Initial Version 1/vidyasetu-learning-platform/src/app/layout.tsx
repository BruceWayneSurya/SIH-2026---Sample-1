import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mukta, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/footer";

const mukta = Mukta({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mukta",
});

const deva = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["500", "600", "700"],
  variable: "--font-deva",
});

export const metadata: Metadata = {
  title: "VidyaSetu — Open Digital Learning & Assessment Portal",
  description:
    "NCERT-aligned learning portal for Class 7 & 8: verified lectures, peer-reviewed notes, PYQ assessments and gamified leaderboards. SIH Edition.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
