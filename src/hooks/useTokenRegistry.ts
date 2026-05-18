"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const factory = factoryAddress();
  const publicClient = usePublicClient({ chainId: preferredChain.id });
  const publicClientRef = useRef(publicClient);
  const syncInFlightRef = useRef(false);

  publicClientRef.current = publicClient;

  useEffect(() => {
    const cached = loadTokenRegistry();
    if (cached.length > 0) {
      setTokens(cached);
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    if (!factory) {
      setHasSyncedOnce(true);
      setSyncError("未配置 Factory 地址");
      return;
    }

    const client = publicClientRef.current;
    if (!client) {
      setHasSyncedOnce(true);
      return;
    }

    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      let markets = await fetchAllTokenMarkets(client, factory, (partial) => {
        try {
          const safe = sanitizeTokenRegistry(partial);
          saveTokenRegistry(safe);
          setTokens(safe);
        } catch {
          // Ignore progress callback failures so sync can continue.
        }
      });

      markets = sanitizeTokenRegistry(await batchApplyTokenLabels(client, markets));

      saveTokenRegistry(markets);
      setTokens(markets);
    } catch (error) {
      setSyncError(getTxErrorMessage(error));
      setTokens(loadTokenRegistry());
    } finally {
      setHasSyncedOnce(true);
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [factory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void sync();
    }, 0);
    return () => window.clearTimeout(timer);
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
