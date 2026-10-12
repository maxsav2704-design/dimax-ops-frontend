export function proposalRate(value: string): string | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (cents <= BigInt(0) || cents > BigInt("999999999999")) return null;
  return `${cents / BigInt(100)}.${(cents % BigInt(100)).toString().padStart(2, "0")}`;
}

export function proposalAmount(rate: string, quantity: string): string | null {
  const normalizedRate = proposalRate(rate), normalizedQuantity = proposalRate(quantity);
  if (!normalizedRate || !normalizedQuantity) return null;
  // Integer cents keep the preview consistent with server Decimal ROUND_HALF_UP.
  const cents = (BigInt(normalizedRate.replace(".", "")) * BigInt(normalizedQuantity.replace(".", "")) + BigInt(50)) / BigInt(100);
  if (cents <= BigInt(0) || cents > BigInt("999999999999")) return null;
  return `${cents / BigInt(100)}.${(cents % BigInt(100)).toString().padStart(2, "0")}`;
}
