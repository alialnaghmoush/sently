// src/core/address.ts
import { encodeHeader } from "./base64.js";
import type { Address, AddressInput } from "./types.js";

/**
 * Normalize any AddressInput form into Address[].
 */
export function parseAddresses(input: AddressInput): Address[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => parseAddresses(item));
  }

  if (typeof input === "object") {
    return [{ ...input }];
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  return splitAddressList(trimmed).map(parseSingleAddress);
}

/**
 * Format an Address for SMTP envelope commands (MAIL FROM / RCPT TO).
 */
export function toEnvelope(address: Address): string {
  return address.address;
}

/**
 * Format an Address for use in a MIME header (From, To, CC, etc.).
 */
export function toMIMEHeader(address: Address): string {
  if (address.name) {
    const name = encodeHeader(address.name);
    return `${name} <${address.address}>`;
  }
  return address.address;
}

/**
 * Extract plain email strings from any AddressInput.
 */
export function extractEmails(input: AddressInput): string[] {
  return parseAddresses(input).map((addr) => addr.address);
}

/**
 * Basic email format validation (format only, no DNS lookup).
 */
export function isValidEmail(email: string): boolean {
  if (/[\r\n\t]/.test(email)) return false;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

function splitAddressList(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngle = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i] ?? "";
    if (char === '"' && input[i - 1] !== "\\") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (char === "<" && !inQuotes) {
      inAngle = true;
      current += char;
      continue;
    }
    if (char === ">" && !inQuotes) {
      inAngle = false;
      current += char;
      continue;
    }
    if (char === "," && !inQuotes && !inAngle) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseSingleAddress(input: string): Address {
  const trimmed = input.trim();

  const angleMatch = trimmed.match(/^(?:"([^"]*)"|([^<]*?))\s*<([^>]+)>$/);
  if (angleMatch) {
    const name = (angleMatch[1] ?? angleMatch[2] ?? "").trim();
    const address = (angleMatch[3] ?? "").trim();
    if (name) {
      return { name, address };
    }
    return { address };
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return { address: trimmed.slice(1, -1) };
  }

  return { address: trimmed };
}
