/**
 * @module
 * Shared lifecycle hook invocation for mailer and channel senders.
 * Hook failures are swallowed so they never break the send path.
 */

/**
 * Invoke a lifecycle hook without letting hook failures break the send.
 * In non-production environments, hook errors are logged with `console.warn`.
 *
 * @typeParam T - Hook argument tuple types.
 * @param hook - Optional sync or async hook callback.
 * @param args - Arguments forwarded to the hook.
 */
export async function invokeHook<T extends unknown[]>(
  hook: ((...args: T) => void | Promise<void>) | undefined,
  ...args: T
): Promise<void> {
  if (hook === undefined) {
    return;
  }
  try {
    await hook(...args);
  } catch (hookError) {
    const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (!isProduction) {
      console.warn("[sently] hook threw; send continues:", hookError);
    }
  }
}
