"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

import { factoryAddress } from "@/lib/contracts";
import { fetchAllTokenMarkets } from "@/lib/factory-token-list";
import { batchApplyTokenLabels } from "@/lib/token-enrichment";
import {
  loadTokenRegistry,
  sanitizeTokenRegistry,
  saveTokenRegistry,
  type TokenSummary,
} from "@/lib/token-registry";
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
    if (!factory) {
      setHasSyncedOnce(true);
      setSyncError("未配置 Factory 地址");
      return;
    }
    if (!publicClient) {
      setHasSyncedOnce(true);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      let markets = await fetchAllTokenMarkets(publicClient, factory, (partial) => {
        const safe = sanitizeTokenRegistry(partial);
        saveTokenRegistry(safe);
        setTokens(safe);
      });

      markets = sanitizeTokenRegistry(await batchApplyTokenLabels(publicClient, markets));

      saveTokenRegistry(markets);
      setTokens(markets);
    } catch (error) {
      setSyncError(getTxErrorMessage(error));
      setTokens(loadTokenRegistry());
    } finally {
      setHasSyncedOnce(true);
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
