import { AppearanceControls } from "@/components/appearance-controls";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="min-h-screen">
      <div className="tricolor-strip h-1.5" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
        <AppearanceControls />
      </div>
      {children}
    </main>
  );
}
