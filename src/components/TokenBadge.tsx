"use client";

import { badgeGradient, badgeSeedText } from "@/lib/badge-art";

type Props = {
  symbol?: string;
  fallback?: string;
  size?: "sm" | "md";
};

export function TokenBadge({ symbol, fallback, size = "md" }: Props) {
  const seed = `${symbol ?? ""}-${fallback ?? ""}`;
  const [from, to] = badgeGradient(seed);
  const text = badgeSeedText(symbol, fallback);
  const box = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  return (
    <div
      className={`${box} inline-flex items-center justify-center rounded-full border border-white/25 font-semibold text-[#052136] shadow-[0_8px_20px_rgba(0,0,0,0.22)]`}
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {text}
    </div>
  );
}

