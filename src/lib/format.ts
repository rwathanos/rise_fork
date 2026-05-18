import { formatUnits } from "viem";

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTokenAmount(value: bigint, decimals = 18, maxFractionDigits = 6) {
  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  if (!fraction) return whole;
  return `${whole}.${fraction.slice(0, maxFractionDigits)}`.replace(/\.$/, "");
}

export function formatAmountInput(value: bigint, decimals = 18) {
  const formatted = formatUnits(value, decimals);
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/\.?0+$/, "");
}

export function formatWadPrice(value: bigint, backingDecimals: number) {
  const scaled = value * 10n ** BigInt(backingDecimals);
  return formatTokenAmount(scaled, 18, 8);
}
