import Link from "next/link";
import { Database, ArrowRight } from "lucide-react";

export function DatabaseSetup() {
  return (
    <section className="mx-auto my-12 max-w-2xl rounded-xl border border-saffron-200 bg-white p-6 shadow-sm sm:p-10" aria-labelledby="database-title">
      <Database className="mb-4 h-9 w-9 text-saffron-600" />
      <h1 id="database-title" className="text-2xl font-extrabold text-navy-900">Database setup required</h1>
      <p className="mt-3 text-slate-600">Pragyan is running, but the learning database is not available yet. No accounts, notes, or scores have been saved to temporary storage.</p>
      <ol className="my-5 list-decimal space-y-3 pl-5 text-sm text-navy-800">
        <li>For Vercel, create a hosted SQLite/Turso database and set <code>DATABASE_URL</code> and <code>DATABASE_AUTH_TOKEN</code> in the project’s Environment Variables.</li>
        <li>Set a strong <code>SESSION_SECRET</code>. Keep tokens and keys only in server environment settings.</li>
        <li>Redeploy the correct Git branch. Schema and demo data are initialized safely on the first database request.</li>
      </ol>
      <p className="text-sm text-slate-500">Running locally? A blank DATABASE_URL uses data/app.db. Check that its directory is writable, or run npm run db:setup. Existing data is never reset by setup.</p>
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold">
        <Link href="/home" className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-white">Try dashboard again <ArrowRight className="h-4 w-4" /></Link>
        <a href="/api/health" className="self-center text-navy-700 underline underline-offset-4">Check database connection</a>
        <Link href="/" className="self-center text-navy-700 underline underline-offset-4">Back to welcome page</Link>
      </div>
    </section>
  );
}
