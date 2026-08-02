/**
 * Why-sently problem→fix grid — same gap-px card language as the channels
 * band. Cards settle on scroll and carry a pointer spotlight
 * (`.sently-spotlight` in global.css).
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import { Boxes, GitBranch, Layers, ShieldCheck, type LucideIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Feature = {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: "Different SDKs everywhere",
    body: "Every provider ships its own client. Sently exposes one sender shape per channel instead.",
    icon: Layers,
  },
  {
    title: "Per-vendor error shapes",
    body: "Catch SentlyError codes like RATE_LIMITED — not a different string format per vendor.",
    icon: ShieldCheck,
  },
  {
    title: "Reliability bolted on later",
    body: "Retry and fallback wrap any transport. Same decorators when you add the next channel.",
    icon: GitBranch,
  },
  {
    title: "Runtime lock-in",
    body: "One ESM package on Node, Bun, Deno, and Cloudflare Workers — including SMTP where sockets need adapters.",
    icon: Boxes,
  },
];

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
  },
};

/** Feed the card's spotlight radial with pointer coordinates (CSS vars). */
function trackSpotlight(event: MouseEvent<HTMLLIElement>): void {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
  card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
}

/**
 * Four-up problem→fix grid for the landing "why" band.
 */
export function WhyFeatures(): ReactNode {
  const reduced = useClientReducedMotion();

  return (
    <MotionConfig reducedMotion="never">
      <motion.ul
        className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2"
        variants={list}
        initial={reduced ? false : "hidden"}
        whileInView={reduced ? undefined : "show"}
        viewport={{ once: true, margin: "-8% 0px" }}
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.li
              key={feature.title}
              variants={item}
              onMouseMove={trackSpotlight}
              className="sently-spotlight group flex flex-col gap-2.5 bg-fd-card px-5 py-5"
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className="size-4 text-fd-muted-foreground transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:text-fd-foreground"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <span className="text-sm font-medium">{feature.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground">
                {feature.body}
              </p>
            </motion.li>
          );
        })}
      </motion.ul>
    </MotionConfig>
  );
}
