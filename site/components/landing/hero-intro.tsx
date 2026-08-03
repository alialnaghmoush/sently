/**
 * Homepage hero copy column — headline, support, CTAs.
 * Atmosphere + staggered settle match the 404 surface language.
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { siBun, siCloudflareworkers, siDeno, siNodedotjs } from "simple-icons";
import { AiOnboardButton } from "@/components/landing/ai-onboard-button";
import { HeroSignalMap } from "@/components/landing/hero-signal-map";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";
import { SENTLY_VERSION } from "@/lib/version";

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
 * Runtime brand marks — brand hex where simple-icons is colorful; Bun/Deno
 * use cream/mint accents (their SI hex is black and vanishes on dark).
 */
const RUNTIMES = [
  {
    name: "Node",
    title: "Node.js",
    path: siNodedotjs.path,
    colorClass: "text-[#5FA04E]",
  },
  {
    name: "Bun",
    title: "Bun",
    path: siBun.path,
    colorClass: "text-[#B45309] dark:text-[#FBF0DF]",
  },
  {
    name: "Deno",
    title: "Deno",
    path: siDeno.path,
    colorClass: "text-[#0F766E] dark:text-[#70FFAF]",
  },
  {
    name: "Workers",
    title: "Cloudflare Workers",
    path: siCloudflareworkers.path,
    colorClass: "text-[#F38020]",
  },
] as const;

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
          <motion.p
            variants={settleVariants}
            className="flex flex-wrap items-center gap-x-2.5 gap-y-2 font-mono text-[11px] tracking-[0.12em] text-fd-muted-foreground uppercase"
          >
            <Link
              href="/changelog"
              title="What's new in this release"
              className="group/version inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-2.5 py-1 text-fd-foreground transition-colors hover:border-fd-foreground/25 hover:bg-fd-secondary/40"
            >
              <span
                aria-hidden
                className="sently-dot-pulse size-1.5 rounded-full bg-fd-foreground/70"
              />
              v{SENTLY_VERSION}
              <ArrowRight
                aria-hidden
                className="-mr-0.5 size-3 text-fd-muted-foreground/60 transition-all duration-300 group-hover/version:translate-x-0.5 group-hover/version:text-fd-foreground/80"
              />
            </Link>
            <span>open source · ESM-only · zero runtime deps</span>
          </motion.p>

          <motion.h1
            variants={settleVariants}
            className="max-w-[20ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl xl:text-[2.85rem] xl:leading-[1.08]"
          >
            Notification infrastructure that runs{" "}
            <span className="text-fd-muted-foreground">everywhere your code does</span>
          </motion.h1>

          <motion.p
            variants={settleVariants}
            className="max-w-md text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base"
          >
            One TypeScript API for Email, SMS, WhatsApp, and Push. Write once — switch providers
            without rewriting app code.
          </motion.p>

          <motion.p
            variants={settleVariants}
            className="max-w-md font-mono text-[11px] leading-relaxed tracking-[0.04em] text-fd-muted-foreground"
          >
            One package —{" "}
            <span className="text-fd-foreground">sently</span>
            {" — "}
            <span className="text-fd-foreground/80">sently/mailer</span>
            {" · "}
            <span className="text-fd-foreground/80">sently/sms</span>
            {" · "}
            <span className="text-fd-foreground/80">sently/whatsapp</span>
            {" · "}
            <span className="text-fd-foreground/80">sently/push</span>
          </motion.p>

          <motion.div
            variants={settleVariants}
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <Link
              href="/docs/get-started/installation"
              className="group inline-flex items-center bg-fd-foreground px-5 py-2.5 text-sm font-medium text-fd-background transition-opacity hover:opacity-90"
            >
              Get started
              <ArrowRight
                aria-hidden
                className="ml-2 size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <AiOnboardButton />
          </motion.div>

          <motion.ul
            variants={settleVariants}
            aria-label="Runs on Node, Bun, Deno, and Cloudflare Workers"
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <li className="font-mono text-[11px] tracking-[0.12em] text-fd-muted-foreground uppercase">
              Runs on
            </li>
            {RUNTIMES.map((runtime) => (
              <li key={runtime.name}>
                <span
                  title={runtime.title}
                  className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase ${runtime.colorClass}`}
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-3.5 shrink-0"
                    aria-hidden
                  >
                    <path d={runtime.path} />
                  </svg>
                  {runtime.name}
                </span>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={settleVariants} className="hidden max-w-[30rem] pt-2 sm:block">
            <HeroSignalMap />
          </motion.div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
