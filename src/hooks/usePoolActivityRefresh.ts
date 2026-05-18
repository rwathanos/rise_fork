"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";

const ACTIVITY_WINDOW_MS = 45_000;

/** Invalidate wagmi reads for a pool and optionally follow new blocks after user txs. */
export function usePoolActivityRefresh(pool?: `0x${string}`) {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const lastActivityAtRef = useRef(0);
  const lastHandledBlockRef = useRef<bigint | undefined>(undefined);

  const invalidatePoolQueries = useCallback(async () => {
    if (!pool) return;
    const poolLower = pool.toLowerCase();
    await queryClient.invalidateQueries({
      predicate: (query) => JSON.stringify(query.queryKey).toLowerCase().includes(poolLower),
    });
  }, [pool, queryClient]);

  const markPoolActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    lastHandledBlockRef.current = undefined;
  }, []);

  const refreshPoolData = useCallback(async () => {
    markPoolActivity();
    await invalidatePoolQueries();
  }, [invalidatePoolQueries, markPoolActivity]);

  useEffect(() => {
    if (!pool || blockNumber === undefined) return;
    if (Date.now() - lastActivityAtRef.current > ACTIVITY_WINDOW_MS) return;
    if (lastHandledBlockRef.current === blockNumber) return;

    lastHandledBlockRef.current = blockNumber;
    void invalidatePoolQueries();
  }, [blockNumber, invalidatePoolQueries, pool]);

  return { refreshPoolData, markPoolActivity, invalidatePoolQueries };
}
