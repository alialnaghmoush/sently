import type { Attachment } from "../core/types.js";

/** Options for {@link resolveAttachments}. */
export interface ResolveAttachmentsOptions {
  /** If set, attachment paths must resolve within this directory.
   *  Prevents symlink escape and path traversal. Opt-in only. */
  basePath?: string;
}

/**
 * Resolve attachment.path to in-memory Uint8Array content.
 * @throws When attachment.path is used on runtimes without node:fs/promises
 */
export async function resolveAttachments(
  attachments: Attachment[] | undefined,
  options?: ResolveAttachmentsOptions,
): Promise<Attachment[]> {
  const list = attachments ?? [];
  const resolved: Attachment[] = [];

  for (const attachment of list) {
    if (attachment.content instanceof Uint8Array) {
      resolved.push(attachment);
      continue;
    }

    if (attachment.path) {
      let fs: typeof import("node:fs/promises");
      try {
        fs = await import("node:fs/promises");
      } catch {
        throw new Error(
          "attachment.path is not supported on this runtime — use attachment.content (Uint8Array) instead",
        );
      }

      if (options?.basePath) {
        const { resolve } = await import("node:path");
        const resolvedPath = resolve(attachment.path);
        const resolvedBase = resolve(options.basePath);
        if (!resolvedPath.startsWith(resolvedBase)) {
          throw new Error(
            `[sently] Attachment path "${resolvedPath}" escapes basePath "${options.basePath}". ` +
              "Use absolute paths within the allowed directory.",
          );
        }
      }

      const data = await fs.readFile(attachment.path);
      const { path: _path, ...rest } = attachment;
      resolved.push({ ...rest, content: new Uint8Array(data) });
      continue;
    }

    if (typeof attachment.content === "string") {
      resolved.push(attachment);
      continue;
    }

    resolved.push(attachment);
  }

  return resolved;
}
