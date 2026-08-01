/**
 * Why-sently feature grid — scope-creep / unified delivery points in the same
 * gap-px card language as the channels band. Inspired by better-notify's
 * feature strip; claims are sently-specific. Cards settle in on scroll and
 * carry a pointer spotlight (`.sently-spotlight` in global.css).
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import {
  Boxes,
  Feather,
  GitBranch,
  Layers,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Feature = {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: "One sender shape",
    body: "Email today, SMS and push tomorrow — createMailer, createSmsSender, createWhatsAppSender, createPushSender. Same call-site pattern as channels grow.",
    icon: Layers,
  },
  {
    title: "One failure model",
    body: "SentlyError with codes like RATE_LIMITED and BAD_REQUEST across every channel. Catch by code, not per-vendor string matching.",
    icon: ShieldCheck,
  },
  {
    title: "One reliability path",
    body: "Retry, fallback, and weighted failover wrap any transport without a new API. Same decorators when you add the next channel.",
    icon: GitBranch,
  },
  {
    title: "Pluggable transports",
    body: "One provider per subpath. Resend today, SES tomorrow — or Twilio then Unifonic — same sender contract.",
    icon: Plug,
  },
  {
    title: "Every runtime",
    body: "Node, Bun, Deno, and Cloudflare Workers from one ESM package. Socket adapters where SMTP needs them.",
    icon: Boxes,
  },
  {
    title: "Small when it matters",
    body: "Import sently/mailer for HTTP email (~6 KB gzip). Extra channels and providers stay out of Workers and edge bundles until you need them.",
    icon: Feather,
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
 * Six-up feature grid for the landing "why" band.
 */
export function WhyFeatures(): ReactNode {
  const reduced = useClientReducedMotion();

  return (
    <MotionConfig reducedMotion="never">
      <motion.ul
        className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2 lg:grid-cols-3"
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
