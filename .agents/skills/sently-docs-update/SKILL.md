---
name: sently-docs-update
description: Syncs existing sently site docs to match current source after a feature or API change. Use when the user says "/sently-docs update site docs", "/oke-docs update site docs", "update site docs", or asks to refresh documentation for work just implemented — without inventing APIs. Delegates page authoring rules to the sently-docs skill; does not bump versions or own the changelog.
---

# Sently Docs Update — sync site docs to source

Canonical user prompts:

```text
/sently-docs update site docs
/oke-docs update site docs
```

Also match plain: `update site docs`, `sync docs to source`, `refresh the docs page`.

**Not a new-page authoring skill.** For greenfield pages or full IA rewrites with no prior change context, use [sently-docs](../sently-docs/SKILL.md) directly.

## Immediately

1. **Read** [sently-docs](../sently-docs/SKILL.md) and follow its workflow for every page you touch (verify from source → skeleton → gates → before/after). Do not skip step 2 of sently-docs.
2. **Inventory** which docs are stale from this conversation / git diff — not the whole site.

## Inventory (required)

Map the change to pages that exist under `site/content/docs/`:

| Change surface                         | Primary page                 | Also check                                      |
| -------------------------------------- | ---------------------------- | ----------------------------------------------- |
| Channel sender (`src/sms.ts`, …)       | `channels/<channel>.mdx`     | `channels/index.mdx`, `reference/*-options` |
| Channel types (`src/core/*-types.ts`)  | matching `reference/*`       | channel page                                    |
| Transport (`src/transports/<name>.ts`) | `transports/<name>.mdx`      | `transports/index.mdx`, channel page            |
| Decorator (retry/fallback/preview/idempotency) | `decorators/<name>.mdx` | `decorators/index.mdx`, `channels/hooks.mdx` |
| Webhooks                               | `guides/webhooks.mdx`        | `reference/webhook-events.mdx`                  |
| Plugins / React                        | `guides/plugins-template` or `react-email` | channels/email                         |
| Adapters / pool / DKIM / OAuth2        | matching `guides/*`          | `get-started/runtimes.mdx`                      |
| Errors                                 | `reference/errors.mdx`       | affected transport pages                        |
| Package exports / entrypoints          | `reference/exports.mdx`      | `get-started/entrypoints.mdx`                   |
| MCP / llms                             | `ai/*`                       | —                                               |

If no page exists and the surface is public — **stop and ask** whether to create one via sently-docs (do not invent).

## Update rules

- Claims come from **current source**, never from the old page or chat memory.
- Prefer **rewrite the affected sections** over sprinkling notes.
- Fix **related** pages that would otherwise lie.
- Cross-links only to pages that exist; update `meta.json` when titles or descriptions go stale.
- **No changelog** unless the user also asked to ship.
- **No version bump.**

## Done checklist

```
Task:
- [ ] Pages inventory listed (primary + related)
- [ ] Each page verified against source (sently-docs step 2)
- [ ] Written to sently-docs skeleton / density / component rules
- [ ] From site/: bun test lib scripts  → 0 fail
- [ ] From site/: bunx fumadocs-mdx  → compiles
- [ ] Before/after summary for the user (sently-docs step 5)
```

## Authority

`AGENTS.md`: if documentation would claim something the source does not support, **stop and ask**.
