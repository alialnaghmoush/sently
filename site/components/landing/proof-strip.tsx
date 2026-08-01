/**
 * Proof strip — count-up numbers backing the readme pitch. Counts run once
 * on first scroll into view; reduced motion prints the final values.
 * Numbers mirror site facts: provider count matches ProviderMarquee, bundle
 * claim matches the "why" feature grid.
 */

"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Stat = {
  readonly value: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly label: string;
};

const STATS: ReadonlyArray<Stat> = [
  { value: 4, label: "channels, one sender shape" },
  { value: 21, label: "provider transports" },
  { value: 0, label: "runtime dependencies" },
  { value: 6, prefix: "~", suffix: " KB", label: "HTTP email stack, gzip" },
];

/**
 * One animated figure. Renders through a MotionValue so the count never
 * re-renders React per frame.
 */
function StatNumber({ stat }: { readonly stat: Stat }): ReactNode {
  const reduced = useClientReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const value = useMotionValue(reduced ? stat.value : 0);
  const text = useTransform(
    value,
    (current) => `${stat.prefix ?? ""}${Math.round(current)}${stat.suffix ?? ""}`,
  );

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(value, stat.value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, reduced, stat.value, value]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

/**
 * Four-up stat row for the readme band.
 */
export function ProofStrip(): ReactNode {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1.5 sm:border-l sm:border-fd-border sm:pl-5 sm:first:border-0 sm:first:pl-0"
        >
          <dd className="order-1 font-mono text-2xl tracking-tight text-fd-foreground tabular-nums sm:text-[1.7rem]">
            <StatNumber stat={stat} />
          </dd>
          <dt className="order-2 font-mono text-[11px] leading-snug tracking-[0.1em] text-fd-muted-foreground uppercase">
            {stat.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
