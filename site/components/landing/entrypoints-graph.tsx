/**
 * Entrypoints graph — the subpath list as an import tree with real size
 * bars. Numbers come from tools/bundle-size-budgets.json (CI-enforced gzip
 * ceilings per isolated import), so the bars double as proof that unused
 * providers stay out of the bundle. Bars draw in on scroll; reduced motion
 * shows the final widths.
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Entry = {
  readonly path: string;
  readonly use: string;
  /** CI gzip budget in KB (ceiling — measured output is at or under). */
  readonly kb?: number;
  /** transports/* spans many providers: show the range instead of a point. */
  readonly kbRange?: readonly [number, number];
};

const ENTRIES: ReadonlyArray<Entry> = [
  { path: "sently/mailer", use: "Custom / HTTP email transports", kb: 2.8 },
  { path: "sently/smtp", use: "Host, pool, adapters, DKIM", kb: 15.8 },
  { path: "sently/sms", use: "SMS channel sender", kb: 0.8 },
  { path: "sently/whatsapp", use: "WhatsApp channel sender", kb: 0.8 },
  { path: "sently/push", use: "Web Push or FCM channel sender", kb: 1.4 },
  { path: "sently/transports/*", use: "One provider per subpath", kbRange: [1.2, 14.5] },
];

const MAX_KB = 15.8;

const STACKS = [
  { label: "mailer + ResendTransport", kb: 6.8 },
  { label: "mailer + SNDR", kb: 4.5 },
] as const;

const STACK_MAX_KB = 6.8;

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
  },
};

const bar: Variants = {
  hidden: { scaleX: 0 },
  show: ({ pct, index }: { pct: number; index: number }) => ({
    scaleX: pct,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 + index * 0.06 },
  }),
};

/** One size bar (single value or range), width scaled to the largest entry. */
function SizeBar({ entry, index }: { readonly entry: Entry; readonly index: number }): ReactNode {
  return (
    <span className="relative hidden h-1 w-20 shrink-0 overflow-hidden rounded-full bg-fd-border/70 sm:block">
      {entry.kb !== undefined ? (
        <motion.span
          className="block h-full origin-left rounded-full bg-fd-foreground/70"
          style={{ width: `${Math.max(5, (entry.kb / MAX_KB) * 100)}%` }}
          custom={{ pct: 1, index }}
          variants={bar}
        />
      ) : entry.kbRange ? (
        <motion.span
          className="absolute top-0 block h-full origin-left rounded-full bg-fd-foreground/45"
          style={{
            left: `${(entry.kbRange[0] / MAX_KB) * 100}%`,
            width: `${((entry.kbRange[1] - entry.kbRange[0]) / MAX_KB) * 100}%`,
          }}
          custom={{ pct: 1, index }}
          variants={bar}
        />
      ) : null}
    </span>
  );
}

/**
 * Tree of subpaths + measured-stack comparison card.
 */
export function EntrypointsGraph(): ReactNode {
  const reduced = useClientReducedMotion();

  return (
    <MotionConfig reducedMotion="never">
      <motion.div
        className="flex flex-col gap-6"
        variants={list}
        initial={reduced ? false : "hidden"}
        whileInView={reduced ? undefined : "show"}
        viewport={{ once: true, margin: "-8% 0px" }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-fd-border bg-fd-card px-2.5 py-1 font-mono text-xs text-fd-foreground">
              sently
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-fd-muted-foreground uppercase">
              what you import is what ships
            </span>
          </div>
          <motion.ul className="relative flex flex-col pl-5">
            <span
              aria-hidden
              className="absolute top-1 bottom-3 left-[7px] w-px bg-fd-border"
            />
            {ENTRIES.map((entry, index) => (
              <motion.li key={entry.path} variants={item} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-[13px] w-[13px] border-b border-fd-border"
                />
                <Link
                  href="/docs/get-started/entrypoints"
                  className="group -mx-1 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2 transition-colors hover:bg-fd-secondary/40"
                >
                  <span className="font-mono text-xs text-fd-foreground">{entry.path}</span>
                  <span className="text-[11px] text-fd-muted-foreground transition-colors group-hover:text-fd-foreground/80">
                    {entry.use}
                  </span>
                  <span className="ml-auto flex items-center gap-2.5">
                    <SizeBar entry={entry} index={index} />
                    <span className="w-16 text-right font-mono text-[10px] text-fd-muted-foreground tabular-nums">
                      {entry.kb !== undefined
                        ? `≤${entry.kb} KB`
                        : entry.kbRange
                          ? `${entry.kbRange[0]}–${entry.kbRange[1]} KB`
                          : null}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-3 -translate-x-1 text-fd-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
          <p className="pl-5 font-mono text-[10px] tracking-[0.08em] text-fd-muted-foreground/80 uppercase">
            gzip · CI-enforced budgets per isolated import
          </p>
        </div>

        <motion.div
          variants={item}
          className="overflow-hidden rounded-xl border border-fd-border bg-fd-card"
        >
          <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2.5">
            <span aria-hidden className="size-1 rounded-full bg-fd-muted-foreground/60" />
            <span className="font-mono text-[10px] tracking-[0.16em] text-fd-muted-foreground uppercase">
              Measured stacks · what a real import costs
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 px-4 py-3.5">
            {STACKS.map((stack, index) => (
              <li key={stack.label} className="flex items-center gap-3">
                <span className="w-40 shrink-0 font-mono text-[11px] text-fd-muted-foreground sm:w-44">
                  {stack.label}
                </span>
                <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-fd-border/70">
                  <motion.span
                    className="block h-full origin-left rounded-full bg-fd-foreground/70"
                    style={{ width: `${(stack.kb / STACK_MAX_KB) * 100}%` }}
                    custom={{ pct: 1, index: index + ENTRIES.length }}
                    variants={bar}
                  />
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] text-fd-foreground tabular-nums">
                  {stack.kb} KB
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-fd-border px-4 py-2 text-[11px] text-fd-muted-foreground">
            Minified + gzip, tree-shaken — a whole HTTP email stack lands under 7 KB.
          </p>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
