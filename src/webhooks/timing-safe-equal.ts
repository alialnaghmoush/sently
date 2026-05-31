/**
 * Constant-time byte comparison for cryptographic signatures.
 * Never short-circuits the XOR loop; length mismatch is folded into `diff`.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let i = 0; i < len; i++) {
    const ai = i < a.length ? (a[i] ?? 0) : 0;
    const bi = i < b.length ? (b[i] ?? 0) : 0;
    diff |= ai ^ bi;
  }

  return diff === 0;
}

/** Decode a base64 string to bytes; returns null on invalid input. */
export function decodeBase64Bytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Decode a lowercase hex string to bytes; returns null on invalid input. */
export function decodeHexBytes(value: string): Uint8Array | null {
  if (value.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      return null;
    }
    bytes[i] = byte;
  }

  return bytes;
}
