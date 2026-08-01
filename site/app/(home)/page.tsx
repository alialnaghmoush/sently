/**
 * Homepage shell layout adapted from better-auth/better-auth `docs/app/page.tsx`
 * under the MIT License. Copyright (c) 2024 - present, Bereket Engida.
 * See site/NOTICE. Content is sently-original.
 */

import Link from "next/link";
import { Band, BandHeading } from "@/components/landing/band";
import { HeroCodeTour } from "@/components/landing/hero-code-tour";
import { HeroIntro } from "@/components/landing/hero-intro";
import { InstallTerminal } from "@/components/landing/install-terminal";
import { ProviderMarquee } from "@/components/landing/provider-marquee";
import { SendPipeline } from "@/components/landing/send-pipeline";
import { WhyFeatures } from "@/components/landing/why-features";

const CHANNELS: ReadonlyArray<{
  readonly href: string;
  readonly title: string;
  readonly sender: string;
  readonly body: string;
  readonly providers: ReadonlyArray<string>;
}> = [
  {
    href: "/docs/channels/email",
    title: "Email",
    sender: "createMailer",
    body: "SMTP or HTTP providers — Resend, SES, SendGrid, and more.",
    providers: ["Resend", "SMTP", "SES", "SendGrid", "Postmark", "Mailgun"],
  },
  {
    href: "/docs/channels/sms",
    title: "SMS",
    sender: "createSmsSender",
    body: "Twilio, Taqnyat, Msegat, Unifonic — one sender contract.",
    providers: ["Twilio", "Taqnyat", "Msegat", "Unifonic"],
  },
  {
    href: "/docs/channels/whatsapp",
    title: "WhatsApp",
    sender: "createWhatsAppSender",
    body: "Cloud API or Taqnyat — templates and text.",
    providers: ["WhatsApp Cloud", "Taqnyat"],
  },
  {
    href: "/docs/channels/push",
    title: "Push",
    sender: "createPushSender",
    body: "Web Push (VAPID) or FCM device tokens.",
    providers: ["Web Push", "FCM"],
  },
];

const START_HERE: ReadonlyArray<{
  readonly href: string;
  readonly title: string;
  readonly body: string;
}> = [
  {
    href: "/docs/get-started/introduction",
    title: "Introduction",
    body: "Channel-first messaging — apps use sently, not vendor SDKs.",
  },
  {
    href: "/docs/get-started/installation",
    title: "Installation",
    body: "Install from npm or JSR, then pick a channel.",
  },
  {
    href: "/docs/quick-start",
    title: "Quick start",
    body: "Send your first message with a transport.",
  },
];

export default function HomePage() {
  return (
    <div id="hero" className="relative text-fd-foreground">
      <section className="overflow-x-clip border-b border-fd-border">
        <div className="flex flex-col lg:flex-row">
          <HeroIntro />
          <div className="flex w-full items-center px-5 py-10 sm:px-8 lg:w-[52%] lg:py-16">
            <HeroCodeTour />
          </div>
        </div>
      </section>

      <ProviderMarquee />

      <Band label="readme">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base">
              Apps use <strong className="font-medium text-fd-foreground">sently channel senders</strong>,
              not vendor SDKs. Providers are transports under those senders — swap Resend for SES, or
              Twilio for Taqnyat, without rewriting your call sites.
            </p>
            <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base">
              Tree-shakeable subpaths keep HTTP email around ~6 KB gzip. SMTP, DKIM, OAuth2, pooling,
              plugins, idempotency, and webhook parsers ship in the same package.
            </p>
          </div>
          <InstallTerminal />
        </div>
      </Band>

      <Band label="why">
        <div className="flex flex-col gap-8">
          <BandHeading title="A library, not a platform">
            No dashboard, no per-send pricing, no vendor lock-in. Define senders in code, plug a
            transport, and let the type system keep call sites honest across every runtime.
          </BandHeading>
          <WhyFeatures />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-y border-fd-border text-left text-sm">
              <thead>
                <tr className="border-b border-fd-border text-fd-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Concern</th>
                  <th className="py-2.5 pr-4 font-medium">Typical stack</th>
                  <th className="py-2.5 font-medium">sently</th>
                </tr>
              </thead>
              <tbody className="text-fd-muted-foreground">
                <tr className="border-b border-fd-border/60">
                  <td className="py-2.5 pr-4 text-fd-foreground">Runtimes</td>
                  <td className="py-2.5 pr-4">Node only</td>
                  <td className="py-2.5">Node · Bun · Deno · CF Workers</td>
                </tr>
                <tr className="border-b border-fd-border/60">
                  <td className="py-2.5 pr-4 text-fd-foreground">Channels</td>
                  <td className="py-2.5 pr-4">Email (+ separate SDKs)</td>
                  <td className="py-2.5">Email · SMS · WhatsApp · Push</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-fd-foreground">Providers</td>
                  <td className="py-2.5 pr-4">Vendor clients in app code</td>
                  <td className="py-2.5">Pluggable transports</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Band>

      <Band label="pipeline">
        <div className="flex flex-col gap-6">
          <BandHeading title="One flow. Every channel.">
            Every send follows the same path: pick a channel sender, pass a transport, call{" "}
            <code className="text-fd-foreground">send</code>. Hooks observe; decorators strengthen
            the path without a new API.
          </BandHeading>
          <SendPipeline />
        </div>
      </Band>

      <Band label="channels">
        <div className="flex flex-col gap-6">
          <BandHeading title="Same model. Any channel.">
            Pick a sender for the channel. Pass a transport for the provider. Vendor extras (OTP
            helpers, account utilities) stay on the concrete transport — never on the shared
            contract.
          </BandHeading>
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2">
            {CHANNELS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-full flex-col gap-2 bg-fd-card px-5 py-5 transition-colors hover:bg-fd-secondary/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground uppercase">
                      ready
                    </span>
                  </div>
                  <span className="font-mono text-xs text-fd-foreground/70">{item.sender}</span>
                  <span className="text-sm text-fd-muted-foreground">{item.body}</span>
                  <span className="mt-1 font-mono text-[11px] text-fd-muted-foreground/80">
                    {item.providers.join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band label="entrypoints">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <BandHeading title="Import only what you need">
            HTTP email from <code className="text-fd-foreground">sently/mailer</code>. SMTP from{" "}
            <code className="text-fd-foreground">sently/smtp</code>. SMS, WhatsApp, and push from
            their own subpaths. Each transport is a separate entry so unused providers stay out of
            the bundle.
          </BandHeading>
          <dl className="flex flex-col divide-y divide-fd-border border-y border-fd-border">
            {[
              { path: "sently/mailer", use: "Custom / HTTP email transports" },
              { path: "sently/smtp", use: "Host, pool, adapters, DKIM" },
              { path: "sently/sms", use: "SMS channel sender" },
              { path: "sently/whatsapp", use: "WhatsApp channel sender" },
              { path: "sently/push", use: "Web Push channel sender" },
              { path: "sently/transports/*", use: "One provider per subpath" },
            ].map((row) => (
              <div
                key={row.path}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <dt className="font-mono text-xs text-fd-foreground">{row.path}</dt>
                <dd className="text-xs text-fd-muted-foreground">{row.use}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Band>

      <Band label="start here">
        <div className="flex flex-col gap-8">
          <BandHeading title="Learn the channel model once">
            Sender → transport → send. The same shape for every channel; only the options and
            providers change.
          </BandHeading>
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-3">
            {START_HERE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-full flex-col gap-1 bg-fd-card px-5 py-4 transition-colors hover:bg-fd-secondary/40"
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm text-fd-muted-foreground">{item.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Band>
    </div>
  );
}
