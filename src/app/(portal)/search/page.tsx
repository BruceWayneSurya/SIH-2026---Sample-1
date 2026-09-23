import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Search, SearchX } from "lucide-react";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { asc, like } from "drizzle-orm";
import { Breadcrumbs, EmptyState, SectionHeading } from "@/components/ui";
import { CLASSES, SUBJECTS } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

/**
 * Full-text chapter search across every class and subject. Reached from the
 * header search palette (free-text queries) or directly at /search.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);
  const needle = `%${query.replace(/[%_]/g, "")}%`;

  let results: Array<{
    id: number;
    classNo: number;
    subjectSlug: string;
    subjectName: string;
    num: number;
    title: string;
    slug: string;
  }> = [];

  if (query.length > 0) {
    results = await db
      .select({
        id: chapters.id,
        classNo: chapters.classNo,
        subjectSlug: chapters.subjectSlug,
        subjectName: chapters.subjectName,
        num: chapters.num,
        title: chapters.title,
        slug: chapters.slug,
      })
      .from(chapters)
      .where(like(chapters.title, needle))
      .orderBy(asc(chapters.classNo), asc(chapters.subjectSlug), asc(chapters.num))
      .limit(40);
  }

  const grouped = new Map<string, typeof results>();
  for (const row of results) {
    const key = `Class ${row.classNo} · ${row.subjectName}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/home", label: <T>Home</T> },
          { label: "Search" },
        ]}
      />
      <SectionHeading
        eyebrow="Find any chapter"
        title="Chapter search"
        sub="Search the NCERT-aligned chapter index across every class and subject on the portal."
      />

      <form action="/search" method="get" className="mt-6 flex max-w-xl gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search chapters
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="e.g. cell, fractions, nationalism…"
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-[15px] font-semibold text-navy-900 outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/30"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0 px-4 py-2.5 text-sm">
          <T>Search</T>
        </button>
      </form>

      {query.length === 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSES.map((c) => (
            <Link
              key={c}
              href={`/class/${c}`}
              className="card card-hover flex items-center justify-between p-5"
            >
              <span>
                <span className="block text-lg font-extrabold text-navy-900">
                  <T values={{ classNo: c }}>{"Class {classNo}"}</T>
                </span>
                <span className="mt-0.5 block text-sm text-slate-600">
                  <T>Browse subjects and chapters</T>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 text-saffron-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={SearchX}
            title="No chapters found"
            text="Try a shorter keyword — chapter titles are searched word by word. You can also browse by class below."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <span
                key={s.slug}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-navy-700"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <p className="text-sm font-semibold text-slate-600">
            <T values={{ count: results.length }}>
              {results.length === 1
                ? "{count} chapter found"
                : "{count} chapters found"}
            </T>
          </p>
          {[...grouped.entries()].map(([group, rows]) => (
            <section key={group}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-saffron-700">
                {group}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/class/${row.classNo}/${row.subjectSlug}/${row.slug}`}
                    className="card card-hover flex items-start gap-3 p-4"
                  >
                    <BookOpenCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-navy-600"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block font-bold text-navy-900">
                        Ch {row.num}: {row.title}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                        <T>Open chapter</T>
                      </span>
                    </span>
                    <ArrowRight
                      className="ml-auto mt-1 h-4 w-4 shrink-0 text-saffron-600"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
