"use client";

import { usePoolsPrices } from "@/hooks/usePoolsPrices";
import type { TokenSummary } from "@/lib/token-registry";

import { TokenCard } from "./TokenCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function TokenCardLive({ token }: { token: TokenSummary }) {
  const { byPool, isLoading } = usePoolsPrices(token.pool ? [token.pool] : []);
  const prices = token.pool ? byPool.get(token.pool.toLowerCase()) : undefined;
  const marketPrice = prices?.marketPrice;
  const floorPrice = prices?.floorPrice;
  if (isLoading && marketPrice === undefined && floorPrice === undefined) {
    return (
      <LoadingSkeleton
        blocks={[
          { width: "w-2/3", height: "h-5" },
          { width: "w-1/3", height: "h-4" },
          { width: "w-full", height: "h-20", rounded: "rounded-xl" },
        ]}
      />
    );
  }
  return <TokenCard token={token} marketPrice={marketPrice} floorPrice={floorPrice} />;
}
