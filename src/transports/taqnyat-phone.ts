/**
 * International digits without `+` or leading `00` (Taqnyat SMS / WhatsApp / Verify docs).
 */
export function normalizeTaqnyatPhone(phone: string): string {
  let normalized = phone.trim();
  if (normalized.startsWith("+")) {
    normalized = normalized.slice(1);
  }
  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}
