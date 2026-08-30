import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <span className="mb-4 inline-flex rounded-full bg-navy-50 p-4 text-navy-400">
        <Compass className="h-10 w-10" />
      </span>
      <p className="font-display text-3xl font-bold text-navy-900">पन्ना नहीं मिला</p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-[15px] text-slate-600">
        This chapter or page does not exist in the Pragyan (प्रज्ञान) curriculum. Head back to your
        dashboard to keep learning.
      </p>
      <Link
        href="/home"
        className="mt-6 rounded-md bg-navy-800 px-6 py-2.5 font-bold text-white transition hover:bg-navy-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
