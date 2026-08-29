import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getSessionUser } from "@/lib/session";

export default async function Root({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (error === "guest") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="mb-4 inline-flex rounded-full bg-rose-50 p-3 text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-extrabold text-navy-900">Could not start a session</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Guest access could not be completed. Please try again in a moment.
        </p>
        <a
          href="/api/auth/guest?role=student"
          className="mt-6 rounded-md bg-navy-800 px-6 py-2.5 font-bold text-white transition hover:bg-navy-700"
        >
          Retry
        </a>
      </div>
    );
  }

  const user = await getSessionUser();
  if (user) redirect("/home");
  redirect("/api/auth/guest?role=student");
}
