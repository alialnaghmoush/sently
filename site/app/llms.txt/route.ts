import { source } from "@/lib/source";
import { llms } from "fumadocs-core/source";

export const revalidate = false;

/** Agent-facing lead block — kept ahead of the Fumadocs handbook index. */
const PREAMBLE = `Sently is an open-source TypeScript notification and messaging infrastructure library.

One npm package (\`sently\`) with tree-shakeable subpaths for Email, SMS, WhatsApp, and Push.
Apps use channel senders; providers are transports under those senders — not a message queue or hosted orchestration platform.

## For agents

- Channels — email, SMS, WhatsApp, push (see /docs/channels)
- Providers — pluggable transports under senders (see /docs/transports)
- Concepts — sender, transport, hooks, retry, webhooks
- Architecture — App → channel sender → transport (provider) → vendor API
- Examples — /docs/get-started
- Entrypoints — /docs/reference/entrypoints
- Common tasks — /docs/guides
- FAQ / compare — /docs/guides/compare

---

`;

export function GET() {
  return new Response(`${PREAMBLE}${llms(source).index()}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
