"use client";

import { usePoolState } from "@/hooks/usePoolState";
import type { TokenSummary } from "@/lib/token-registry";

import { TokenCard } from "./TokenCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function TokenCardLive({ token }: { token: TokenSummary }) {
  const { marketPrice, floorPrice, isLoading } = usePoolState(token.pool);
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
