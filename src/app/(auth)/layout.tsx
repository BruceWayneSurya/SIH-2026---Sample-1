import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main id="main" className="min-h-screen"><div className="tricolor-strip h-1.5" aria-hidden="true" />{children}</main>;
}
