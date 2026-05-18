import { isAddress, zeroAddress } from "viem";

export type TokenSummary = {
  token: `0x${string}`;
  pool: `0x${string}`;
  creator: `0x${string}`;
  backingAsset: `0x${string}`;
  creatorVariableFeeBps: number;
  metadataURI: string;
  name?: string;
  symbol?: string;
  createdAt: number;
};

/** Drop or repair entries from older caches that can crash renderers. */
export function sanitizeTokenRegistry(tokens: unknown[]): TokenSummary[] {
  const cleaned: TokenSummary[] = [];

  for (const raw of tokens) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Partial<TokenSummary>;
    if (!isAddress(entry.pool ?? "") || !isAddress(entry.token ?? "")) continue;

    cleaned.push({
      token: entry.token as `0x${string}`,
      pool: entry.pool as `0x${string}`,
      creator: isAddress(entry.creator ?? "") ? (entry.creator as `0x${string}`) : zeroAddress,
      backingAsset: isAddress(entry.backingAsset ?? "") ? (entry.backingAsset as `0x${string}`) : zeroAddress,
      creatorVariableFeeBps: Number(entry.creatorVariableFeeBps ?? 0),
      metadataURI: typeof entry.metadataURI === "string" ? entry.metadataURI : "",
      name: typeof entry.name === "string" && entry.name ? entry.name : undefined,
      symbol: typeof entry.symbol === "string" && entry.symbol ? entry.symbol : undefined,
      createdAt: typeof entry.createdAt === "number" && Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
    });
  }

  return cleaned;
}

const STORAGE_KEY = "rise-token-registry-v1";
const SYNC_BLOCK_KEY = "rise-factory-sync-block-v1";

export function loadFactorySyncBlock(): bigint | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(SYNC_BLOCK_KEY);
  if (!raw) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export function saveFactorySyncBlock(block: bigint) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_BLOCK_KEY, block.toString());
}

export function resolveFactorySyncFromBlock(deployBlock?: bigint): bigint {
  const cursor = loadFactorySyncBlock();
  const base = deployBlock ?? 0n;
  if (cursor === undefined) return base;
  return cursor > base ? cursor + 1n : base;
}

export function loadTokenRegistry(): TokenSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeTokenRegistry(JSON.parse(raw) as unknown[]);
  } catch {
    return [];
  }
}

export function saveTokenRegistry(tokens: TokenSummary[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function upsertToken(entry: TokenSummary) {
  const tokens = loadTokenRegistry().filter((item) => item.pool !== entry.pool);
  tokens.unshift(entry);
  saveTokenRegistry(tokens);
}
