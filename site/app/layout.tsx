import localFont from "next/font/local";
import { Provider } from "@/components/provider";
import { Topbar } from "@/components/chrome/topbar";
import { source } from "@/lib/source";
import type { Metadata } from "next";
import "./global.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sently.dev"),
  title: {
    default: "sently",
    template: "%s | sently",
  },
  description:
    "Runtime-agnostic messaging for Node.js, Bun, Deno, and Cloudflare Workers — email, SMS, WhatsApp, and push with pluggable transports.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "sently",
    title: "sently",
    description:
      "Runtime-agnostic messaging for Node.js, Bun, Deno, and Cloudflare Workers — email, SMS, WhatsApp, and push with pluggable transports.",
  },
  twitter: {
    card: "summary",
    title: "sently",
    description:
      "Runtime-agnostic messaging for Node.js, Bun, Deno, and Cloudflare Workers — email, SMS, WhatsApp, and push with pluggable transports.",
  },
};

/**
 * The header lives here, not in the per-surface layouts: its brand cell width is a
 * share of the surface below it, so it has to stay mounted across navigation for
 * that width — and the active tab marker — to animate rather than snap.
 */
export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>
          <Topbar tree={source.getPageTree()} />
          {children}
        </Provider>
      </body>
    </html>
  );
}
