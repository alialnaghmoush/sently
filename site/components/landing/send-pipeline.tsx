/**
 * Send pipeline — one flow across every channel.
 * Visual rhythm inspired by better-notify's pipeline strip; copy and phases
 * match sently's channel-first model (sender → transport → send → result).
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { SendSimulator } from "@/components/landing/send-simulator";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type Phase = {
  readonly step: string;
  readonly title: string;
  readonly detail: string;
};

const PHASES: ReadonlyArray<Phase> = [
  {
    step: "01",
    title: "Sender",
    detail: "createMailer · createSmsSender · createWhatsAppSender · createPushSender",
  },
  {
    step: "02",
    title: "Transport",
    detail: "Resend · SMTP · Twilio · WhatsApp Cloud · Web Push — or your own",
  },
  {
    step: "03",
    title: "Send",
    detail: "mailer.send() · sms.send() — same shape, channel-specific options",
  },
  {
    step: "04",
    title: "Result",
    detail: "messageId · accepted · provider response — stable error codes",
  },
];

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
  },
};

/**
 * Horizontal pipeline of the sently send path, with hooks called out below.
 */
export function SendPipeline(): ReactNode {
  const reduced = useClientReducedMotion();

  return (
    <div className="flex flex-col gap-6">
      <MotionConfig reducedMotion="never">
        {/* Live send lifecycle on wide screens; static phase cards below lg. */}
        <div className="hidden lg:block">
          <SendSimulator />
        </div>

        <div className="relative lg:hidden">
          <span
            aria-hidden
            className="sently-beam-x pointer-events-none absolute -top-px z-[1] hidden h-px w-16 bg-linear-to-r from-transparent via-fd-foreground/60 to-transparent lg:block"
          />
          <motion.ol
            className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2"
            variants={list}
            initial={reduced ? false : "hidden"}
            whileInView={reduced ? undefined : "show"}
            viewport={{ once: true, margin: "-8% 0px" }}
          >
            {PHASES.map((phase, index) => (
              <motion.li
                key={phase.step}
                variants={item}
                className="group relative flex flex-col gap-2 bg-fd-card px-5 py-5 transition-colors hover:bg-fd-secondary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] tracking-[0.16em] text-fd-muted-foreground transition-colors group-hover:text-fd-foreground">
                    {phase.step}
                  </span>
                  {index < PHASES.length - 1 ? (
                    <span
                      aria-hidden
                      className="sently-node-pulse hidden font-mono text-[10px] text-fd-muted-foreground/50 sm:inline"
                      style={{ animationDelay: `${index * 0.45}s` }}
                    >
                      →
                    </span>
                  ) : null}
                </div>
                <span className="text-sm font-medium">{phase.title}</span>
                <span className="font-mono text-[11px] leading-relaxed text-fd-muted-foreground">
                  {phase.detail}
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </div>

        <motion.div
          className="grid gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2"
          variants={list}
          initial={reduced ? false : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={{ once: true, margin: "-8% 0px" }}
        >
          <motion.div variants={item} className="flex flex-col gap-1.5 bg-fd-card px-5 py-4">
            <span className="font-mono text-[10px] tracking-[0.16em] text-fd-muted-foreground uppercase">
              Hooks
            </span>
            <p className="text-sm text-fd-muted-foreground">
              Observe without changing the send —{" "}
              <code className="text-fd-foreground/80">onSend</code>,{" "}
              <code className="text-fd-foreground/80">onSuccess</code>,{" "}
              <code className="text-fd-foreground/80">onError</code>,{" "}
              <code className="text-fd-foreground/80">onRetry</code>. No body or PII in hook
              context.
            </p>
          </motion.div>
          <motion.div variants={item} className="flex flex-col gap-1.5 bg-fd-card px-5 py-4">
            <span className="font-mono text-[10px] tracking-[0.16em] text-fd-muted-foreground uppercase">
              Decorators
            </span>
            <p className="text-sm text-fd-muted-foreground">
              Wrap any transport —{" "}
              <code className="text-fd-foreground/80">RetryTransport</code>,{" "}
              <code className="text-fd-foreground/80">FallbackTransport</code>,{" "}
              <code className="text-fd-foreground/80">IdempotencyTransport</code>. Same contract,
              stronger send path.
            </p>
          </motion.div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
