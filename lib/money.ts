const DECIMAL_MONEY = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function majorToMinorUnits(value: string | number): bigint {
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim();
  const match = DECIMAL_MONEY.exec(normalized);
  if (!match) throw new Error(`Invalid money value: ${normalized}`);
  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return whole * 100n + BigInt(fraction || "0");
}

export function minorToMajorUnits(value: bigint): string {
  if (value < 0n) throw new Error("Money cannot be negative.");
  const whole = value / 100n;
  const fraction = String(value % 100n).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function applyBasisPoints(value: bigint, basisPoints: number): bigint {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) throw new Error("Basis points must be an integer between 0 and 10000.");
  return (value * BigInt(basisPoints) + 5_000n) / 10_000n;
}

export function toSafeProviderAmount(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Payment amount is outside the provider-safe integer range.");
  return Number(value);
}
