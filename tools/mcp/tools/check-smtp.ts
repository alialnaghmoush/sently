import type { SMTPAuth } from "../../../src/core/types.js";
import { createDefaultAdapter } from "../../../src/index.js";
import { SMTPTransport } from "../../../src/transports/smtp.js";

export interface CheckSmtpInput {
  host: string;
  port: number;
  auth?: SMTPAuth;
  secure?: boolean;
}

/**
 * Test SMTP connectivity and authentication without sending mail.
 */
export async function checkSmtp(input: CheckSmtpInput) {
  try {
    const adapter = await createDefaultAdapter({
      ...(input.secure !== undefined ? { secure: input.secure } : {}),
    });

    const transport = new SMTPTransport({
      host: input.host,
      port: input.port,
      secure: input.secure,
      ...(input.auth !== undefined ? { auth: input.auth } : {}),
      adapter,
    });

    await transport.verify();

    return {
      connected: true,
      starttls: !input.secure,
      authMethods: input.auth ? ["LOGIN", "PLAIN"] : [],
      greeting: "220 OK",
    };
  } catch (error) {
    return {
      connected: false,
      starttls: false,
      authMethods: [] as string[],
      greeting: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
