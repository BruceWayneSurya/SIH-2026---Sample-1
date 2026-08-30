import { Loader2 } from "lucide-react";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-24 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      <p className="mt-3 text-sm font-bold text-navy-600">{label}</p>
    </div>
  );
}

export function PageError({
  message = "Could not load the portal. Is the backend API running?",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-extrabold text-navy-900">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-slate-600">{message}</p>
    </div>
  );
}
