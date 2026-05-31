/**
 * @module
 * React Email integration for sently — optional peer dependency.
 *
 * @example
 * ```ts
 * import { reactPlugin } from "sently/react";
 * import { createMailer } from "sently/mailer";
 * import { ResendTransport } from "sently/transports/resend";
 *
 * const mailer = await createMailer({
 *   transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
 *   plugins: [reactPlugin()],
 * });
 * ```
 */
export type { ReactMailOptions } from "./plugins/react.js";
export {
  /** Plugin that renders `options.react` to HTML and plain text via `@react-email/render`. */
  reactPlugin,
} from "./plugins/react.js";
