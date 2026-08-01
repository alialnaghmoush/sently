/**
 * @module
 * Plugin pipeline for sently channel senders.
 * Plugins transform channel options before the transport sends.
 * They run sequentially — each receives the previous plugin's output.
 *
 * @example
 * ```ts
 * import { runPlugins } from "sently/core/plugin";
 * const result = await runPlugins(options, [pluginA, pluginB]);
 * ```
 */

/**
 * Run a list of plugins sequentially over channel options.
 * If plugins is empty or undefined, returns options unchanged.
 * Each plugin may be sync or async.
 *
 * @typeParam T - Channel options type (e.g. MailOptions, SmsOptions).
 * @param options - the original options
 * @param plugins - ordered list of plugins to apply
 * @returns transformed options after all plugins have run
 */
export async function runPlugins<T>(
  options: T,
  plugins: Array<(o: T) => T | Promise<T>> | undefined,
): Promise<T> {
  if (!plugins || plugins.length === 0) {
    return options;
  }

  let current = options;
  for (const plugin of plugins) {
    current = await plugin(current);
  }
  return current;
}
