/**
 * Homepage shell layout adapted from better-auth/better-auth `docs/app/page.tsx`
 * under the MIT License. Copyright (c) 2024 - present, Bereket Engida.
 * See site/NOTICE. Content is sently-original.
 */

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Mail,
  MessageSquare,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { AiOnboardButton } from "@/components/landing/ai-onboard-button";
import { Band, BandHeading } from "@/components/landing/band";
import { EntrypointsGraph } from "@/components/landing/entrypoints-graph";
import { HeroCodeTour } from "@/components/landing/hero-code-tour";
import { HeroIntro } from "@/components/landing/hero-intro";
import { InstallTerminal } from "@/components/landing/install-terminal";
import { ProofStrip } from "@/components/landing/proof-strip";
import { ProviderMarquee } from "@/components/landing/provider-marquee";
import { Reveal } from "@/components/landing/reveal";
import { SendPipeline } from "@/components/landing/send-pipeline";
import { StackCompare } from "@/components/landing/stack-compare";
import { WhyFeatures } from "@/components/landing/why-features";

const CHANNELS: ReadonlyArray<{
  readonly href: string;
  readonly title: string;
  readonly sender: string;
  readonly body: string;
  readonly providers: ReadonlyArray<string>;
  readonly icon: LucideIcon;
}> = [
  {
    href: "/docs/channels/email",
    title: "Email",
    sender: "createMailer",
    body: "SMTP or HTTP providers — Resend, SES, SendGrid, and more.",
    providers: ["Resend", "SMTP", "SES", "SendGrid", "Postmark", "Mailgun"],
    icon: Mail,
  },
  {
    href: "/docs/channels/sms",
    title: "SMS",
    sender: "createSmsSender",
    body: "Twilio, Taqnyat, Msegat, Unifonic — one sender contract.",
    providers: ["Twilio", "Taqnyat", "Msegat", "Unifonic"],
    icon: MessageSquare,
  },
  {
    href: "/docs/channels/whatsapp",
    title: "WhatsApp",
    sender: "createWhatsAppSender",
    body: "Cloud API or Taqnyat — templates and text.",
    providers: ["WhatsApp Cloud", "Taqnyat"],
    icon: MessagesSquare,
  },
  {
    href: "/docs/channels/push",
    title: "Push",
    sender: "createPushSender",
    body: "Web Push (VAPID) or FCM device tokens.",
    providers: ["Web Push", "FCM"],
    icon: Bell,
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
    body: "What sently is — and what it is not.",
  },
  {
    href: "/docs/get-started/installation",
    title: "Installation",
    body: "Install from npm or JSR, then pick a channel.",
  },
  {
    href: "/docs/channels",
    title: "Channels",
    body: "Email, SMS, WhatsApp, and push docs.",
  },
];

export default function HomePage() {
  return (
    <main id="hero" className="relative text-fd-foreground">
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
        <div className="flex flex-col gap-10 lg:gap-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <div className="flex h-full flex-col justify-center gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                  Channel senders, not vendor SDKs
                </h2>
                <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base">
                  Apps call <code className="text-fd-foreground">createMailer</code>,{" "}
                  <code className="text-fd-foreground">createSmsSender</code>,{" "}
                  <code className="text-fd-foreground">createWhatsAppSender</code>, or{" "}
                  <code className="text-fd-foreground">createPushSender</code>. Providers are
                  transports under those senders.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <InstallTerminal />
            </Reveal>
          </div>
          <Reveal delay={0.05} className="border-t border-fd-border pt-8 lg:pt-10">
            <ProofStrip />
          </Reveal>
        </div>
      </Band>

      <Band label="why">
        <div className="flex flex-col gap-8">
          <Reveal>
            <BandHeading title="Why teams outgrow a single SDK">
              The pain is not sending once — it is keeping call sites stable as channels and
              providers change.
            </BandHeading>
          </Reveal>
          <WhyFeatures />
          <Reveal>
            <StackCompare />
          </Reveal>
          <Reveal delay={0.05}>
            <p className="max-w-3xl text-sm leading-relaxed text-pretty text-fd-muted-foreground">
              <strong className="font-medium text-fd-foreground">A library, not a platform.</strong>{" "}
              Preference centers, digests, and workflow builders (custom or Novu, Knock, Courier)
              sit on top of sently — not instead of it.
            </p>
          </Reveal>
        </div>
      </Band>

      <Band label="pipeline">
        <div className="flex flex-col gap-6">
          <Reveal>
            <BandHeading title="App → channel sender → transport">
              Pass a provider transport into the sender, then call{" "}
              <code className="text-fd-foreground">send</code>. Hooks observe; decorators add retry
              and fallback without a new API.
            </BandHeading>
          </Reveal>
          <SendPipeline />
        </div>
      </Band>

      <Band label="channels">
        <div className="flex flex-col gap-6">
          <Reveal>
            <BandHeading title="Four channels. Same shape.">
              Vendor extras (OTP helpers, account utilities) stay on the concrete transport — never
              on the shared sender contract.
            </BandHeading>
          </Reveal>
          <Reveal delay={0.05}>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2">
              {CHANNELS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex h-full flex-col gap-2 bg-fd-card px-5 py-5 transition-colors hover:bg-fd-secondary/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5">
                          <Icon
                            aria-hidden
                            strokeWidth={1.75}
                            className="size-4 text-fd-muted-foreground transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:text-fd-foreground"
                          />
                          <span className="text-sm font-medium">{item.title}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-fd-muted-foreground uppercase">
                          <span
                            aria-hidden
                            className="sently-dot-pulse size-1 rounded-full bg-fd-foreground/60"
                          />
                          ready
                        </span>
                      </div>
                      <span className="font-mono text-xs text-fd-foreground/70">{item.sender}</span>
                      <span className="text-sm text-fd-muted-foreground">{item.body}</span>
                      <span className="mt-1 flex items-center justify-between gap-3 font-mono text-[11px] text-fd-muted-foreground/80">
                        <span>{item.providers.join(" · ")}</span>
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 shrink-0 translate-y-1 text-fd-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </Band>

      <Band label="budgets">
        <div className="flex flex-col gap-6">
          <Reveal>
            <BandHeading title="Measured, not marketed">
              Four hard caps CI fails on — HTTP stack, SMTP, SMS, and push — then channel
              entrypoints and <code className="text-fd-foreground">sently/transports/*</code> as
              pickable imports. Every figure is from{" "}
              <code className="text-fd-foreground">bundle-size-budgets.json</code>.
            </BandHeading>
          </Reveal>
          <Reveal delay={0.05}>
            <EntrypointsGraph />
          </Reveal>
        </div>
      </Band>

      <Band label="start here">
        <div className="flex flex-col gap-8">
          <Reveal>
            <BandHeading title="Start here">
              Install, pick a channel, send. Details live in the handbook.
            </BandHeading>
          </Reveal>
          <Reveal delay={0.05}>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-3">
              {START_HERE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex h-full flex-col gap-1 bg-fd-card px-5 py-4 transition-colors hover:bg-fd-secondary/40"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <ArrowUpRight
                        aria-hidden
                        className="size-3.5 translate-x-1 translate-y-1 text-fd-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                      />
                    </span>
                    <span className="text-sm text-fd-muted-foreground">{item.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Band>

      <Band label="ship">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl border border-fd-border px-6 py-12 sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-16 size-[26rem] rounded-full bg-fd-foreground/[0.03] blur-3xl dark:bg-fd-foreground/[0.045]"
            />
            <div className="relative z-[1] flex flex-col gap-6">
              <p className="font-mono text-[11px] tracking-[0.12em] text-fd-muted-foreground uppercase">
                <span className="select-none">$ </span>bun add sently
              </p>
              <h2 className="max-w-[20ch] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Send your first message in five minutes
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-pretty text-fd-muted-foreground sm:text-base">
                Install sently, pick a channel sender, pass a transport. Five lines to the first
                send.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/docs/get-started/installation"
                  className="group inline-flex items-center bg-fd-foreground px-5 py-2.5 text-sm font-medium text-fd-background transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight
                    aria-hidden
                    className="ml-2 size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
                <AiOnboardButton />
              </div>
            </div>
          </div>
        </Reveal>
      </Band>
    </main>
  );
}
