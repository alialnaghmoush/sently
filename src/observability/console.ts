/**
 * @module
 * Ready-made observability helpers for sently.
 */
import type { MailerHooks } from "../core/types.js";

/**
 * Returns {@link MailerHooks} that log lifecycle events to the console.
 * For production, write your own hooks targeting your metrics/tracing system.
 *
 * @param prefix — log line prefix. Default: `'[sently]'`.
 */
export function consoleObserver(prefix = "[sently]"): MailerHooks {
  return {
    onSend: ({ subject }) => {
      console.log(`${prefix} sending: ${subject}`);
    },
    onSuccess: ({ subject }, _result, durationMs) => {
      const timing = durationMs !== undefined ? ` (${durationMs.toFixed(0)}ms)` : "";
      console.log(`${prefix} sent: ${subject}${timing}`);
    },
    onError: ({ subject }, error, durationMs) => {
      const timing = durationMs !== undefined ? ` (${durationMs.toFixed(0)}ms)` : "";
      console.error(`${prefix} failed: ${subject}${timing}`, error);
    },
  };
}
