import type { PublicClient } from "viem";

import { riseFactoryAbi } from "@/lib/abis";
import type { TokenSummary } from "@/lib/token-registry";

export const FACTORY_BATCH_LIMIT = 100n;

type FactoryTokenMarket = {
  token: `0x${string}`;
  pool: `0x${string}`;
  creator: `0x${string}`;
  backingAsset: `0x${string}`;
  creatorVariableFeeBps: number;
  metadataURI: string;
  name: string;
  symbol: string;
};

type FactoryTokenLabel = {
  token: `0x${string}`;
  pool: `0x${string}`;
  name: string;
  symbol: string;
};

function asAddress(value: unknown): `0x${string}` {
  return value as `0x${string}`;
}

function asNumber(value: unknown): number {
  return Number(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** viem may return structs as objects or tuples depending on ABI encoding. */
function normalizeTokenMarket(raw: unknown): FactoryTokenMarket {
  if (Array.isArray(raw)) {
    return {
      token: asAddress(raw[0]),
      pool: asAddress(raw[1]),
      creator: asAddress(raw[2]),
      backingAsset: asAddress(raw[3]),
      creatorVariableFeeBps: asNumber(raw[4]),
      metadataURI: asString(raw[5]),
      name: asString(raw[6]),
      symbol: asString(raw[7]),
    };
  }

  const market = raw as FactoryTokenMarket;
  return {
    token: asAddress(market.token),
    pool: asAddress(market.pool),
    creator: asAddress(market.creator),
    backingAsset: asAddress(market.backingAsset),
    creatorVariableFeeBps: asNumber(market.creatorVariableFeeBps),
    metadataURI: asString(market.metadataURI),
    name: asString(market.name),
    symbol: asString(market.symbol),
  };
}

function normalizeTokenLabel(raw: unknown): FactoryTokenLabel {
  if (Array.isArray(raw)) {
    return {
      token: asAddress(raw[0]),
      pool: asAddress(raw[1]),
      name: asString(raw[2]),
      symbol: asString(raw[3]),
    };
  }

  const label = raw as FactoryTokenLabel;
  return {
    token: asAddress(label.token),
    pool: asAddress(label.pool),
    name: asString(label.name),
    symbol: asString(label.symbol),
  };
}

function marketToSummary(market: FactoryTokenMarket, createdAt: number): TokenSummary {
  return {
    token: market.token,
    pool: market.pool,
    creator: market.creator,
    backingAsset: market.backingAsset,
    creatorVariableFeeBps: market.creatorVariableFeeBps,
    metadataURI: market.metadataURI,
    name: market.name,
    symbol: market.symbol,
    createdAt,
  };
}

function applyLabels(tokens: TokenSummary[], labels: FactoryTokenLabel[]) {
  const labelByPool = new Map(labels.map((label) => [label.pool.toLowerCase(), label]));
  for (const token of tokens) {
    const label = labelByPool.get(token.pool.toLowerCase());
    if (!label) continue;
    if (label.name) token.name = label.name;
    if (label.symbol) token.symbol = label.symbol;
  }
}

async function fetchTokenLabelsPage(
  publicClient: PublicClient,
  factory: `0x${string}`,
  offset: bigint,
  limit: bigint,
): Promise<FactoryTokenLabel[]> {
  const page = (await publicClient.readContract({
    address: factory,
    abi: riseFactoryAbi,
    functionName: "getTokenLabels",
    args: [offset, limit],
  })) as unknown[];

  return page.map(normalizeTokenLabel);
}

/** Paginated batch fetch of token names/symbols from RiseFactory. */
export async function fetchAllTokenLabels(
  publicClient: PublicClient,
  factory: `0x${string}`,
): Promise<FactoryTokenLabel[]> {
  const total = await publicClient.readContract({
    address: factory,
    abi: riseFactoryAbi,
    functionName: "allPoolsLength",
  });

  const labels: FactoryTokenLabel[] = [];
  let offset = 0n;

  while (offset < total) {
    const remaining = total - offset;
    const limit = remaining > FACTORY_BATCH_LIMIT ? FACTORY_BATCH_LIMIT : remaining;
    labels.push(...(await fetchTokenLabelsPage(publicClient, factory, offset, limit)));
    offset += limit;
  }

  return labels;
}

/** Batch fetch names for specific pools (max 100 per call). */
export async function fetchTokenLabelsByPools(
  publicClient: PublicClient,
  factory: `0x${string}`,
  pools: `0x${string}`[],
): Promise<FactoryTokenLabel[]> {
  if (pools.length === 0) return [];

  const labels: FactoryTokenLabel[] = [];
  for (let i = 0; i < pools.length; i += Number(FACTORY_BATCH_LIMIT)) {
    const chunk = pools.slice(i, i + Number(FACTORY_BATCH_LIMIT));
    const page = (await publicClient.readContract({
      address: factory,
      abi: riseFactoryAbi,
      functionName: "getTokenLabelsByPools",
      args: [chunk],
    })) as unknown[];
    labels.push(...page.map(normalizeTokenLabel));
  }

  return labels;
}

/** Paginated fetch of all markets + batched name/symbol merge from Factory. */
export async function fetchAllTokenMarkets(
  publicClient: PublicClient,
  factory: `0x${string}`,
  onProgress?: (tokens: TokenSummary[]) => void,
): Promise<TokenSummary[]> {
  const total = await publicClient.readContract({
    address: factory,
    abi: riseFactoryAbi,
    functionName: "allPoolsLength",
  });

  const tokens: TokenSummary[] = [];
  let offset = 0n;
  const totalNumber = Number(total);

  while (offset < total) {
    const remaining = total - offset;
    const limit = remaining > FACTORY_BATCH_LIMIT ? FACTORY_BATCH_LIMIT : remaining;

    const [marketsPage, labelsPage] = await Promise.all([
      publicClient.readContract({
        address: factory,
        abi: riseFactoryAbi,
        functionName: "getTokenMarkets",
        args: [offset, limit],
      }) as Promise<unknown[]>,
      fetchTokenLabelsPage(publicClient, factory, offset, limit),
    ]);

    const pageTokens: TokenSummary[] = [];
    for (let i = 0; i < marketsPage.length; i++) {
      const rank = Number(offset) + i;
      pageTokens.push(marketToSummary(normalizeTokenMarket(marketsPage[i]), totalNumber - rank));
    }

    applyLabels(pageTokens, labelsPage);
    tokens.push(...pageTokens);

    offset += limit;
    onProgress?.([...tokens]);
  }

  return tokens;
}
