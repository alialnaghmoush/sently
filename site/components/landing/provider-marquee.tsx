/**
 * Infinite provider strip — inspired by better-notify's "Works with" marquee,
 * rendered in sently's border / mono label language with brand marks.
 */

import type { ReactNode } from "react";
import { ProviderIcon } from "@/components/landing/provider-icons";

const PROVIDERS: ReadonlyArray<string> = [
  "Resend",
  "SendGrid",
  "Postmark",
  "Mailgun",
  "AWS SES",
  "Brevo",
  "SMTP",
  "Cloudflare Email",
  "SparkPost",
  "MailerSend",
  "Loops",
  "Plunk",
  "Mailtrap",
  "SNDR",
  "Twilio",
  "Taqnyat",
  "Msegat",
  "WhatsApp Cloud",
  "Web Push",
];

/**
 * One marquee chip — icon + uppercase label.
 */
function ProviderChip({ name }: { readonly name: string }): ReactNode {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-fd-muted-foreground uppercase whitespace-nowrap">
      <ProviderIcon name={name} />
      {name}
    </span>
  );
}

/**
 * Full-bleed scrolling list of transport names. Pauses under
 * `prefers-reduced-motion` via CSS (see `.sently-marquee` in global.css).
 */
export function ProviderMarquee(): ReactNode {
  const row = (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
      {PROVIDERS.map((name) => (
        <li key={name}>
          <ProviderChip name={name} />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Supported transports"
      className="overflow-hidden border-b border-fd-border"
    >
      <div className="flex items-center gap-2 border-b border-fd-border px-5 py-3 sm:px-8">
        <span aria-hidden className="size-1 rounded-full bg-fd-muted-foreground/60" />
        <span className="font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
          transports
        </span>
      </div>
      <div className="relative py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-linear-to-r from-fd-background to-transparent sm:w-16 motion-reduce:hidden"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-linear-to-l from-fd-background to-transparent sm:w-16 motion-reduce:hidden"
        />
        <div className="sently-marquee flex w-max motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-8 motion-reduce:gap-y-3 motion-reduce:px-5 sm:motion-reduce:px-8">
          {row}
          <ul
            className="flex shrink-0 items-center gap-8 pr-8 motion-reduce:hidden"
            aria-hidden
          >
            {PROVIDERS.map((name) => (
              <li key={`dup-${name}`}>
                <ProviderChip name={name} />
              </li>
            ))}
          </ul>
        </div>
        <ul className="sr-only">
          {PROVIDERS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
