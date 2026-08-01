/** Product name shown in nav and homepage. */
export const appName = "sently";

/** Docs base path. */
export const docsRoute = "/docs";

/** OG image route prefix. */
export const docsImageRoute = "/og/docs";

/** Per-page markdown route prefix for agents. */
export const docsContentRoute = "/llms.mdx/docs";

/** GitHub coordinates for Edit / source links. */
export const gitConfig = {
  user: "alialnaghmoush",
  repo: "sently",
  branch: "main",
} as const;

/**
 * Build a blob URL for a repo-relative path.
 *
 * @param path - Path from repo root (e.g. `README.md`)
 */
export function githubBlobUrl(path: string): string {
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${path}`;
}
