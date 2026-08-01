/**
 * Resolve a stable provider label for observability and diagnostics.
 * Prefers `transport.provider` when set; falls back to constructor name.
 */
export function getProviderLabel(transport: {
  readonly provider?: string;
  readonly constructor: { name: string };
}): string {
  if (transport.provider !== undefined && transport.provider.length > 0) {
    return transport.provider;
  }

  const name = transport.constructor.name;
  if (name === "Object") {
    return "custom";
  }
  if (name.endsWith("Transport")) {
    return name.slice(0, -"Transport".length).toLowerCase();
  }
  return name.toLowerCase() || "unknown";
}
