import type { ReactNode } from "react";
import { HostingerLogo } from "@/components/brands/hostinger-logo";
import { InbucketLogo } from "@/components/brands/inbucket-logo";
import { MailpitLogo } from "@/components/brands/mailpit-logo";
import { SndrLogo } from "@/components/brands/sndr-logo";
import { TaqnyatLogo } from "@/components/brands/taqnyat-logo";
import { WebPushLogo } from "@/components/brands/webpush-logo";
import { cn } from "@/lib/cn";

type BrandBadge = {
  readonly shell: string;
  readonly mark: ReactNode;
};

/**
 * Full wordmark badges for transport docs pages that ship a redistributable logo.
 * Keyed by page title (frontmatter `title`).
 */
const BADGES: Record<string, BrandBadge> = {
  Taqnyat: {
    shell: "bg-white ring-fd-border/60 dark:bg-zinc-950",
    mark: <TaqnyatLogo className="h-7 w-auto" />,
  },
  SNDR: {
    shell: "bg-zinc-950 ring-fd-border/60 dark:bg-zinc-900",
    mark: <SndrLogo className="h-6 w-auto text-white" />,
  },
  Hostinger: {
    shell: "bg-white ring-fd-border/60 dark:bg-zinc-950",
    mark: <HostingerLogo className="h-5 w-auto" />,
  },
  Mailpit: {
    shell: "bg-zinc-950 ring-fd-border/60 dark:bg-zinc-900",
    // Dark shell in both themes — force the official white envelope.
    mark: <MailpitLogo className="h-7 w-auto [&_path:first-child]:fill-white" />,
  },
  Inbucket: {
    shell: "bg-white ring-fd-border/60 dark:bg-zinc-950",
    mark: <InbucketLogo className="h-7 w-auto" />,
  },
  "Web Push": {
    shell: "bg-white ring-fd-border/60 dark:bg-zinc-950",
    mark: <WebPushLogo className="h-7 w-auto" />,
  },
};

/**
 * Compact brand pill shown beside the docs page title.
 *
 * @param title - Page frontmatter title
 */
export function DocsBrandBadge({ title }: { readonly title: string }): ReactNode {
  const badge = BADGES[title];
  if (!badge) return null;

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-xl px-2.5 py-1.5 ring-1",
        badge.shell,
      )}
    >
      {badge.mark}
    </div>
  );
}
