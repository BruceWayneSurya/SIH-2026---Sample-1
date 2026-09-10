"use client";

import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { useTranslation } from "@/components/language-provider";

/**
 * Renders a single intrinsic element whose accessible name is translated.
 *
 * <T> can only produce text children, so an attribute such as aria-label or
 * title written in a Server Component has no way to reach the dictionary —
 * useTranslation cannot run there. This bridges the gap: only the one element
 * becomes a client boundary, and its children stay server-rendered.
 *
 * `as` is restricted to intrinsic tags on purpose. Passing a component such as
 * next/link would send a function across the Server/Client boundary, which
 * Next.js rejects at build time; use TranslatedLink for those.
 */
export function TranslatedElement({
  as,
  label,
  attr = "aria-label",
  children,
  ...rest
}: {
  as: keyof JSX.IntrinsicElements;
  label: string;
  attr?: "aria-label" | "title";
  children?: ReactNode;
  className?: string;
  role?: string;
  id?: string;
}) {
  const { t } = useTranslation();
  const Tag = as;
  return (
    <Tag {...{ [attr]: t(label) }} {...rest}>
      {children}
    </Tag>
  );
}

/** The same, for next/link, which cannot be handed over as an `as` prop. */
export function TranslatedLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Link href={href} aria-label={t(label)} className={className}>
      {children}
    </Link>
  );
}
