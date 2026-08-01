/**
 * Send simulator — the send path as a living diagram. Auto-plays a rotating
 * outcome (success → retry → fallback): a packet walks sender → transport →
 * send → result, hook chips light as they fire, decorators appear when the
 * path strengthens itself. Pauses offscreen and under reduced motion (which
 * renders a completed static run). Desktop-only; the static phase cards stay
 * for small screens.
 */

"use client";

import { AnimatePresence, MotionConfig, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Outcome = "ok" | "retry" | "fallback";
type Hook = "onSend" | "onSuccess" | "onError" | "onRetry";

type SimState = {
  /** Packet position as % of track width (node centers). */
  readonly pos: number;
  /** Nodes lit up to and including this index. */
  readonly active: number;
  readonly log: string;
  readonly hooks: ReadonlyArray<Hook>;
  readonly errorAt?: "send" | "transport";
  readonly decorator?: "RetryTransport" | "FallbackTransport";
  readonly result: "pending" | "ok";
};

type TimelineEntry = {
  readonly at: number;
  readonly patch: Partial<SimState>;
};

const OUTCOMES: ReadonlyArray<Outcome> = ["ok", "retry", "fallback"];

/** Hold the final frame this long before the next outcome starts. */
const RUN_MS: Record<Outcome, number> = { ok: 4200, retry: 5400, fallback: 6000 };

const NODE_X = [12.5, 37.5, 62.5, 87.5] as const;

const HOOKS: ReadonlyArray<Hook> = ["onSend", "onSuccess", "onError", "onRetry"];

function timeline(outcome: Outcome): ReadonlyArray<TimelineEntry> {
  const start: ReadonlyArray<TimelineEntry> = [
    {
      at: 0,
      patch: {
        pos: NODE_X[0],
        active: 0,
        log: "await mailer.send({ to, subject, html })",
        hooks: ["onSend"],
        errorAt: undefined,
        decorator: undefined,
        result: "pending",
      },
    },
    { at: 700, patch: { pos: NODE_X[1], active: 1, log: "ResendTransport · POST /emails" } },
    { at: 1450, patch: { pos: NODE_X[2], active: 2, log: "provider accepted…" } },
  ];

  if (outcome === "ok") {
    return [
      ...start,
      {
        at: 2200,
        patch: {
          pos: NODE_X[3],
          active: 3,
          result: "ok",
          hooks: ["onSend", "onSuccess"],
          log: "✓ 200 OK · messageId msg_01JX4K9RA2",
        },
      },
    ];
  }

  if (outcome === "retry") {
    return [
      ...start,
      {
        at: 2150,
        patch: {
          pos: NODE_X[2] - 5,
          errorAt: "send",
          decorator: "RetryTransport",
          hooks: ["onSend", "onError", "onRetry"],
          log: "✗ 429 RATE_LIMITED · onRetry → backoff 250ms · attempt 2/3",
        },
      },
      {
        at: 3550,
        patch: {
          pos: NODE_X[3],
          active: 3,
          result: "ok",
          errorAt: undefined,
          hooks: ["onSend", "onError", "onRetry", "onSuccess"],
          log: "✓ 200 OK after retry · messageId msg_01JX4K9RA2",
        },
      },
    ];
  }

  return [
    ...start.slice(0, 2),
    {
      at: 2050,
      patch: {
        errorAt: "transport",
        decorator: "FallbackTransport",
        hooks: ["onSend", "onError"],
        log: "✗ primary timeout · FallbackTransport → SESTransport",
      },
    },
    { at: 3400, patch: { pos: NODE_X[2], active: 2, log: "SESTransport · SendEmail → accepted" } },
    {
      at: 4300,
      patch: {
        pos: NODE_X[3],
        active: 3,
        result: "ok",
        errorAt: undefined,
        hooks: ["onSend", "onError", "onSuccess"],
        log: "✓ 200 OK via fallback · messageId msg_01JX4K9RA2",
      },
    },
  ];
}

const IDLE: SimState = {
  pos: NODE_X[0],
  active: -1,
  log: "await mailer.send({ to, subject, html })",
  hooks: [],
  result: "pending",
};

const DONE: SimState = {
  pos: NODE_X[3],
  active: 3,
  log: "✓ 200 OK · messageId msg_01JX4K9RA2",
  hooks: HOOKS,
  result: "ok",
};

const NODES = [
  { step: "01", title: "Sender", detail: "createMailer" },
  { step: "02", title: "Transport", detail: "ResendTransport" },
  { step: "03", title: "Send", detail: "mailer.send()" },
  { step: "04", title: "Result", detail: "ChannelSendResult" },
] as const;

/**
 * One run of the send path; timers drive the timeline, CSS transitions move
 * the packet between node centers.
 */
export function SendSimulator(): ReactNode {
  const reduced = useClientReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { margin: "-12% 0px" });
  const [run, setRun] = useState(0);
  const [state, setState] = useState<SimState>(reduced ? DONE : IDLE);

  useEffect(() => {
    if (reduced || !inView) return;
    let cancelled = false;
    const ids: Array<number> = [];
    const outcome = OUTCOMES[run % OUTCOMES.length]!;
    for (const entry of timeline(outcome)) {
      ids.push(
        window.setTimeout(() => {
          if (!cancelled) setState((prev) => ({ ...prev, ...entry.patch }));
        }, entry.at),
      );
    }
    ids.push(
      window.setTimeout(() => {
        if (!cancelled) setRun((r) => r + 1);
      }, RUN_MS[outcome]),
    );
    return () => {
      cancelled = true;
      for (const id of ids) window.clearTimeout(id);
    };
  }, [run, inView, reduced]);

  const sim = reduced ? DONE : state;

  return (
    <MotionConfig reducedMotion="never">
      <div ref={rootRef} className="flex flex-col gap-4" aria-hidden={false}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-fd-muted-foreground uppercase">
            <span
              aria-hidden
              className="sently-dot-pulse size-1 rounded-full bg-fd-foreground/60"
            />
            Live send — cycling success · retry · fallback
          </span>
          <span className="hidden font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground/70 uppercase sm:inline">
            no platform — just the library path
          </span>
        </div>

        <div className="relative">
          {/* packet — transitions between node centers */}
          <span
            aria-hidden
            className="absolute -top-[3px] z-[2] size-1.5 -translate-x-1/2 rounded-full bg-fd-foreground shadow-[0_0_8px_2px] shadow-fd-foreground/25 transition-[left] duration-500 ease-in-out"
            style={{ left: `${sim.pos}%` }}
          />
          <ol className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border">
            {NODES.map((node, index) => {
              const lit = index <= sim.active;
              const isTransport = node.title === "Transport";
              const isSend = node.title === "Send";
              const isResult = node.title === "Result";
              const errored =
                (isTransport && sim.errorAt === "transport") ||
                (isSend && sim.errorAt === "send");
              const showDecorator =
                (isSend && sim.decorator === "RetryTransport") ||
                (isTransport && sim.decorator === "FallbackTransport");
              return (
                <li
                  key={node.step}
                  className={cn(
                    "relative flex flex-col gap-1.5 bg-fd-card px-4 py-4 transition-colors duration-300",
                    lit && "bg-fd-secondary/40",
                  )}
                >
                  {showDecorator ? (
                    <span className="absolute -top-0.5 left-3 -translate-y-full rounded-full border border-fd-border bg-fd-background px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-fd-foreground uppercase">
                      {sim.decorator}
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "font-mono text-[10px] tracking-[0.16em] transition-colors duration-300",
                        lit ? "text-fd-foreground" : "text-fd-muted-foreground",
                      )}
                    >
                      {node.step}
                    </span>
                    {errored ? (
                      <span className="font-mono text-[10px] text-[var(--oke-el-ai)]">✗</span>
                    ) : null}
                    {isResult && sim.result === "ok" ? (
                      <span className="font-mono text-[10px] text-[var(--oke-el-gate)]">✓</span>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium">{node.title}</span>
                  <span className="font-mono text-[11px] text-fd-muted-foreground">
                    {isResult && sim.result === "ok" ? (
                      <span className="text-fd-foreground/80">200 OK · msg_01JX…</span>
                    ) : errored && isTransport ? (
                      <>
                        <s className="text-fd-muted-foreground/70">ResendTransport</s>{" "}
                        <span className="text-fd-foreground/80">→ SESTransport</span>
                      </>
                    ) : errored && isSend ? (
                      <span className="text-[var(--oke-el-ai)]">429 RATE_LIMITED</span>
                    ) : (
                      node.detail
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ul className="flex flex-wrap items-center gap-1.5">
            {HOOKS.map((hook) => {
              const fired = sim.hooks.includes(hook);
              return (
                <li
                  key={hook}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] transition-all duration-300",
                    fired
                      ? "border-fd-foreground/50 bg-fd-secondary/60 text-fd-foreground"
                      : "border-fd-border text-fd-muted-foreground/60",
                  )}
                >
                  {hook}
                </li>
              );
            })}
          </ul>
          <div className="min-h-[1.25rem] font-mono text-[11px] text-fd-muted-foreground">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={sim.log}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className={cn("inline-block", sim.result === "ok" && "text-fd-foreground/85")}
              >
                {sim.log}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <p className="sr-only">
          Animated demonstration: a send travels sender, transport, send, result. The cycle shows
          a plain success, a rate-limit retried by RetryTransport, and a primary outage rerouted by
          FallbackTransport, with onSend, onSuccess, onError, and onRetry hooks firing in turn.
        </p>
      </div>
    </MotionConfig>
  );
}
