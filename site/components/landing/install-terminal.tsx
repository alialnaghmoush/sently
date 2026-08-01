/**
 * Install terminal — tabbed CLI widget for the hero README band.
 * Commands mirror `site/content/docs/get-started/installation.mdx`.
 */

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type TerminalTab = {
  readonly id: string;
  readonly label: string;
  readonly commands: ReadonlyArray<string>;
  readonly output: ReadonlyArray<{ readonly label: string; readonly value: string }>;
};

const TABS: ReadonlyArray<TerminalTab> = [
  {
    id: "bun",
    label: "Bun",
    commands: ["bun add sently"],
    output: [
      { label: "email", value: "sently/mailer · sently/smtp" },
      { label: "channels", value: "sently/sms · sently/whatsapp · sently/push" },
    ],
  },
  {
    id: "npm",
    label: "npm",
    commands: ["npm install sently"],
    output: [
      { label: "runtime", value: "Node · Bun · Deno · Cloudflare Workers" },
      { label: "deps", value: "zero runtime dependencies" },
    ],
  },
  {
    id: "jsr",
    label: "JSR",
    commands: ["bunx jsr add @alialnaghmoush/sently"],
    output: [
      { label: "scope", value: "@alialnaghmoush/sently" },
      { label: "next", value: "pick a channel sender + transport" },
    ],
  },
];

/**
 * Terminal-styled tab strip with copyable commands.
 */
export function InstallTerminal() {
  const [activeId, setActiveId] = useState<string>(TABS[0]!.id);
  const [copied, setCopied] = useState(false);
  const active = TABS.find((tab) => tab.id === activeId) ?? TABS[0]!;

  async function copyCommands() {
    try {
      await navigator.clipboard.writeText(active.commands.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between gap-2 border-b border-fd-border pl-2">
        <div role="tablist" aria-label="Install commands" className="flex items-center">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active.id}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "px-3 py-2.5 font-mono text-[11px] tracking-wider uppercase transition-colors",
                tab.id === active.id
                  ? "text-fd-foreground"
                  : "text-fd-muted-foreground hover:text-fd-foreground/80",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void copyCommands()}
          className="mr-2 inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          aria-label="Copy commands"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="font-mono text-[13px] leading-relaxed text-fd-foreground">
          {active.commands.map((cmd) => (
            <div key={cmd}>
              <span className="text-fd-muted-foreground select-none">$ </span>
              {cmd}
            </div>
          ))}
        </div>
        <dl className="space-y-1 border-t border-fd-border pt-3">
          {active.output.map((row) => (
            <div key={row.label} className="flex gap-3 font-mono text-[11px]">
              <dt className="w-20 shrink-0 text-fd-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-fd-foreground/80">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
