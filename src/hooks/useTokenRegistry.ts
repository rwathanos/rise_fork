"use client";

import { useCallback, useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

import { factoryDeployBlock } from "@/lib/chains";
import { factoryAddress } from "@/lib/contracts";
import { enrichToken } from "@/lib/token-enrichment";
import {
  loadFactorySyncBlock,
  loadTokenRegistry,
  resolveFactorySyncFromBlock,
  saveFactorySyncBlock,
  saveTokenRegistry,
  upsertToken,
  type TokenSummary,
} from "@/lib/token-registry";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { preferredChain } from "@/lib/wagmi";

const LOG_CHUNK_SIZE = 5_000n;

const tokenCreatedEvent = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed pool, address indexed creator, address backingAsset, uint8 creatorVariableFeeBps, string metadataURI)",
);

/** When deploy block is unset, avoid scanning from genesis on first sync. */
const RECENT_SYNC_WINDOW = 200_000n;

function resolveSyncFromBlock(latestBlock: bigint): bigint {
  const deployBlock = factoryDeployBlock();
  const fromBlock = resolveFactorySyncFromBlock(deployBlock);
  if (deployBlock !== undefined || loadFactorySyncBlock() !== undefined) {
    return fromBlock;
  }
  return latestBlock > RECENT_SYNC_WINDOW ? latestBlock - RECENT_SYNC_WINDOW : 0n;
}

export function useTokenRegistry() {
  const [tokens, setTokens] = useState<TokenSummary[]>(() => loadTokenRegistry());
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const factory = factoryAddress();
  const publicClient = usePublicClient({ chainId: preferredChain.id });

  const enrichRegistry = useCallback(async () => {
    if (!publicClient) return loadTokenRegistry();

    const registry = loadTokenRegistry();
    if (registry.length === 0) return registry;

    let changed = false;
    for (const entry of registry) {
      const prevName = entry.name;
      const prevSymbol = entry.symbol;
      await enrichToken(publicClient, entry);
      if (entry.name !== prevName || entry.symbol !== prevSymbol) changed = true;
    }

    if (changed) saveTokenRegistry(registry);
    return registry;
  }, [publicClient]);

  const sync = useCallback(async () => {
    if (!factory || !publicClient) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = resolveSyncFromBlock(latestBlock);

      if (fromBlock <= latestBlock) {
        for (let start = fromBlock; start <= latestBlock; start += LOG_CHUNK_SIZE) {
          const end = start + LOG_CHUNK_SIZE - 1n > latestBlock ? latestBlock : start + LOG_CHUNK_SIZE - 1n;
          const chunkLogs = await publicClient.getLogs({
            address: factory,
            event: tokenCreatedEvent,
            fromBlock: start,
            toBlock: end,
          });

          if (chunkLogs.length === 0) continue;

          for (const log of chunkLogs) {
            upsertToken({
              token: log.args.token!,
              pool: log.args.pool!,
              creator: log.args.creator!,
              backingAsset: log.args.backingAsset!,
              creatorVariableFeeBps: Number(log.args.creatorVariableFeeBps),
              metadataURI: log.args.metadataURI!,
              createdAt: Number(log.blockNumber),
            });
          }

          setTokens(loadTokenRegistry());
        }
      }

      saveFactorySyncBlock(latestBlock);
      const registry = await enrichRegistry();
      setTokens([...registry]);
      setHasSyncedOnce(true);
    } catch (error) {
      setSyncError(getTxErrorMessage(error));
      setTokens(loadTokenRegistry());
    } finally {
      setIsSyncing(false);
    }
  }, [enrichRegistry, factory, publicClient]);

  useEffect(() => {
    if (!publicClient) return;
    void enrichRegistry().then((registry) => {
      if (registry.length > 0) setTokens([...registry]);
    });
  }, [enrichRegistry, publicClient]);

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
