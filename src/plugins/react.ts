/**
 * @module
 * React Email plugin for sently.
 * Renders a React element to HTML and plain text via `@react-email/render`.
 *
 * @example
 * ```ts
 * import { reactPlugin } from "sently/react";
 * import { WelcomeEmail } from "./emails/welcome";
 *
 * const mailer = await createMailer({
 *   transport: new ResendTransport({ apiKey }),
 *   plugins: [reactPlugin()],
 * });
 *
 * await mailer.send({
 *   from: "...",
 *   to: "...",
 *   subject: "Welcome!",
 *   react: WelcomeEmail({ name: "Ali" }),
 * });
 * ```
 */
import type { MailOptions, MailPlugin } from "../core/types.js";

/** Mail options with a React element body (requires `react` peer). */
export interface ReactMailOptions extends Omit<MailOptions, "react"> {
  /** React element rendered to html + text by the react plugin. */
  react?: import("react").ReactElement;
}

/**
 * Create a plugin that renders `options.react` to HTML and plain text.
 * Explicit `html` / `text` values always win. The `react` field is stripped
 * before options reach the transport.
 */
export function reactPlugin(): MailPlugin {
  return async (options: MailOptions): Promise<MailOptions> => {
    if (options.react === undefined || options.react === null) {
      return options;
    }

    const { render } = await import("@react-email/render");

    const html =
      options.html ??
      (await render(options.react as Parameters<typeof render>[0], { pretty: false }));

    const text =
      options.text ??
      (await render(options.react as Parameters<typeof render>[0], { plainText: true }));

    const { react: _react, ...rest } = options;
    return { ...rest, html, text };
  };
}
