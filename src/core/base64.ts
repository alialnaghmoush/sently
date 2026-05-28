// src/core/base64.ts

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LINE_LENGTH = 76;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encode a Uint8Array or string to Base64.
 * Uses TextEncoder + manual base64 to support binary data correctly.
 */
export function encodeBase64(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  let result = "";
  let i = 0;

  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    if (b1 === undefined) {
      result += BASE64_CHARS[b0 >> 2];
      result += BASE64_CHARS[(b0 & 0x03) << 4];
      result += "==";
      break;
    }

    if (b2 === undefined) {
      result += BASE64_CHARS[b0 >> 2];
      result += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
      result += BASE64_CHARS[(b1 & 0x0f) << 2];
      result += "=";
      break;
    }

    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    result += BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    result += BASE64_CHARS[b2 & 0x3f];
    i += 3;
  }

  return wrapBase64Lines(result);
}

/**
 * Decode a Base64 string to Uint8Array.
 */
export function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/\s/g, "");
  const len = cleaned.length;

  if (len === 0) {
    return new Uint8Array(0);
  }

  if (len % 4 !== 0) {
    throw new Error("Invalid base64 string length");
  }

  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  const outputLen = (len * 3) / 4 - padding;
  const output = new Uint8Array(outputLen);

  let outIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = base64CharToValue(cleaned[i] ?? "=");
    const c1 = base64CharToValue(cleaned[i + 1] ?? "=");
    const c2 = base64CharToValue(cleaned[i + 2] ?? "=");
    const c3 = base64CharToValue(cleaned[i + 3] ?? "=");
    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    if (outIndex < outputLen) {
      output[outIndex++] = (triple >> 16) & 0xff;
    }
    if (outIndex < outputLen) {
      output[outIndex++] = (triple >> 8) & 0xff;
    }
    if (outIndex < outputLen) {
      output[outIndex++] = triple & 0xff;
    }
  }

  return output;
}

/**
 * Encode text using Quoted-Printable (RFC 2045).
 */
export function encodeQP(text: string): string {
  const bytes = encoder.encode(text);
  const lines: string[] = [];
  let line = "";

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;

    if (byte === 0x0a) {
      lines.push(line);
      line = "";
      continue;
    }

    if (byte === 0x0d) {
      continue;
    }

    let encoded: string;
    if (
      (byte >= 33 && byte <= 60) ||
      (byte >= 62 && byte <= 126) ||
      byte === 0x09 ||
      byte === 0x20
    ) {
      encoded = String.fromCharCode(byte);
    } else {
      encoded = `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }

    if (line.length + encoded.length > 75) {
      lines.push(`${line}=`);
      line = encoded;
    } else {
      line += encoded;
    }
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return lines.join("\r\n");
}

/**
 * Encode an email header value per RFC 2047.
 * Non-ASCII values become: =?UTF-8?B?<base64>?=
 */
export function encodeHeader(value: string): string {
  if (!needsEncoding(value)) {
    return value;
  }

  const encoded = encodeBase64(value).replace(/\r\n/g, "");
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * Returns true if the string contains non-ASCII characters
 * and therefore requires RFC 2047 encoding in headers.
 */
export function needsEncoding(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      return true;
    }
  }
  return false;
}

function base64CharToValue(char: string): number {
  if (char === "=") {
    return 0;
  }
  const index = BASE64_CHARS.indexOf(char);
  if (index === -1) {
    throw new Error(`Invalid base64 character: ${char}`);
  }
  return index;
}

function wrapBase64Lines(base64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += BASE64_LINE_LENGTH) {
    lines.push(base64.slice(i, i + BASE64_LINE_LENGTH));
  }
  return lines.join("\r\n");
}

/** Decode bytes to UTF-8 string. */
export function decodeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/** Encode string to UTF-8 bytes. */
export function encodeUtf8(text: string): Uint8Array {
  return encoder.encode(text);
}
