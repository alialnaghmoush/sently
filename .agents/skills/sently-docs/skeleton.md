# Page skeleton — copy and fill

Replace every `⟨…⟩`. Delete sections that genuinely don't apply rather than leaving filler. Keep the order.

````mdx
---
title: "⟨Topic⟩"
description: "⟨One plain sentence: what it is and when the user touches it.⟩"
icon: "⟨IconName⟩"
source: "⟨README.md or src/….ts⟩"
---

⟨2–3 lines. What this is for, in ordinary words, with a concrete example —
"the order-confirmation SMS", not "human reach". No theory, no internals.⟩

<Callout title="The one rule">
  ⟨The single user-facing law, phrased as what the user must do — max 3 lines.⟩
</Callout>

## Quick start

<Steps>

<Step>
### ⟨Configure⟩

⟨Working code: real imports, real option names, real defaults.⟩

</Step>

<Step>
### ⟨Send⟩

⟨The call the user actually makes.⟩

</Step>

<Step>
### ⟨See the result⟩

⟨What the user observes: message id, verify result, preview file.⟩

</Step>

</Steps>

## ⟨Reference — options⟩

| Option | Type | Default | Meaning |
| ------ | ---- | ------- | ------- |
| ⟨verified name⟩ | ⟨t⟩ | ⟨d⟩ | ⟨what⟩ |

## ⟨Distinct behavior⟩

⟨One section per important behavior — each with a verified example.
Consequences stated: "**Consequence:** …" for non-obvious choices.⟩

## Troubleshooting

<Accordions>
<Accordion title="⟨The error/symptom a user actually hits⟩">

⟨Why it happens. The fix. Real error text verbatim where one exists.⟩

</Accordion>
</Accordions>

## Learn more

- [⟨Related page⟩](/docs/⟨path⟩) — ⟨why follow the link⟩

## Next

<Cards>
  <Card title="⟨Next⟩" description="⟨why⟩" href="/docs/⟨path⟩" />
  <Card
    title="Introduction"
    description="Channel-first messaging model."
    href="/docs/get-started/introduction"
  />
  <Card title="Transports" description="Provider transports by channel." href="/docs/transports" />
</Cards>
````

## Pre-flight checklist

- [ ] Every option/default/union/error verified against source (not copied from the old page)
- [ ] No `src/` paths in user-facing prose (frontmatter `source` OK)
- [ ] From `site/`: `bun test lib scripts` → 0 fail (prose density ≤3)
- [ ] From `site/`: `bunx fumadocs-mdx` → compiles
- [ ] Cross-links point to pages that exist
- [ ] Only exported transports/subpaths documented
