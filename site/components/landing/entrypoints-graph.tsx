/**
 * Budgets panel — CI gzip ceilings as headline metrics, then channel /
 * transport entrypoints as pickable imports. Numbers come from
 * tools/bundle-size-budgets.json (CI-enforced). Structure mirrors the
 * okengine budgets graph: hard-cap grid, then import-all / or-pick lists.
 */

"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  useId,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { useClientReducedMotion } from "@/lib/use-client-reduced-motion";

type CoreMetric = {
  readonly id: string;
  readonly name: string;
  readonly meaning: string;
  /** Displayed measured/ceiling value (KB). */
  readonly kb: number;
  readonly suffix?: string;
};

type ExportRow = {
  readonly id: string;
  readonly name: string;
  readonly kb: number;
  readonly note?: string;
};

/** Four hard caps CI fails on — headline product claims. */
const CORE: ReadonlyArray<CoreMetric> = [
  {
    id: "stack: http-resend",
    name: "HTTP",
    meaning: "mailer + Resend · gzip",
    kb: 6.8,
  },
  {
    id: "sently/smtp",
    name: "SMTP",
    meaning: "createSMTPMailer · gzip",
    kb: 15.8,
  },
  {
    id: "sently/sms",
    name: "SMS",
    meaning: "createSmsSender · gzip",
    kb: 0.8,
  },
  {
    id: "sently/push",
    name: "Push",
    meaning: "createPushSender · gzip",
    kb: 1.4,
  },
];

/** Typical stack — highlighted baseline row. */
const BASELINE: ExportRow = {
  id: "stack: http-resend",
  name: "mailer + ResendTransport",
  kb: 6.8,
  note: "baseline · typical stack",
};

/** Channel / core entrypoints — bars scaled to SMTP (largest core ceiling). */
const EXPORT_ROWS: ReadonlyArray<ExportRow> = [
  { id: "sently/sms", name: "sently/sms", kb: 0.8 },
  { id: "sently/whatsapp", name: "sently/whatsapp", kb: 0.8 },
  { id: "sently/push", name: "sently/push", kb: 1.4 },
  { id: "sently/mailer", name: "sently/mailer", kb: 2.8 },
  { id: "sently (createMailer)", name: "sently", kb: 2.8 },
  { id: "stack: http-sndr", name: "mailer + SNDR", kb: 4.5 },
  { id: "sently/smtp", name: "sently/smtp", kb: 15.8 },
].sort((a, b) => a.kb - b.kb);

/** Representative transports — collapsed by default, like okengine/plugins. */
const TRANSPORT_ROWS: ReadonlyArray<ExportRow> = [
  { id: "sently/transports/whatsapp-cloud", name: "transports/whatsapp-cloud", kb: 1.2 },
  { id: "sently/transports/fallback", name: "transports/fallback", kb: 1.6 },
  { id: "sently/transports/plunk", name: "transports/plunk", kb: 1.8 },
  { id: "sently/transports/twilio-sms", name: "transports/twilio-sms", kb: 1.8 },
  { id: "sently/transports/sndr", name: "transports/sndr", kb: 2.5 },
  { id: "sently/transports/webpush", name: "transports/webpush", kb: 3.5 },
  { id: "sently/transports/fcm", name: "transports/fcm", kb: 3.5 },
  { id: "sently/transports/brevo", name: "transports/brevo", kb: 4.3 },
  { id: "sently/transports/resend", name: "transports/resend", kb: 5.0 },
  { id: "sently/transports/ses", name: "transports/ses", kb: 8.0 },
  { id: "sently/transports/smtp", name: "transports/smtp", kb: 11.0 },
  { id: "sently/transports/mailpit", name: "transports/mailpit", kb: 14.5 },
].sort((a, b) => a.kb - b.kb);

/** Bar scale — largest core ceiling (SMTP). */
const SCALE_KB = 15.8;

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
  },
};

function formatKb(kb: number): string {
  return `${kb.toFixed(1)} KB`;
}

function StatusDot({ ok = true }: { readonly ok?: boolean }): ReactNode {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        ok ? "bg-[var(--oke-el-gate)]" : "bg-fd-muted-foreground/50",
      )}
      title={ok ? "within budget" : "over budget"}
    />
  );
}

/**
 * Fill bar — self-animates on mount so collapsible panels (closed at load)
 * still get a visible fill when opened.
 */
function FillBar({
  widthPercent,
  index,
  className,
  trackClassName,
}: {
  readonly widthPercent: number;
  readonly index: number;
  readonly className?: string;
  readonly trackClassName?: string;
}): ReactNode {
  const width = Math.min(100, Math.max(widthPercent > 0 ? 4 : 0, widthPercent));
  return (
    <span
      className={cn(
        "relative mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-fd-border",
        trackClassName,
      )}
    >
      <motion.span
        className={cn("block h-full origin-left rounded-full", className)}
        style={{ width: `${width}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.06 + index * 0.03,
        }}
      />
    </span>
  );
}

function CapBar({ used, index }: { readonly used: number; readonly index: number }): ReactNode {
  return (
    <FillBar
      widthPercent={used}
      index={index}
      trackClassName="mt-3"
      className="bg-fd-foreground/75"
    />
  );
}

function RelativeBar({
  share,
  index,
  emphasis,
}: {
  readonly share: number;
  readonly index: number;
  readonly emphasis?: boolean;
}): ReactNode {
  return (
    <FillBar
      widthPercent={share}
      index={index}
      className={emphasis ? "bg-fd-foreground/85" : "bg-fd-foreground/55"}
    />
  );
}

/**
 * Toggle row for collapsing entrypoint / transport sub-lists.
 */
function CollapseSection({
  label,
  count,
  defaultOpen = false,
  children,
}: {
  readonly label: string;
  readonly count: number;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div data-panel-open={open ? "" : undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center gap-3 px-4 py-1.5 text-left sm:px-5",
          "font-mono text-[10px] tracking-[0.14em] text-fd-muted-foreground uppercase",
          "outline-none transition-colors hover:text-fd-foreground",
          "focus-visible:bg-fd-secondary/40",
        )}
      >
        <span className="h-px flex-1 bg-fd-border" />
        <span className="flex items-center gap-1.5">
          {label}
          <span className="tabular-nums text-fd-muted-foreground/70">({count})</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </span>
        <span className="h-px flex-1 bg-fd-border" />
      </button>
      {open ? <div id={panelId}>{children}</div> : null}
    </div>
  );
}

/**
 * Headline CI caps — big ceiling number, clear hard cap, short meaning.
 */
function CoreGrid(): ReactNode {
  return (
    <motion.ul
      variants={item}
      className="grid gap-px bg-fd-border @min-[32rem]:grid-cols-2 @min-[56rem]:grid-cols-4"
    >
      {CORE.map((metric, index) => (
        <motion.li
          key={metric.id}
          variants={item}
          className="flex min-w-0 flex-col bg-fd-card px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[11px] tracking-[0.14em] text-fd-muted-foreground uppercase">
              {metric.name}
            </span>
            <StatusDot />
          </div>
          <p className="mt-2 font-mono text-[1.65rem] leading-none tracking-tight text-fd-foreground tabular-nums sm:text-[1.85rem]">
            {formatKb(metric.kb)}
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-fd-muted-foreground tabular-nums">
            of {formatKb(metric.kb)}
            <span className="mx-1.5 text-fd-muted-foreground/40">·</span>
            100% used
          </p>
          <p className="mt-1 text-xs text-fd-muted-foreground">{metric.meaning}</p>
          <CapBar used={100} index={index} />
        </motion.li>
      ))}
    </motion.ul>
  );
}

/**
 * Typical stack baseline + collapsible channel entrypoints.
 */
function ExportList(): ReactNode {
  const baselineShare = (BASELINE.kb / SCALE_KB) * 100;

  return (
    <motion.div variants={item} className="bg-fd-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-fd-border px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[11px] tracking-[0.14em] text-fd-foreground uppercase">
          import a stack · or pick
        </span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground uppercase">
          gzip · vs smtp ceiling
        </span>
      </div>

      <div className="bg-fd-secondary/40 px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <div className="min-w-0">
            <span className="font-mono text-sm text-fd-foreground">{BASELINE.name}</span>
            {BASELINE.note ? (
              <span className="ml-2 font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground uppercase">
                {BASELINE.note}
              </span>
            ) : null}
          </div>
          <span className="flex shrink-0 items-center gap-2 font-mono text-sm tabular-nums">
            <StatusDot />
            <span className="text-fd-foreground">{formatKb(BASELINE.kb)}</span>
          </span>
        </div>
        <RelativeBar share={baselineShare} index={CORE.length} emphasis />
      </div>

      <CollapseSection label="or pick" count={EXPORT_ROWS.length} defaultOpen>
        <ul className="divide-y divide-fd-border border-t border-fd-border">
          {EXPORT_ROWS.map((row, index) => {
            const share = (row.kb / SCALE_KB) * 100;
            return (
              <li key={row.id} className="px-4 py-2 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 truncate font-mono text-xs text-fd-foreground">
                    {row.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                    <StatusDot />
                    <span className="text-fd-foreground">{formatKb(row.kb)}</span>
                    <span className="text-fd-muted-foreground">{Math.round(share)}%</span>
                  </span>
                </div>
                <RelativeBar share={share} index={CORE.length + 1 + index} />
              </li>
            );
          })}
        </ul>
      </CollapseSection>
    </motion.div>
  );
}

/**
 * Transports — one import per subpath, collapsed by default.
 */
function TransportsTable(): ReactNode {
  const barBase = CORE.length + 1 + EXPORT_ROWS.length;

  return (
    <motion.div variants={item} className="bg-fd-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-fd-border px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[11px] tracking-[0.14em] text-fd-foreground uppercase">
          sently/transports/*
        </span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground uppercase">
          gzip · vs smtp ceiling
        </span>
      </div>

      <CollapseSection label="transports" count={TRANSPORT_ROWS.length}>
        <p className="border-t border-fd-border px-4 py-1.5 font-mono text-[10px] tracking-[0.08em] text-fd-muted-foreground/80 uppercase sm:px-5">
          one transport per subpath · unused stay out
        </p>
        <ul className="divide-y divide-fd-border border-t border-fd-border">
          {TRANSPORT_ROWS.map((row, index) => {
            const share = (row.kb / SCALE_KB) * 100;
            return (
              <li key={row.id} className="px-4 py-2 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 truncate font-mono text-xs text-fd-foreground">
                    {row.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                    <StatusDot />
                    <span className="text-fd-foreground">{formatKb(row.kb)}</span>
                    <span className="text-fd-muted-foreground">{Math.round(share)}%</span>
                  </span>
                </div>
                <RelativeBar share={share} index={barBase + index} />
              </li>
            );
          })}
        </ul>
      </CollapseSection>
    </motion.div>
  );
}

/**
 * Measured budgets — hard caps + pickable entrypoints.
 */
export function EntrypointsGraph(): ReactNode {
  const reduced = useClientReducedMotion();

  return (
    <MotionConfig reducedMotion="never">
      <motion.div
        className="@container not-prose w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-fd-border bg-fd-card"
        variants={list}
        initial={reduced ? false : "hidden"}
        whileInView={reduced ? undefined : "show"}
        viewport={{ once: true, margin: "-8% 0px" }}
      >
        <motion.div
          variants={item}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-fd-border px-4 py-3 sm:px-5"
        >
          <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
            <span
              aria-hidden
              className="sently-dot-pulse size-1 rounded-full bg-fd-foreground/60"
            />
            CI budgets
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-fd-muted-foreground">
            hard caps · measured from{" "}
            <code className="text-fd-foreground/80">bundle-size-budgets.json</code>
          </span>
        </motion.div>

        <div className="flex flex-col gap-px bg-fd-border">
          <CoreGrid />
          <ExportList />
          <TransportsTable />
        </div>

        <motion.p
          variants={item}
          className="border-t border-fd-border px-4 py-2.5 font-mono text-[10px] tracking-[0.08em] text-fd-muted-foreground/80 uppercase sm:px-5"
        >
          CI-enforced gzip ceilings · isolated imports · unused transports stay out
        </motion.p>
      </motion.div>
    </MotionConfig>
  );
}
