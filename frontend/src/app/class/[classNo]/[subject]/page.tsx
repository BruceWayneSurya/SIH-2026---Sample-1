import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { validClass, validSubject } from "@/shared/curriculum";
import { PageLoading } from "@/components/page-loading";
import SubjectClient from "./subject-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ classNo: string; subject: string }>;
}): Promise<Metadata> {
  const { classNo, subject } = await params;
  return { title: `Class ${classNo} · ${subject} — Pragyan (प्रज्ञान)` };
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ classNo: string; subject: string }>;
}) {
  const { classNo, subject } = await params;
  if (!validClass(classNo) || !validSubject(subject)) notFound();
  return (
    <Suspense fallback={<PageLoading label="Loading chapters…" />}>
      <SubjectClient classNo={classNo} subject={subject} />
    </Suspense>
  );
}
