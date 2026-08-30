import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { validClass, validSubject } from "@/shared/curriculum";
import { PageLoading } from "@/components/page-loading";
import ChapterClient from "./chapter-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ classNo: string; subject: string; chapter: string }>;
}): Promise<Metadata> {
  const { classNo, subject, chapter } = await params;
  return { title: `Chapter ${chapter} — Class ${classNo} ${subject} · Pragyan (प्रज्ञान)` };
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ classNo: string; subject: string; chapter: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { classNo, subject, chapter } = await params;
  const { tab = "learn" } = await searchParams;
  if (!validClass(classNo) || !validSubject(subject)) notFound();
  if (!["learn", "objective", "subjective"].includes(tab)) notFound();
  return (
    <Suspense fallback={<PageLoading label="Loading chapter…" />}>
      <ChapterClient classNo={classNo} subject={subject} chapter={chapter} />
    </Suspense>
  );
}
