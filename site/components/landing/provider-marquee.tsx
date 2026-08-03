/**
 * Infinite provider strip — inspired by better-notify's "Works with" marquee,
 * rendered in sently's border / mono label language with brand marks.
 *
 * Visual tiers:
 * - `sponsor` — distinctive colored mark (reserved; none yet)
 * - `verified` — brand color; proven against a real provider API
 * - `available` — muted; transport exists, not live-tested here
 */

import { BadgeCheck, CircleDashed, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ProviderIcon } from "@/components/provider-icons";
import { cn } from "@/lib/cn";

/** How a transport appears in the homepage strip. */
type ProviderStatus = "sponsor" | "verified" | "available";

type ProviderEntry = {
  readonly name: string;
  readonly status: ProviderStatus;
};

/**
 * Marquee order: a short available lead-in (~25%), then sponsors / live
 * verified, then the rest. Priority marks must not sit at index 0 — on
 * refresh the strip starts at the left edge and those chips would exit first.
 */
function orderProviders(entries: ReadonlyArray<ProviderEntry>): ProviderEntry[] {
  const priority = entries.filter((e) => e.status === "sponsor" || e.status === "verified");
  const available = entries.filter((e) => e.status === "available");
  const leadCount = Math.max(1, Math.round(available.length * 0.25));
  return [
    ...available.slice(0, leadCount),
    ...priority,
    ...available.slice(leadCount),
  ];
}

/**
 * Only mark `verified` when an opt-in live suite (or equivalent) has passed.
 * `sponsor` is reserved for future partner marks — keep empty until then.
 */
const PROVIDERS: ReadonlyArray<ProviderEntry> = orderProviders([
  { name: "Resend", status: "available" },
  { name: "SendGrid", status: "available" },
  { name: "Postmark", status: "available" },
  { name: "Mailgun", status: "available" },
  { name: "AWS SES", status: "available" },
  { name: "Brevo", status: "available" },
  { name: "SMTP", status: "available" },
  { name: "Cloudflare Email", status: "available" },
  { name: "SparkPost", status: "available" },
  { name: "MailerSend", status: "available" },
  { name: "Loops", status: "available" },
  { name: "Plunk", status: "available" },
  { name: "Mailtrap", status: "available" },
  { name: "Mailpit", status: "verified" },
  { name: "Inbucket", status: "verified" },
  { name: "SNDR", status: "verified" },
  { name: "Hostinger", status: "verified" },
  { name: "Twilio", status: "available" },
  { name: "Taqnyat", status: "verified" },
  { name: "Msegat", status: "available" },
  { name: "Unifonic", status: "available" },
  { name: "WhatsApp Cloud", status: "available" },
  { name: "Web Push", status: "verified" },
  { name: "FCM", status: "available" },
]);

function markTone(status: ProviderStatus): "brand" | "muted" {
  return status === "available" ? "muted" : "brand";
}

/**
 * One marquee chip — always icon + uppercase label (one rhythm).
 * Verified / sponsor differ by brand-colored mark + slightly brighter label.
 * Full wordmarks stay on docs pages; mixing them here made SNDR read larger than Taqnyat.
 */
function ProviderChip({ name, status }: ProviderEntry): ReactNode {
  const tone = markTone(status);
  const title =
    status === "verified"
      ? `${name} — live verified`
      : status === "sponsor"
        ? `${name} — sponsor`
        : name;

  return (
    <span
      title={title}
      className={cn(
        "flex h-5 items-center gap-2 font-mono text-[11px] leading-none tracking-[0.12em] uppercase whitespace-nowrap",
        status === "available"
          ? "text-fd-muted-foreground"
          : "text-fd-foreground/85",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <ProviderIcon name={name} tone={tone} />
      </span>
      {name}
    </span>
  );
}

function ProviderRow({
  keyPrefix,
}: {
  readonly keyPrefix: string;
}): ReactNode {
  return (
    <ul className="flex h-5 shrink-0 items-center gap-8 pr-8" aria-hidden>
      {PROVIDERS.map((entry) => (
        <li key={`${keyPrefix}-${entry.name}`} className="flex items-center">
          <ProviderChip {...entry} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Full-bleed scrolling list of transport names. Pauses under
 * `prefers-reduced-motion` via CSS (see `.sently-marquee` in global.css).
 */
export function ProviderMarquee(): ReactNode {
  return (
    <section
      aria-label="Supported transports"
      className="overflow-hidden border-b border-fd-border"
    >
      <div className="flex flex-col gap-2 border-b border-fd-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-1 rounded-full bg-fd-muted-foreground/60" />
          <span className="font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
            transports
          </span>
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] tracking-[0.08em] text-fd-muted-foreground uppercase">
          <li className="flex items-center gap-1.5">
            <BadgeCheck
              aria-hidden
              className="size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
              strokeWidth={2.25}
            />
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-[#F48022]"
            />
            <span className="text-fd-foreground/85">live verified</span>
          </li>
          <li aria-hidden className="text-fd-muted-foreground/35">
            ·
          </li>
          <li className="flex items-center gap-1.5">
            <CircleDashed
              aria-hidden
              className="size-3.5 shrink-0 text-fd-muted-foreground/70"
              strokeWidth={2}
            />
            <span>available</span>
          </li>
          <li aria-hidden className="text-fd-muted-foreground/35">
            ·
          </li>
          <li className="flex items-center gap-1.5">
            <Sparkles
              aria-hidden
              className="size-3.5 shrink-0 text-amber-500/90 dark:text-amber-400/85"
              strokeWidth={2}
            />
            <span>sponsors soon</span>
          </li>
        </ul>
      </div>
      {/*
        Left-aligned track (not centered) so the strip always edge-to-edge.
        Two identical rows — CSS translates -50% for a seamless loop.
        Keep both rows under reduced-motion so the viewport never shows a gap.
      */}
      <div className="relative overflow-hidden py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-1 w-10 bg-linear-to-r from-fd-background to-transparent sm:w-16"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-1 w-10 bg-linear-to-l from-fd-background to-transparent sm:w-16"
        />
        <div className="sently-marquee flex w-max">
          <ProviderRow keyPrefix="a" />
          <ProviderRow keyPrefix="b" />
        </div>
        <ul className="sr-only">
          {PROVIDERS.map((entry) => (
            <li key={entry.name}>
              {entry.name}
              {entry.status === "verified"
                ? " (live verified)"
                : entry.status === "sponsor"
                  ? " (sponsor)"
                  : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
