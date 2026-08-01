/**
 * Tabbed hero code panel — multi-file tour that demonstrates the same sender
 * shape across channels. Auto-cycles when in view (pauses on hover/focus),
 * settles in with the hero, slides a spring underline between tabs, and swaps
 * footer copy with the snippet. Reduced motion: no auto-cycle, no settle,
 * instant tab swaps.
 */

"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

export type CodeTourTab = {
  readonly id: string;
  readonly title: string;
  readonly footer?: string;
  readonly code: ReactNode;
};

type ChannelMeta = {
  readonly label: string;
  readonly sender: string;
  readonly ink: string;
};

/** Channel chrome for each tour tab — labels match real exports. */
const CHANNEL_META: Record<string, ChannelMeta> = {
  email: {
    label: "email",
    sender: "createMailer",
    ink: "var(--oke-el-flow)",
  },
  sms: {
    label: "sms",
    sender: "createSmsSender",
    ink: "var(--oke-el-signal)",
  },
  whatsapp: {
    label: "whatsapp",
    sender: "createWhatsAppSender",
    ink: "var(--oke-el-gate)",
  },
  push: {
    label: "push",
    sender: "createPushSender",
    ink: "var(--oke-el-channel)",
  },
};

/** Dwell per auto-cycled snippet — long enough to read the send call. */
const CYCLE_MS = 5200;

/**
 * Client shell: filename tabs swap pre-highlighted code panels, auto-tour
 * the channel claim, and settle with the hero column.
 *
 * @param tabs - Pre-rendered snippet panels from the server
 */
export function TabbedCodePanel({ tabs }: { readonly tabs: ReadonlyArray<CodeTourTab> }) {
  const reduced = useClientReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { margin: "-8% 0px" });
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const meta = active ? (CHANNEL_META[active.id] ?? null) : null;

  useEffect(() => {
    if (reduced || !inView || paused || tabs.length < 2) return;
    const timer = window.setTimeout(() => {
      const index = tabs.findIndex((tab) => tab.id === activeId);
      const next = tabs[(index + 1) % tabs.length]!;
      setActiveId(next.id);
    }, CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [activeId, inView, paused, reduced, tabs]);

  if (!active) return null;

  function selectTab(id: string): void {
    setActiveId(id);
  }

  return (
    <MotionConfig reducedMotion="never">
      <motion.figure
        ref={rootRef}
        className="not-prose relative m-0 w-full min-w-0 overflow-hidden rounded-xl border border-fd-border bg-fd-card"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 320, damping: 30, mass: 0.85, delay: 0.12 }
        }
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        {/* Window chrome — traffic lights + live channel chip */}
        <div className="flex items-center justify-between gap-3 border-b border-fd-border px-3.5 py-2.5 sm:px-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-fd-muted-foreground/35" />
            <span className="size-2 rounded-full bg-fd-muted-foreground/25" />
            <span className="size-2 rounded-full bg-fd-muted-foreground/15" />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {meta ? (
              <>
                <span
                  aria-hidden
                  className="sently-dot-pulse size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.ink }}
                />
                <span className="truncate font-mono text-[10px] tracking-[0.14em] text-fd-muted-foreground uppercase">
                  {meta.label}
                  <span className="mx-1.5 text-fd-muted-foreground/40">·</span>
                  <span className="normal-case tracking-normal text-fd-foreground/70">
                    {meta.sender}
                  </span>
                </span>
              </>
            ) : (
              <span className="font-mono text-[10px] tracking-[0.14em] text-fd-muted-foreground uppercase">
                channel tour
              </span>
            )}
          </div>
          <span className="hidden font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground/60 uppercase sm:inline">
            {paused || reduced ? "paused" : "live"}
          </span>
        </div>

        <figcaption className="relative flex items-center gap-1 overflow-x-auto border-b border-fd-border px-2 sm:px-2.5">
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
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "relative px-3 py-2.5 font-mono text-[11px] tracking-wide whitespace-nowrap transition-colors",
                    selected
                      ? "text-fd-foreground"
                      : "text-fd-muted-foreground hover:text-fd-foreground/80",
                  )}
                >
                  {tab.title}
                  {selected ? (
                    <motion.span
                      layoutId="hero-code-tab-underline"
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-px bg-fd-foreground/70"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 36, mass: 0.8 }
                      }
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Auto-cycle progress — restarts each dwell; freezes while paused */}
          {!reduced && tabs.length > 1 ? (
            <span
              key={active.id}
              aria-hidden
              className={cn(
                "sently-tour-progress pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-fd-foreground/45",
                paused && "is-paused",
              )}
              style={{ animationDuration: `${CYCLE_MS}ms` }}
            />
          ) : null}
        </figcaption>

        <div className="relative min-h-[22rem] sm:min-h-[24rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              id={`hero-code-panel-${active.id}`}
              role="tabpanel"
              aria-labelledby={`hero-code-tab-${active.id}`}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
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

        <div className="relative min-h-[2.5rem] overflow-hidden border-t border-fd-border">
          <AnimatePresence mode="wait" initial={false}>
            {active.footer ? (
              <motion.div
                key={active.id}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={reduced ? { duration: 0 } : { duration: 0.18 }}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <p className="text-[11px] text-fd-muted-foreground">{active.footer}</p>
                <span className="hidden shrink-0 font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground/50 uppercase sm:inline">
                  {tabs.findIndex((tab) => tab.id === active.id) + 1}/{tabs.length}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="sr-only">
          Animated code tour cycling through email, SMS, WhatsApp, and push snippets to show the
          same sender shape across every channel. Hover or focus the panel to pause.
        </p>
      </motion.figure>
    </MotionConfig>
  );
}
