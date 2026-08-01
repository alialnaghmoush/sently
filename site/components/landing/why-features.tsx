/**
 * Why-sently feature grid — library-not-platform points in the same
 * gap-px card language as the channels band. Inspired by better-notify's
 * feature strip; claims are sently-specific.
 */

import {
  Boxes,
  Feather,
  GitBranch,
  Layers,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type Feature = {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
};

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: "Channel-first",
    body: "Apps call createMailer / createSmsSender — not vendor SDKs. Swap the transport; call sites stay put.",
    icon: Layers,
  },
  {
    title: "Pluggable transports",
    body: "One provider per subpath. Resend today, SES tomorrow — same sender contract.",
    icon: Plug,
  },
  {
    title: "Every runtime",
    body: "Node, Bun, Deno, and Cloudflare Workers from one ESM package. Socket adapters where SMTP needs them.",
    icon: Boxes,
  },
  {
    title: "Tree-shakeable",
    body: "Import sently/mailer for HTTP email (~6 KB gzip). SMTP, SMS, WhatsApp, and push stay out until you need them.",
    icon: Feather,
  },
  {
    title: "Composable path",
    body: "Retry, fallback, weighted failover, and idempotency wrap any transport without a new API.",
    icon: GitBranch,
  },
  {
    title: "Stable errors",
    body: "SentlyError with codes like RATE_LIMITED and BAD_REQUEST — catch by code, not string matching.",
    icon: ShieldCheck,
  },
];

/**
 * Six-up feature grid for the landing "why" band.
 */
export function WhyFeatures(): ReactNode {
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <li key={feature.title} className="flex flex-col gap-2.5 bg-fd-card px-5 py-5">
            <div className="flex items-center gap-2.5">
              <Icon className="size-4 text-fd-muted-foreground" aria-hidden strokeWidth={1.75} />
              <span className="text-sm font-medium">{feature.title}</span>
            </div>
            <p className="text-sm leading-relaxed text-pretty text-fd-muted-foreground">
              {feature.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
