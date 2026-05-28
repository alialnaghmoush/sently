import type { CreateMailerOptions } from "../../../src/core/types.js";

export interface ValidateConfigResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a createMailer config and return errors and warnings.
 */
export function validateConfig(input: CreateMailerOptions): ValidateConfigResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if ("transport" in input) {
    if (!input.transport) {
      errors.push("transport is required when using custom transport");
    }
    return { valid: errors.length === 0, errors, warnings };
  }

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

  if (input.auth && !input.auth.pass) {
    errors.push("auth.pass is required when auth is set");
  }

  if (input.direct) {
    warnings.push("direct MX delivery requires node:dns/promises (Node/Bun/Deno only)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export const validateConfigSchema = {
  type: "object",
} as const;
