/**
 * Homepage hero copy column — headline, support, CTAs.
 * Atmosphere + staggered settle match the 404 surface language.
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { AiOnboardButton } from "@/components/landing/ai-onboard-button";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

const EASE = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;

const column: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
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
 * Left hero pane: quiet grid atmosphere and settle motion.
 */
export function HeroIntro(): ReactNode {
  const reduced = useClientReducedMotion();
  const settleVariants = reduced ? settleStatic : settle;

  return (
    <div className="relative flex w-full flex-col justify-center overflow-hidden border-b border-fd-border px-5 py-14 sm:px-8 lg:w-[48%] lg:border-r lg:border-b-0 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-[28rem] rounded-full bg-fd-foreground/[0.03] blur-3xl dark:bg-fd-foreground/[0.045]"
      />

      <MotionConfig reducedMotion="never">
        <motion.div
          className="relative z-[1] flex flex-col gap-7"
          variants={column}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.h1
            variants={settleVariants}
            className="max-w-[18ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl xl:text-[2.85rem] xl:leading-[1.08]"
          >
            Messaging that runs{" "}
            <span className="text-fd-muted-foreground">everywhere your code does</span>
          </motion.h1>

          <motion.p
            variants={settleVariants}
            className="max-w-md text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base"
          >
            Email, SMS, WhatsApp, and Web Push — one channel-first API for Node.js, Bun, Deno, and
            Cloudflare Workers. Zero runtime dependencies.
          </motion.p>

          <motion.div
            variants={settleVariants}
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <Link
              href="/docs/get-started/installation"
              className="inline-flex items-center bg-fd-foreground px-5 py-2.5 text-sm font-medium text-fd-background transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
            <AiOnboardButton />
          </motion.div>

          <motion.p
            variants={settleVariants}
            className="font-mono text-[11px] tracking-[0.12em] text-fd-muted-foreground uppercase"
          >
            Runs on Node · Bun · Deno · Cloudflare Workers
          </motion.p>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
