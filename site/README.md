# sently docs site

Next.js + [Fumadocs](https://fumadocs.dev) documentation site.

- Handbook content lives under `content/docs/`.
- **Changelog** (`/changelog`) is derived from the root `CHANGELOG.md`.

## Commands

```bash
bun run dev           # Next development server
bun run build         # static export → out/
bun run start         # serve out/
```

From the monorepo root:

```bash
bun run site:dev
bun run site:build
```

## Deployment

`next.config.mjs` sets `output: 'export'`. The build produces a static `out/`
directory — host it anywhere.
