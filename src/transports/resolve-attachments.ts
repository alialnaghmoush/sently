import type { Attachment } from "../core/types.js";

/**
 * Resolve attachment.path to in-memory Uint8Array content.
 * @throws When attachment.path is used on runtimes without node:fs/promises
 */
export async function resolveAttachments(attachments: Attachment[] = []): Promise<Attachment[]> {
  const resolved: Attachment[] = [];

  for (const attachment of attachments) {
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
