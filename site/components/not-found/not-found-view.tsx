/**
 * Site 404 — brand, path, short message, CTAs.
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SentlyLogo } from "@/components/sently-logo";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

const EASE = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;

const column: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04,
    },
  },
};

const settle: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: EASE },
};

const settleStatic: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0 } },
};

/**
 * Full-bleed not-found surface. Mounted under the root layout (topbar stays).
 */
export function NotFoundView() {
  const pathname = usePathname() || "/";
  const reduced = useClientReducedMotion();
  const settleVariants = reduced ? settleStatic : settle;

  return (
    <MotionConfig reducedMotion="never">
      <main className="relative flex min-h-[calc(100dvh-var(--landing-topbar-height))] flex-1 flex-col overflow-hidden border-b border-fd-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]"
        />

        <motion.div
          className="relative z-[1] mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 sm:py-20"
          variants={column}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.div variants={settleVariants}>
            <Link
              href="/"
              className="inline-flex w-fit text-fd-foreground transition-opacity hover:opacity-80"
              aria-label="sently home"
            >
              <SentlyLogo className="h-8 w-auto sm:h-9" />
            </Link>
          </motion.div>

          <motion.p
            variants={settleVariants}
            className="mt-8 font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase"
          >
            404 · not found
          </motion.p>

          <motion.h1
            variants={settleVariants}
            className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl xl:text-5xl"
          >
            This page does not exist.
          </motion.h1>

          <motion.p
            variants={settleVariants}
            className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base"
          >
            No docs page at{" "}
            <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-[0.9em] text-fd-foreground">
              {pathname}
            </code>
            . Check the handbook or head home.
          </motion.p>

          <motion.div
            variants={settleVariants}
            className="mt-10 flex flex-wrap items-center gap-2 sm:gap-3"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-fd-primary px-5 py-2.5 text-xs font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 sm:text-sm"
            >
              Home
            </Link>
            <Link
              href="/docs"
              className="group relative inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground sm:text-sm"
            >
              <span className="relative">Documentation</span>
              <ArrowRight
                className="relative size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </MotionConfig>
  );
}
