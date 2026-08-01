---
name: sently-docs
description: Authors and rewrites sently documentation pages under site/content/docs to the project's information-architecture standard — source-verified API claims, the progressive-disclosure page skeleton (plain intro, one rule, Quick start Steps, reference tables, Troubleshooting Accordions, Next cards), and the site's hard gates (prose density ≤3, fumadocs components). Use when creating a new docs page, editing or improving any page under site/content/docs (get-started, channels, transports, guides, reference, ai), or when the user asks to raise documentation quality. For the prompt "/sently-docs update site docs" or "/oke-docs update site docs" after an implementation, use the sently-docs-update skill (it inventories stale pages then applies this standard).
---

# Sently Docs — information architecture standard

Rewrite or author docs pages for the channel-first messaging handbook (canonical examples: `site/content/docs/channels/email.mdx`, `get-started/introduction.mdx`). The goal: a page an ordinary user can learn from, where every claim is true in the source code.

**After a code change**, when the user says `/sently-docs update site docs` (or `/oke-docs update site docs`), load [sently-docs-update](../sently-docs-update/SKILL.md) first — it picks which pages to sync, then this skill’s rules apply to each page.

## The workflow

Follow this order — never skip step 2.

1. **Read the current page fully.** Salvage what is accurate; list what is wrong, missing, or internal-facing.
2. **Verify the API surface from source.** Docs claims come from code, never from memory or from the old page. Sources of truth:
   - Channel senders: `src/mailer.ts`, `src/smtp-mailer.ts`, `src/sms.ts`, `src/whatsapp.ts`, `src/push.ts`
   - Channel contracts: `src/core/types.ts`, `src/core/sms-types.ts`, `src/core/whatsapp-types.ts`, `src/core/push-types.ts`
   - Transports: `src/transports/<name>.ts` + `package.json` `exports` (only document exported subpaths)
   - Errors: `src/errors.ts`, `src/core/errors.ts`, per-transport error classes
   - Webhooks: `src/webhooks.ts`, `src/webhooks/*`
   - Cross-link targets must exist under `site/content/docs/`
   - **Correct the old page when it lies**
3. **Write with the skeleton** — copy [skeleton.md](skeleton.md) and fill it.
4. **Run the gates** (below) and fix every failure.
5. **Close with a before/after summary** — what was wrong, what changed, what was verified against which file.

## Page architecture (fixed order)

1. **Frontmatter** — `title`, `description` (one plain sentence: what it is + when you touch it), `icon`, `source` (repo path, e.g. `src/sms.ts` or `README.md`).
2. **Intro paragraph** — 2–3 lines, ordinary words: what this is for, named concretely ("the order-confirmation SMS", not "human reach"). No theory.
3. **"The one rule" Callout** — the single user-facing law, phrased as what the _user_ must do.
4. **Quick start** — `<Steps>` that complete a _full loop_ (configure → send → see the result). Working code with real imports and option names.
5. **Reference tables** — options with types, defaults, meanings.
6. **Deep sections** — behavior that makes this page distinct (vendor OTP extras, failover, VAPID, …), each with a verified example.
7. **Troubleshooting** — `<Accordions>` of _real_ failure modes.
8. **Learn more** — bulleted cross-links (only to pages that exist).
9. **Next** — `<Cards>` to the next logical page.

## Writing rules

- **Every API claim verified** against the files above — option names, defaults, unions, error text.
- **Code examples must be real**: correct imports from `sently` / `sently/mailer` / `sently/sms` / `sently/transports/*`. `createMailer` and `createSMTPMailer` are async; SMS/WhatsApp/push senders are sync.
- **Sently-first**: apps use channel senders; providers are transports; vendor extras stay on the concrete transport.
- **No internal references** in prose: no `src/…` paths, no test file names (frontmatter `source` is OK).
- **No jargon without definition**; **tables over prose**; **examples over adjectives**.
- **Duplicated headings are a defect**.
- Docs are written in **English**, plain and direct.

## Hard gates (all must pass)

Run from `site/`:

```bash
bun test lib scripts   # prose-density + llms-nav + changelog + nav gates
bunx fumadocs-mdx      # MDX must compile
bun run build          # static export
```

| Gate          | Rule                                                                 |
| ------------- | -------------------------------------------------------------------- |
| Prose density | **≤3 consecutive plain paragraph lines** — Callout/Accordion bodies count too |
| Components    | Fumadocs: `Cards`/`Card`, `Callout`, `Steps`/`Step`, `Accordions`/`Accordion`, `Tabs`/`Tab`, `TypeTable` |
| Exports       | Only document subpaths present in `package.json` `exports`           |

## Authority

`AGENTS.md` and `CLAUDE.md` are the contract: channel-first senders, transports as providers. If the documentation would claim something the source does not support, **stop and ask** — do not invent the API.

## Reference

- Copy-paste starting point: [skeleton.md](skeleton.md)
- Canonical finished pages: `site/content/docs/channels/email.mdx`, `get-started/introduction.mdx`
