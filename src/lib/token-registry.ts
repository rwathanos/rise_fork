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
    return JSON.parse(raw) as TokenSummary[];
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
