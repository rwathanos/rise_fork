"use client";

import { useReadContracts } from "wagmi";

import { risePoolAbi } from "@/lib/abis";

export function usePoolState(pool?: `0x${string}`) {
  const { data, refetch, isLoading } = useReadContracts({
    contracts: pool
      ? [
          { address: pool, abi: risePoolAbi, functionName: "getMarketPrice" },
          { address: pool, abi: risePoolAbi, functionName: "getFloorPrice" },
          { address: pool, abi: risePoolAbi, functionName: "getReserves" },
          { address: pool, abi: risePoolAbi, functionName: "backingDecimals" },
          { address: pool, abi: risePoolAbi, functionName: "isNativeBacking" },
          { address: pool, abi: risePoolAbi, functionName: "creator" },
          { address: pool, abi: risePoolAbi, functionName: "creatorVariableFeeBps" },
          { address: pool, abi: risePoolAbi, functionName: "metadataURI" },
          { address: pool, abi: risePoolAbi, functionName: "token" },
          { address: pool, abi: risePoolAbi, functionName: "pendingCreatorFeesWad" },
        ]
      : [],
    query: { enabled: Boolean(pool) },
  });

  if (!pool || !data) {
    return { isLoading, refetch };
  }

  return {
    isLoading,
    refetch,
    marketPrice: data[0]?.result as bigint | undefined,
    floorPrice: data[1]?.result as bigint | undefined,
    reserves: data[2]?.result as [bigint, bigint, bigint] | undefined,
    backingDecimals: Number(data[3]?.result ?? 18),
    isNativeBacking: Boolean(data[4]?.result),
    creator: data[5]?.result as `0x${string}` | undefined,
    creatorVariableFeeBps: Number(data[6]?.result ?? 0),
    metadataURI: data[7]?.result as string | undefined,
    token: data[8]?.result as `0x${string}` | undefined,
    pendingCreatorFeesWad: data[9]?.result as bigint | undefined,
  };
}
