/**
 * @module
 * Plugin pipeline for sently.
 * Plugins transform MailOptions before message construction.
 * They run sequentially — each receives the previous plugin's output.
 *
 * @example
 * ```ts
 * import { runPlugins } from "sently/core/plugin";
 * const result = await runPlugins(options, [pluginA, pluginB]);
 * ```
 */
import type { MailOptions, MailPlugin } from "./types.js";

/**
 * Run a list of plugins sequentially over MailOptions.
 * If plugins is empty or undefined, returns options unchanged.
 * Each plugin may be sync or async.
 *
 * @param options - the original mail options
 * @param plugins - ordered list of plugins to apply
 * @returns transformed mail options after all plugins have run
 */
export async function runPlugins(
  options: MailOptions,
  plugins: MailPlugin[] | undefined,
): Promise<MailOptions> {
  if (!plugins || plugins.length === 0) {
    return options;
  }

  let current = options;
  for (const plugin of plugins) {
    current = await plugin(current);
  }
  return current;
}
