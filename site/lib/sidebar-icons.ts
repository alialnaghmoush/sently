import type { LoaderPlugin } from "fumadocs-core/source";
import { createElement, type ReactNode } from "react";
import { icons, type LucideIcon } from "lucide-react";
import { ProviderIcon } from "@/components/provider-icons";

/**
 * Lucide icon names keyed by docs URL path (better-auth sidebar-content pattern).
 */
const PATH_ICONS: Readonly<Record<string, keyof typeof icons>> = {
  "/docs": "BookOpen",
  "/docs/get-started": "Rocket",
  "/docs/get-started/introduction": "BookOpen",
  "/docs/get-started/why": "Compass",
  "/docs/get-started/installation": "Download",
  "/docs/get-started/basic-usage": "SquareTerminal",
  "/docs/decorators": "Layers",
  "/docs/decorators/preview": "Eye",
  "/docs/decorators/retry": "RotateCw",
  "/docs/decorators/fallback": "GitBranch",
  "/docs/decorators/weighted-fallback": "Scale",
  "/docs/decorators/idempotency": "KeyRound",
  "/docs/elements": "Boxes",
  "/docs/elements/flow": "Workflow",
  "/docs/elements/signal": "Radio",
  "/docs/elements/store": "Database",
  "/docs/elements/clock": "Clock",
  "/docs/elements/gate": "ShieldCheck",
  "/docs/elements/vault": "KeyRound",
  "/docs/elements/channel": "Mail",
  "/docs/elements/ai": "Bot",
  "/docs/console": "LayoutDashboard",
  "/docs/console/overview": "Activity",
  "/docs/console/flows": "GitBranch",
  "/docs/console/signals": "Radio",
  "/docs/console/store": "Database",
  "/docs/console/clock": "Clock",
  "/docs/console/gates": "Shield",
  "/docs/console/vault": "KeyRound",
  "/docs/console/channels": "Mailbox",
  "/docs/console/ai": "Sparkles",
  "/docs/console/architecture": "Network",
  "/docs/console/traces": "Route",
  "/docs/console/runs": "Play",
  "/docs/console/manifest-diff": "Diff",
  "/docs/console/access": "Users",
  "/docs/console/plugins": "Puzzle",
  "/docs/console/privacy": "EyeOff",
  "/docs/console/tenancy": "Building2",
  "/docs/reference": "BookMarked",
  "/docs/reference/plugins": "Puzzle",
  "/docs/reference/cli": "Terminal",
  "/docs/reference/security": "Shield",
  "/docs/plugins": "Puzzle",
  "/docs/plugins/compression": "Shrink",
  "/docs/plugins/cors": "Globe",
  "/docs/plugins/csrf": "ShieldAlert",
  "/docs/plugins/username": "UserRound",
  "/docs/plugins/anonymous": "UserRoundMinus",
  "/docs/plugins/magic-link": "Link2",
  "/docs/plugins/email-otp": "MailCheck",
  "/docs/plugins/phone-number": "Smartphone",
  "/docs/plugins/two-factor": "LockKeyhole",
  "/docs/plugins/passkey": "FingerprintPattern",
  "/docs/plugins/ip-allowlist": "ListChecks",
  "/docs/plugins/maintenance-mode": "Construction",
  "/docs/plugins/headers": "ShieldCheck",
  "/docs/ai": "Bot",
  "/docs/ai/mcp": "Plug",
  "/docs/ai/skills": "Sparkles",
  "/docs/ai/llms-txt": "FileText",
  "/docs/reference/configuration": "Settings",
  "/docs/reference/fx": "Braces",
  "/docs/reference/i18n": "Languages",
  "/docs/reference/environment-variables": "Variable",
  "/docs/reference/errors": "CircleAlert",
};

/**
 * Transport brand marks keyed by docs URL path. Values are provider display
 * names from the shared ProviderIcon registry (also used by the landing marquee).
 */
const TRANSPORT_ICONS: Readonly<Record<string, string>> = {
  "/docs/transports/smtp": "SMTP",
  "/docs/transports/resend": "Resend",
  "/docs/transports/sendgrid": "SendGrid",
  "/docs/transports/postmark": "Postmark",
  "/docs/transports/mailgun": "Mailgun",
  "/docs/transports/ses": "AWS SES",
  "/docs/transports/brevo": "Brevo",
  "/docs/transports/mailersend": "MailerSend",
  "/docs/transports/plunk": "Plunk",
  "/docs/transports/sparkpost": "SparkPost",
  "/docs/transports/mailtrap": "Mailtrap",
  "/docs/transports/mailpit": "Mailpit",
  "/docs/transports/loops": "Loops",
  "/docs/transports/cloudflare-email": "Cloudflare Email",
  "/docs/transports/sndr": "SNDR",
  "/docs/transports/taqnyat-mail": "Taqnyat",
  "/docs/transports/twilio-sms": "Twilio",
  "/docs/transports/taqnyat-sms": "Taqnyat",
  "/docs/transports/msegat": "Msegat",
  "/docs/transports/unifonic": "Unifonic",
  "/docs/transports/whatsapp-cloud": "WhatsApp Cloud",
  "/docs/transports/taqnyat-whatsapp": "Taqnyat",
  "/docs/transports/webpush": "Web Push",
  "/docs/transports/fcm": "FCM",
};

/** Folder display name → docs path for icon lookup. */
const FOLDER_PATHS: Readonly<Record<string, string>> = {
  Documentation: "/docs",
  "Get Started": "/docs/get-started",
  "Get started": "/docs/get-started",
  Decorators: "/docs/decorators",
  Transports: "/docs/transports",
  Channels: "/docs/channels",
  Elements: "/docs/elements",
  Console: "/docs/console",
  Reference: "/docs/reference",
  Plugins: "/docs/plugins",
  "AI Resources": "/docs/ai",
};

/**
 * Resolve an icon element for a docs path: transport brand mark first,
 * then the Lucide map.
 *
 * @param path - Absolute docs URL path
 */
function iconForPath(path: string | undefined): ReactNode {
  if (!path) return undefined;
  const provider = TRANSPORT_ICONS[path];
  if (provider) return createElement(ProviderIcon, { name: provider });
  const name = PATH_ICONS[path];
  if (!name) return undefined;
  const Icon = icons[name] as LucideIcon | undefined;
  if (!Icon) return undefined;
  return createElement(Icon, { className: "size-4" });
}

/**
 * Loader plugin that attaches Lucide icons to the page tree (folder + page).
 * Frontmatter icons alone are not always wired into the tree in Fumadocs MDX;
 * this mirrors better-auth's explicit sidebar icon map.
 */
export function sidebarIconsPlugin(): LoaderPlugin {
  return {
    name: "oke:sidebar-icons",
    transformPageTree: {
      file(node) {
        if (node.url) {
          const icon = iconForPath(node.url);
          if (icon) node.icon = icon;
        }
        return node;
      },
      folder(node) {
        const name = typeof node.name === "string" ? node.name : undefined;
        const path = name ? FOLDER_PATHS[name] : undefined;
        const icon = iconForPath(path);
        if (icon) node.icon = icon;
        return node;
      },
    },
  };
}
