/**
 * @module
 * Push subscription endpoint safety and hook redaction helpers.
 *
 * Full push endpoints embed long-lived delivery tokens. Never put the raw URL
 * in logs or hook context — use {@link redactPushEndpoint} instead.
 */

import { encodeBase64Url, encodeUtf8 } from "./base64.js";

/**
 * Built-in hosts for major browser push services.
 * Custom hosts can be added via {@link WebPushConfig.allowedEndpointHosts}.
 */
export const DEFAULT_PUSH_ENDPOINT_HOSTS: readonly string[] = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
];

/** Suffix patterns for regional / vendor push hosts. */
const DEFAULT_PUSH_ENDPOINT_SUFFIXES: readonly string[] = [
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.apple.com",
];

/**
 * Validate a push subscription endpoint before server-side fetch.
 *
 * Rejects non-HTTPS schemes, IP literals (including link-local / private),
 * and hostnames outside the allowlist — mitigates SSRF when subscriptions
 * come from untrusted clients.
 *
 * @param endpoint - Raw subscription endpoint URL.
 * @param extraHosts - Additional exact hostnames to allow.
 * @throws Error when the endpoint is unsafe.
 */
export function assertSafePushEndpoint(endpoint: string, extraHosts: readonly string[] = []): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Invalid push subscription endpoint URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Push subscription endpoint must use https:");
  }

  if (url.username || url.password) {
    throw new Error("Push subscription endpoint must not include credentials");
  }

  const host = url.hostname.toLowerCase();

  if (isIpLiteral(host)) {
    throw new Error("Push subscription endpoint must not be an IP address");
  }

  if (!isAllowedPushHost(host, extraHosts)) {
    throw new Error(`Push subscription endpoint host is not allowlisted: ${host}`);
  }
}

/**
 * Redact a push endpoint for hook/observability context.
 * Returns `origin/#<8-byte-hash>` so logs never store the delivery token path.
 */
export async function redactPushEndpoint(endpoint: string): Promise<string> {
  try {
    const url = new URL(endpoint);
    const bytes = encodeUtf8(endpoint);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );
    const short = encodeBase64Url(new Uint8Array(digest).subarray(0, 8));
    return `${url.origin}/#${short}`;
  } catch {
    return "[invalid-endpoint]";
  }
}

function isAllowedPushHost(host: string, extraHosts: readonly string[]): boolean {
  if (DEFAULT_PUSH_ENDPOINT_HOSTS.includes(host) || extraHosts.includes(host)) {
    return true;
  }
  return DEFAULT_PUSH_ENDPOINT_SUFFIXES.some(
    (suffix) => host.endsWith(suffix) && host.length > suffix.length,
  );
}

function isIpLiteral(host: string): boolean {
  // IPv6 in URLs is bracketed; URL.hostname strips brackets.
  if (host.includes(":")) {
    return true;
  }
  // IPv4 dotted-quad
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host)) {
    return true;
  }
  return false;
}
