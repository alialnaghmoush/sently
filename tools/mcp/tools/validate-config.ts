import type { SMTPMailerOptions, TransportMailerOptions } from "../../../src/core/types.js";

export interface ValidateConfigResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a transport-only mailer config (`sently/mailer` or main `createMailer`).
 */
export function validateTransportConfig(input: TransportMailerOptions): ValidateConfigResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.transport) {
    errors.push("transport is required when using custom transport");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an SMTP mailer config (`sently/smtp` or `createSMTPMailer` from `sently`).
 */
export function validateSmtpConfig(input: SMTPMailerOptions): ValidateConfigResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.host) {
    errors.push("host is required");
  }

  if (input.port === 465 && input.secure === false) {
    warnings.push("port 465 with secure: false — consider secure: true");
  }

  if (input.port === 587 && input.secure === true) {
    warnings.push("port 587 with secure: true — STARTTLS is typically used on 587");
  }

  if (input.auth && !input.auth.user) {
    errors.push("auth.user is required when auth is set");
  }

  if (input.auth && !input.auth.pass && input.auth.type !== "OAUTH2") {
    errors.push("auth.pass is required when auth is set (except OAUTH2)");
  }

  if (input.direct) {
    warnings.push("direct MX delivery requires node:dns/promises (Node/Bun/Deno only)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a mailer config — transport-shaped or SMTP-shaped.
 */
export function validateConfig(
  input: TransportMailerOptions | SMTPMailerOptions,
): ValidateConfigResult {
  if ("transport" in input) {
    return validateTransportConfig(input);
  }
  return validateSmtpConfig(input);
}

export const validateConfigSchema = {
  type: "object",
} as const;
