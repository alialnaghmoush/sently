/**
 * @module
 * Unified sently error types — import from `sently/errors`.
 *
 * @example
 * ```ts
 * import { SentlyError } from "sently/errors";
 * import { ResendError } from "sently/transports/resend";
 *
 * try {
 *   await mailer.send({ ... });
 * } catch (err) {
 *   if (err instanceof SentlyError) {
 *     console.error(err.sentlyCode, err.statusCode);
 *   }
 *   if (err instanceof ResendError) {
 *     console.error(err.statusCode, err.apiError);
 *   }
 * }
 * ```
 */
export type { SentlyErrorCode, SentlyErrorOptions } from "./core/errors.js";
export {
  /** Map an HTTP status code to a stable sently error code. */
  httpStatusToSentlyCode,
  /** Base error class for all sently transport and protocol failures. */
  SentlyError,
  /** Map an SMTP response code to a stable sently error code. */
  smtpCodeToSentlyCode,
} from "./core/errors.js";
