"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

import { factoryAddress } from "@/lib/contracts";
import { fetchAllTokenMarkets } from "@/lib/factory-token-list";
import { batchApplyTokenLabels } from "@/lib/token-enrichment";
import { loadTokenRegistry, saveTokenRegistry, type TokenSummary } from "@/lib/token-registry";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { preferredChain } from "@/lib/wagmi";

export function useTokenRegistry() {
  // Start empty so SSR and the first client render match (localStorage is client-only).
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const factory = factoryAddress();
  const publicClient = usePublicClient({ chainId: preferredChain.id });

  useEffect(() => {
    const cached = loadTokenRegistry();
    if (cached.length > 0) {
      setTokens(cached);
    }
  }, []);

  const sync = useCallback(async () => {
    if (!factory || !publicClient) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      let markets = await fetchAllTokenMarkets(publicClient, factory, (partial) => {
        saveTokenRegistry(partial);
        setTokens(partial);
      });

      markets = await batchApplyTokenLabels(publicClient, markets);

      saveTokenRegistry(markets);
      setTokens(markets);
      setHasSyncedOnce(true);
    } catch (error) {
      setSyncError(getTxErrorMessage(error));
      setTokens(loadTokenRegistry());
    } finally {
      setIsSyncing(false);
    }
  }, [factory, publicClient]);

  useEffect(() => {
    void sync();
  }, [sync]);

  return {
    tokens,
    isSyncing,
    hasSyncedOnce,
    syncError,
    refresh: () => {
      setTokens(loadTokenRegistry());
      void sync();
    },
  };
}
