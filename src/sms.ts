/**
 * @module
 * SMS sender orchestrator — plugins, hooks, and transport.send pipeline.
 *
 * Sently-first: apps call {@link createSmsSender}; providers implement
 * {@link SmsTransport}. Vendor-only extras stay on the concrete transport.
 *
 * @example
 * ```ts
 * import { createSmsSender } from "sently/sms";
 * import { TwilioSmsTransport } from "sently/transports/twilio-sms";
 *
 * const sms = createSmsSender({
 *   transport: new TwilioSmsTransport({ accountSid: "...", authToken: "..." }),
 * });
 *
 * await sms.send({ to: "+15551234567", body: "Hello", from: "+15557654321" });
 * ```
 */
import { invokeHook } from "./core/hooks.js";
import { runPlugins } from "./core/plugin.js";
import type {
  SmsHookContext,
  SmsHooks,
  SmsOptions,
  SmsPlugin,
  SmsSendResult,
  SmsTransport,
} from "./core/sms-types.js";
import type { VerifyResult } from "./core/types.js";

/** Configuration for {@link createSmsSender}. */
export interface SmsSenderConfig {
  /** SMS delivery transport. */
  transport: SmsTransport;
  /** Optional plugins run before each send. */
  plugins?: SmsPlugin[];
  /** Optional lifecycle hooks for metrics and tracing. */
  hooks?: SmsHooks;
}

/** SMS sender returned by {@link createSmsSender}. */
export interface SmsSender {
  /** Send an SMS through the configured transport. */
  send(options: SmsOptions): Promise<SmsSendResult>;
  /** Test connectivity and credentials without sending. */
  verify(): Promise<VerifyResult>;
  /** Release resources held by the transport. */
  close(): Promise<void>;
}

function buildSmsHookContext(options: SmsOptions, transport: SmsTransport): SmsHookContext {
  return {
    ...(options.messageId !== undefined ? { messageId: options.messageId } : {}),
    to: options.to,
    provider: transport.provider ?? "sms",
  };
}

/**
 * Create an SMS sender that wraps an {@link SmsTransport}.
 *
 * Pipeline: plugins → onSend → transport.send → onSuccess / onError.
 */
export function createSmsSender(config: SmsSenderConfig): SmsSender {
  const { transport, plugins, hooks } = config;

  return {
    async send(options: SmsOptions): Promise<SmsSendResult> {
      const processed = await runPlugins(options, plugins);
      const ctx = buildSmsHookContext(processed, transport);

      await invokeHook(hooks?.onSend, ctx);

      const start = performance.now();

      try {
        const result = await transport.send(processed);
        const successCtx: SmsHookContext = {
          ...ctx,
          messageId: result.messageId,
        };
        await invokeHook(hooks?.onSuccess, successCtx, result, performance.now() - start);
        return result;
      } catch (error) {
        await invokeHook(hooks?.onError, ctx, error, performance.now() - start);
        throw error;
      }
    },

    async verify(): Promise<VerifyResult> {
      if (transport.verify) {
        return transport.verify();
      }
      return { ok: true, provider: "sms" };
    },

    async close(): Promise<void> {
      if (transport.close) {
        await transport.close();
      }
    },
  };
}
