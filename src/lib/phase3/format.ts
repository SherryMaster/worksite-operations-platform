const moneyFormatter = new Intl.NumberFormat("en-MY", {
  currency: "MYR",
  style: "currency",
});

export function formatSen(value: number | null): string {
  return value === null ? "Not recorded" : moneyFormatter.format(value / 100);
}

export function maskIdentifier(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "••••";
  return `${compact.slice(0, 2)}${"•".repeat(Math.min(6, compact.length - 4))}${compact.slice(-2)}`;
}

export function documentExpiryState(
  expiryDate: string | null,
  businessDate: string,
): "EXPIRED" | "EXPIRING" | "VALID" | "NONE" {
  if (!expiryDate) return "NONE";
  if (expiryDate < businessDate) return "EXPIRED";
  const threshold = new Date(`${businessDate}T00:00:00Z`);
  threshold.setUTCDate(threshold.getUTCDate() + 30);
  const thresholdKey = threshold.toISOString().slice(0, 10);
  return expiryDate <= thresholdKey ? "EXPIRING" : "VALID";
}
