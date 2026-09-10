import { TranslatedText as T } from "@/components/language-provider";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { HardDriveDownload, PlaneTakeoff, RefreshCw, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { getActiveUser } from "@/lib/session";
import { OfflineManager } from "@/components/offline-manager";
import { DatabaseSetup } from "@/components/database-setup";
import { subjectName } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

/**
 * The offline control room: pick a chapter, download it, then prove it works by
 * putting the device in airplane mode and studying from the downloaded app.
 */
export default async function OfflinePage() {
  const user = await getActiveUser();
  if (!user) return <DatabaseSetup />;

  const classNo = user.className ?? 8;
  const rows = await db
    .select({
      id: chapters.id,
      num: chapters.num,
      title: chapters.title,
      slug: chapters.slug,
      subjectSlug: chapters.subjectSlug,
      subjectName: chapters.subjectName,
    })
    .from(chapters)
    .where(and(eq(chapters.classNo, classNo), eq(chapters.subjectSlug, "science")))
    .orderBy(asc(chapters.num));

  const candidates = rows.slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-saffron-600">
          <HardDriveDownload className="h-4 w-4" /> Offline-first
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          <T>Download a chapter, then switch the network off</T>
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate-600">
          <T>
            Classrooms and homes lose connectivity; a learning portal that only works online is a
            portal that stops at the school gate. A pack carries the notes, the NCERT outcome map,
            the full question bank with explanations, the indexed textbook paragraphs and the
            printable revision sheet. Marks are stored on the device and credited when a connection
            returns.
          </T>
        </p>
      </header>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <Point
          icon={PlaneTakeoff}
          title="Airplane mode is the demo"
          text="Download over Wi-Fi, turn the network off, open the offline app and finish a test. Nothing is fetched behind your back."
        />
        <Point
          icon={RefreshCw}
          title="Sync without double counting"
          text="Each attempt carries a device id, so retrying on a flaky link credits XP once — and the score is recalculated on the server."
        />
        <Point
          icon={ShieldCheck}
          title="Nothing downloads itself"
          text="Packs are fetched only when you press the button, and every pack on the device can be deleted from this screen."
        />
      </section>

      <div className="mt-5 space-y-4">
        {candidates.map((chapter) => (
          <OfflineManager
            key={chapter.id}
            chapterId={chapter.id}
            chapterTitle={`${subjectName(chapter.subjectSlug)} · Ch ${chapter.num} ${chapter.title}`}
          />
        ))}
      </div>

      <p className="mt-6 text-[12px] text-slate-500">
        The offline app is a single HTML file served from <code>/offline/offline-app.html</code> (the
        page you are reading is server-rendered; the reader itself is not). It shares IndexedDB with
        this portal, so a pack downloaded here is immediately available there.{" "}
        <Link href="/teacher" className="font-bold text-navy-600 hover:underline">
          Teachers:
        </Link>{" "}
        results taken offline appear on the mastery map as soon as a device reconnects.
      </p>
    </div>
  );
}

function Point({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof PlaneTakeoff;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-navy-900">
        <Icon className="h-4 w-4 text-saffron-600" /> {title}
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{text}</p>
    </article>
  );
}
