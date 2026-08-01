/**
 * Tabbed hero code panel — multi-file tour inspired by better-notify's
 * hero snippet switcher. Tabs + chrome stay in sently's border / mono language.
 */

"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

export type CodeTourTab = {
  readonly id: string;
  readonly title: string;
  readonly footer?: string;
  readonly code: ReactNode;
};

/**
 * Client shell: filename tabs swap pre-highlighted code panels.
 *
 * @param tabs - Pre-rendered snippet panels from the server
 */
export function TabbedCodePanel({ tabs }: { readonly tabs: ReadonlyArray<CodeTourTab> }) {
  const reduced = useClientReducedMotion();
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  if (!active) return null;

  return (
    <figure className="not-prose m-0 w-full min-w-0 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <figcaption className="flex items-center gap-1 overflow-x-auto border-b border-fd-border px-2 sm:px-2.5">
        <div role="tablist" aria-label="Code examples" className="flex min-w-0 items-center">
          {tabs.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`hero-code-tab-${tab.id}`}
                aria-controls={`hero-code-panel-${tab.id}`}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "relative px-3 py-2.5 font-mono text-[11px] tracking-wide whitespace-nowrap transition-colors",
                  selected
                    ? "text-fd-foreground"
                    : "text-fd-muted-foreground hover:text-fd-foreground/80",
                )}
              >
                {tab.title}
                {selected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-px bg-fd-foreground/70"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </figcaption>

      <MotionConfig reducedMotion="never">
        <div className="relative min-h-[22rem] sm:min-h-[24rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              id={`hero-code-panel-${active.id}`}
              role="tabpanel"
              aria-labelledby={`hero-code-tab-${active.id}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 36, mass: 0.8 }
              }
              className="[&_pre]:overflow-x-auto [&_pre]:bg-transparent [&_pre]:px-4 [&_pre]:py-4 [&_pre]:text-xs [&_pre]:leading-relaxed sm:[&_pre]:text-[13px]"
            >
              {active.code}
            </motion.div>
          </AnimatePresence>
        </div>
      </MotionConfig>

      {active.footer ? (
        <div className="border-t border-fd-border px-4 py-2.5 text-[11px] text-fd-muted-foreground">
          {active.footer}
        </div>
      ) : null}
    </figure>
  );
}
