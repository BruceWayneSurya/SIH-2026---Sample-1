import type { ReactNode } from "react";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/footer";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <><SiteHeader /><main id="main" className="min-h-[calc(100vh-8rem)]">{children}</main><SiteFooter /></>;
}
