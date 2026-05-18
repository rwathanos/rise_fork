"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlockNumber } from "wagmi";

const ACTIVITY_WINDOW_MS = 45_000;
const POLL_INTERVAL_MS = 3_000;

type RefetchPoolState = () => Promise<unknown>;

/** Invalidate wagmi reads for a pool and refetch the page-level pool state. */
export function usePoolActivityRefresh(pool?: `0x${string}`, refetchPoolState?: RefetchPoolState) {
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

  const refetchPoolSnapshot = useCallback(async () => {
    await invalidatePoolQueries();
    await refetchPoolState?.();
  }, [invalidatePoolQueries, refetchPoolState]);

  const markPoolActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    lastHandledBlockRef.current = undefined;
  }, []);

  const refreshPoolData = useCallback(async () => {
    markPoolActivity();
    await refetchPoolSnapshot();
  }, [markPoolActivity, refetchPoolSnapshot]);

  const isPoolActivityRecent =
    lastActivityAtRef.current > 0 && Date.now() - lastActivityAtRef.current <= ACTIVITY_WINDOW_MS;

  useEffect(() => {
    if (!pool || blockNumber === undefined) return;
    if (Date.now() - lastActivityAtRef.current > ACTIVITY_WINDOW_MS) return;
    if (lastHandledBlockRef.current === blockNumber) return;

    lastHandledBlockRef.current = blockNumber;
    void refetchPoolSnapshot();
  }, [blockNumber, pool, refetchPoolSnapshot]);

  useEffect(() => {
    if (!pool || !isPoolActivityRecent) return;

    const timer = window.setInterval(() => {
      void refetchPoolSnapshot();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPoolActivityRecent, pool, refetchPoolSnapshot]);

  return { refreshPoolData, markPoolActivity, invalidatePoolQueries, isPoolActivityRecent };
}
