/**
 * Transport brand marks (landing marquee, docs sidebar).
 * Paths from simple-icons (CC0) where available; compact monograms otherwise.
 * All marks use currentColor so they stay in the muted strip language.
 */

import {
  siBrevo,
  siCloudflare,
  siLoops,
  siMailgun,
  siMailtrap,
  siResend,
  siSparkpost,
  siWhatsapp,
} from "simple-icons";
import type { ReactNode } from "react";
import { InbucketLogoIcon } from "@/components/brands/inbucket-logo";
import { MailpitLogoIcon } from "@/components/brands/mailpit-logo";
import { SndrLogo, SndrLogoIcon } from "@/components/brands/sndr-logo";
import { TaqnyatLogo, TaqnyatLogoIcon } from "@/components/brands/taqnyat-logo";
import { WebPushLogoIcon } from "@/components/brands/webpush-logo";
import { cn } from "@/lib/cn";

type IconProps = {
  readonly className?: string;
  /** Brand color when live-verified / sponsor; muted for the strip default. */
  readonly tone?: "brand" | "muted";
};

/**
 * 24×24 filled path mark (simple-icons / custom brand paths).
 */
function PathIcon({
  path,
  className,
  fillRule,
}: IconProps & { readonly path: string; readonly fillRule?: "evenodd" | "nonzero" }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("block size-4 shrink-0", className)}
      aria-hidden
    >
      <path d={path} fillRule={fillRule} />
    </svg>
  );
}

/**
 * Letter chip for providers without a redistributable mark.
 */
function Monogram({ letters, className }: IconProps & { readonly letters: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-current/35 font-mono text-[8px] font-semibold leading-none tracking-tighter",
        letters.length > 2 && "text-[6.5px]",
        className,
      )}
    >
      {letters}
    </span>
  );
}

/** Twilio — historical simple-icons path (removed upstream for trademark). */
const TWILIO_PATH =
  "M12 0C5.381-.008.008 5.352 0 11.971V12c0 6.64 5.359 12 12 12 6.64 0 12-5.36 12-12 0-6.641-5.36-12-12-12zm0 20.801c-4.846.015-8.786-3.904-8.801-8.75V12c-.014-4.846 3.904-8.786 8.75-8.801H12c4.847-.014 8.786 3.904 8.801 8.75V12c.015 4.847-3.904 8.786-8.75 8.801H12zm5.44-11.76c0 1.359-1.12 2.479-2.481 2.479-1.366-.007-2.472-1.113-2.479-2.479 0-1.361 1.12-2.481 2.479-2.481 1.361 0 2.481 1.12 2.481 2.481zm0 5.919c0 1.36-1.12 2.48-2.481 2.48-1.367-.008-2.473-1.114-2.479-2.48 0-1.359 1.12-2.479 2.479-2.479 1.361-.001 2.481 1.12 2.481 2.479zm-5.919 0c0 1.36-1.12 2.48-2.479 2.48-1.368-.007-2.475-1.113-2.481-2.48 0-1.359 1.12-2.479 2.481-2.479 1.358-.001 2.479 1.12 2.479 2.479zm0-5.919c0 1.359-1.12 2.479-2.479 2.479-1.367-.007-2.475-1.112-2.481-2.479 0-1.361 1.12-2.481 2.481-2.481 1.358 0 2.479 1.12 2.479 2.481z";

/** SMTP @ mark. */
function SmtpIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={cn("block size-4 shrink-0", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M16.25 12a4.25 4.25 0 1 1-1.6-3.35" strokeLinecap="round" />
      <path d="M16.25 8.5V13a2 2 0 0 0 3.5 1.3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => ReactNode> = {
  Resend: (p) => <PathIcon path={siResend.path} {...p} />,
  SendGrid: (p) => <Monogram letters="SG" {...p} />,
  Postmark: (p) => <Monogram letters="PM" {...p} />,
  Mailgun: (p) => <PathIcon path={siMailgun.path} {...p} />,
  "AWS SES": (p) => <Monogram letters="AWS" {...p} />,
  Brevo: (p) => <PathIcon path={siBrevo.path} {...p} />,
  SMTP: (p) => <SmtpIcon {...p} />,
  "Cloudflare Email": (p) => <PathIcon path={siCloudflare.path} {...p} />,
  SparkPost: (p) => <PathIcon path={siSparkpost.path} {...p} />,
  MailerSend: (p) => <Monogram letters="MS" {...p} />,
  Loops: (p) => <PathIcon path={siLoops.path} {...p} />,
  Plunk: (p) => <Monogram letters="PL" {...p} />,
  Mailtrap: (p) => <PathIcon path={siMailtrap.path} {...p} />,
  Mailpit: (p) => <MailpitLogoIcon tone={p.tone ?? "muted"} className={p.className} />,
  Inbucket: (p) => <InbucketLogoIcon tone={p.tone ?? "muted"} className={p.className} />,
  SNDR: (p) => <SndrLogoIcon tone={p.tone ?? "muted"} className={p.className} />,
  Twilio: (p) => <PathIcon path={TWILIO_PATH} {...p} />,
  Taqnyat: (p) => <TaqnyatLogoIcon tone={p.tone ?? "muted"} className={p.className} />,
  Msegat: (p) => <Monogram letters="MG" {...p} />,
  Unifonic: (p) => <Monogram letters="UF" {...p} />,
  "WhatsApp Cloud": (p) => <PathIcon path={siWhatsapp.path} {...p} />,
  "Web Push": (p) => <WebPushLogoIcon tone={p.tone ?? "muted"} className={p.className} />,
  FCM: (p) => <Monogram letters="FC" {...p} />,
};

/**
 * Full wordmarks used alone (no separate provider label).
 * Add a provider here when you have a redistributable logotype.
 */
const WORDMARKS: Record<string, (props: IconProps) => ReactNode> = {
  SNDR: (p) => (
    <SndrLogo
      tone={p.tone ?? "muted"}
      className={cn("h-3 w-auto", p.className)}
      aria-hidden
    />
  ),
  Taqnyat: (p) => (
    <TaqnyatLogo
      tone={p.tone ?? "muted"}
      className={cn(
        "h-3.5 w-auto",
        // Brand navy on light; white wordmark on dark (orange dots stay brand).
        (p.tone ?? "muted") === "brand" && "dark:text-white",
        p.className,
      )}
      aria-hidden
    />
  ),
};

/**
 * Brand / protocol mark for a transport label (icon slot next to text).
 *
 * @param name - Provider display name (must match marquee list)
 */
export function ProviderIcon({
  name,
  className,
  tone = "muted",
}: {
  readonly name: string;
  readonly className?: string;
  readonly tone?: "brand" | "muted";
}) {
  const Icon = ICONS[name];
  if (!Icon) return <Monogram letters={name.slice(0, 2).toUpperCase()} className={className} />;
  return Icon({ className, tone });
}

/**
 * Marquee / strip mark: wordmark alone when available, otherwise icon + expect a label.
 */
export function hasProviderWordmark(name: string): boolean {
  return name in WORDMARKS;
}

/**
 * Full wordmark for providers that ship one. Returns null when only an icon exists.
 */
export function ProviderWordmark({
  name,
  className,
  tone = "muted",
}: {
  readonly name: string;
  readonly className?: string;
  readonly tone?: "brand" | "muted";
}): ReactNode {
  const Logo = WORDMARKS[name];
  if (!Logo) return null;
  return Logo({ className, tone });
}
