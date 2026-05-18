"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

import { risePoolAbi } from "@/lib/abis";
import { preferredChain } from "@/lib/wagmi";

export type PoolPrices = {
  marketPrice?: bigint;
  floorPrice?: bigint;
};

/** Fetch market/floor prices via public RPC (works without wallet). */
export function usePoolsPrices(pools: `0x${string}`[]) {
  const publicClient = usePublicClient({ chainId: preferredChain.id });
  const [byPool, setByPool] = useState<Map<string, PoolPrices>>(() => new Map());
  const [isLoading, setIsLoading] = useState(false);

  const poolsKey = useMemo(() => pools.map((p) => p.toLowerCase()).join(","), [pools]);

  const fetchPrices = useCallback(async () => {
    if (!publicClient || pools.length === 0) {
      setByPool(new Map());
      return;
    }

    setIsLoading(true);
    try {
      const map = new Map<string, PoolPrices>();
      await Promise.all(
        pools.map(async (pool) => {
          try {
            const [marketPrice, floorPrice] = await Promise.all([
              publicClient.readContract({
                address: pool,
                abi: risePoolAbi,
                functionName: "getMarketPrice",
              }),
              publicClient.readContract({
                address: pool,
                abi: risePoolAbi,
                functionName: "getFloorPrice",
              }),
            ]);
            map.set(pool.toLowerCase(), { marketPrice, floorPrice });
          } catch {
            map.set(pool.toLowerCase(), {});
          }
        }),
      );
      setByPool(map);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, pools]);

  useEffect(() => {
    void fetchPrices();
  }, [fetchPrices, poolsKey]);

  return { byPool, isLoading, refetch: fetchPrices };
}
