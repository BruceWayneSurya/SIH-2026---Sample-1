import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  StickyNote,
  ListChecks,
  PenLine,
  MapPinned,
  BookMarked,
} from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getChapters, subjectName, validClass, validSubject } from "@/lib/curriculum";
import { getChapterList } from "@/lib/queries";
import { IconBox, ProgressBar, SUBJECT_ICONS } from "@/components/ui";
import { SUBJECTS } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

export default async function SubjectIndex({
  params,
}: {
  params: Promise<{ classNo: string; subject: string }>;
}) {
  const { classNo, subject } = await params;
  if (!validClass(classNo) || !validSubject(subject)) notFound();
  const user = await getSessionUser();
  if (!user) redirect("/");

  const cn = Number(classNo);
  const meta = SUBJECTS.find((s) => s.slug === subject)!;
  const Icon = SUBJECT_ICONS[meta.icon];
  const dbList = await getChapterList(cn, subject, user.id);
  const staticRows = getChapters(cn, subject);
  const practiced = dbList.filter((c) => c.bestScore !== null).length;

  // group chapters by book (Social Science / Hindi)
  const groups: { book: string | null; items: { row: (typeof staticRows)[number]; data: (typeof dbList)[number] | undefined }[] }[] = [];
  staticRows.forEach((row, i) => {
    const data = dbList[i];
    const book = row.book ?? null;
    const g = groups.find((x) => (x.book ?? null) === book);
    if (g) g.items.push({ row, data });
    else groups.push({ book, items: [{ row, data }] });
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500" aria-label="Breadcrumb">
        <Link href="/home" className="inline-flex items-center gap-1 hover:text-navy-700 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <span>Class {cn}</span>
        <span aria-hidden="true">/</span>
        <span className="text-navy-800">{subjectName(subject)}</span>
      </nav>

      <header className="vsv-enter flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
        <IconBox icon={Icon} tint={meta.tint} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold uppercase tracking-wider text-saffron-600">
            Class {cn} · Chapter Index
          </p>
          <h1 className="text-2xl font-extrabold text-navy-900">{subjectName(subject)}</h1>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex justify-between text-[13px] font-bold text-navy-600">
            <span>Your progress</span>
            <span>{practiced}/{dbList.length}</span>
          </div>
          <ProgressBar value={practiced} max={dbList.length} />
        </div>
      </header>

      {groups.map((g) => (
        <section key={g.book ?? "main"} className="mt-8">
          {g.book && (
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy-800">
              <BookMarked className="h-5 w-5 text-saffron-600" /> {g.book}
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(({ row, data }) => {
              const href = data
                ? `/class/${cn}/${subject}/${data.slug}`
                : `#`;
              const hasContent = data
                ? data.videoCount > 0 || data.noteCount > 0 || data.mcqCount > 0 || data.subjCount > 0
                : false;
              return (
                <Link
                  key={row.title}
                  href={href}
                  className={`group vsv-enter rounded-lg border bg-white p-4 shadow-sm transition ${
                    data
                      ? "border-line hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
                      : "cursor-default border-dashed border-line opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-800 text-[15px] font-extrabold text-white">
                      {data?.num ?? "—"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold leading-snug text-navy-900 group-hover:underline">
                        {row.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {data && data.videoCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-navy-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-600">
                            <Clapperboard className="h-3 w-3" /> {data.videoCount} video{data.videoCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {data && data.noteCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-navy-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-600">
                            <StickyNote className="h-3 w-3" /> {data.noteCount} notes
                          </span>
                        )}
                        {data && data.mcqCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-saffron-50 px-1.5 py-0.5 text-[11px] font-bold text-saffron-700">
                            <ListChecks className="h-3 w-3" /> {data.mcqCount} MCQs · {data.pyqPct}% PYQ
                          </span>
                        )}
                        {data && data.subjCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-saffron-50 px-1.5 py-0.5 text-[11px] font-bold text-saffron-700">
                            <PenLine className="h-3 w-3" /> {data.subjCount} descriptive
                          </span>
                        )}
                        {!hasContent && (
                          <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                            Content coming soon
                          </span>
                        )}
                      </div>
                      {data && data.bestScore !== null && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-[12px] font-bold text-leaf-700">
                          Best score {data.bestScore}/{data.bestTotal}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 border-t border-dashed border-line pt-2 text-[11px] font-semibold text-slate-400">
                        <MapPinned className="h-3 w-3" />
                        {data?.dikshaCode ?? "DIKSHA mapping pending"}
                      </div>
                    </div>
                    {data && (
                      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
