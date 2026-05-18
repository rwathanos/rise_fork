"use client";

import { useCallback, useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

import { factoryDeployBlock } from "@/lib/chains";
import { factoryAddress } from "@/lib/contracts";
import {
  loadTokenRegistry,
  resolveFactorySyncFromBlock,
  saveFactorySyncBlock,
  upsertToken,
  type TokenSummary,
} from "@/lib/token-registry";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { preferredChain } from "@/lib/wagmi";

const LOG_CHUNK_SIZE = 5_000n;

const tokenCreatedEvent = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed pool, address indexed creator, address backingAsset, uint8 creatorVariableFeeBps, string metadataURI)",
);

async function enrichToken(entry: TokenSummary) {
  try {
    const response = await fetch(entry.metadataURI);
    if (!response.ok) return;
    const metadata = (await response.json()) as { name?: string; symbol?: string };
    entry.name = metadata.name;
    entry.symbol = metadata.symbol;
  } catch {
    // ignore metadata fetch failures
  }
}

export function useTokenRegistry() {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const factory = factoryAddress();
  const publicClient = usePublicClient({ chainId: preferredChain.id });

  const sync = useCallback(async () => {
    if (!factory || !publicClient) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = resolveFactorySyncFromBlock(factoryDeployBlock());
      const firstEnd = fromBlock + LOG_CHUNK_SIZE - 1n > latestBlock ? latestBlock : fromBlock + LOG_CHUNK_SIZE - 1n;

      const logs = await publicClient.getLogs({
        address: factory,
        event: tokenCreatedEvent,
        fromBlock,
        toBlock: firstEnd,
      });

      for (let start = firstEnd + 1n; start <= latestBlock; start += LOG_CHUNK_SIZE) {
        const end = start + LOG_CHUNK_SIZE - 1n > latestBlock ? latestBlock : start + LOG_CHUNK_SIZE - 1n;
        logs.push(
          ...(await publicClient.getLogs({
            address: factory,
            event: tokenCreatedEvent,
            fromBlock: start,
            toBlock: end,
          })),
        );
      }

      for (const log of logs) {
        const entry: TokenSummary = {
          token: log.args.token!,
          pool: log.args.pool!,
          creator: log.args.creator!,
          backingAsset: log.args.backingAsset!,
          creatorVariableFeeBps: Number(log.args.creatorVariableFeeBps),
          metadataURI: log.args.metadataURI!,
          createdAt: Number(log.blockNumber),
        };

        await enrichToken(entry);
        upsertToken(entry);
      }

      saveFactorySyncBlock(latestBlock);
      setTokens(loadTokenRegistry());
    } catch (error) {
      setSyncError(getTxErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }, [factory, publicClient]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setTokens(loadTokenRegistry());
    });
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  return {
    tokens,
    isSyncing,
    syncError,
    refresh: () => {
      setTokens(loadTokenRegistry());
      void sync();
    },
  };
}
