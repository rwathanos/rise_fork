"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";

import { risePoolAbi } from "@/lib/abis";

export type PoolPrices = {
  marketPrice?: bigint;
  floorPrice?: bigint;
};

/** Batch-read market/floor prices for many pools (2 calls per pool). */
export function usePoolsPrices(pools: `0x${string}`[]) {
  const contracts = useMemo(
    () =>
      pools.flatMap((pool) => [
        { address: pool, abi: risePoolAbi, functionName: "getMarketPrice" as const },
        { address: pool, abi: risePoolAbi, functionName: "getFloorPrice" as const },
      ]),
    [pools],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: pools.length > 0,
      staleTime: 15_000,
    },
  });

  const byPool = useMemo(() => {
    const map = new Map<string, PoolPrices>();
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i]!;
      map.set(pool.toLowerCase(), {
        marketPrice: data?.[i * 2]?.result as bigint | undefined,
        floorPrice: data?.[i * 2 + 1]?.result as bigint | undefined,
      });
    }
    return map;
  }, [data, pools]);

  return { byPool, isLoading, refetch };
}
