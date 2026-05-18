import type { PublicClient } from "viem";

import { erc20Abi } from "@/lib/abis";
import type { TokenSummary } from "@/lib/token-registry";

/** Rewrite localhost metadata URLs to the current site (fixes tokens created with wrong APP_URL). */
export function resolveMetadataUri(metadataURI: string): string {
  if (typeof window === "undefined") return metadataURI;
  try {
    const url = new URL(metadataURI);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return `${window.location.origin}${url.pathname}`;
    }
  } catch {
    // not an absolute URL — use as-is
  }
  return metadataURI;
}

export async function enrichTokenFromChain(publicClient: PublicClient, entry: TokenSummary) {
  try {
    const results = await publicClient.multicall({
      contracts: [
        { address: entry.token, abi: erc20Abi, functionName: "name" },
        { address: entry.token, abi: erc20Abi, functionName: "symbol" },
      ],
      allowFailure: true,
    });
    const name = results[0]?.result;
    const symbol = results[1]?.result;
    if (typeof name === "string" && name.length > 0) entry.name = name;
    if (typeof symbol === "string" && symbol.length > 0) entry.symbol = symbol;
  } catch {
    // ignore chain read failures
  }
}

export async function enrichTokenFromMetadata(entry: TokenSummary) {
  if (!entry.metadataURI) return;
  try {
    const response = await fetch(resolveMetadataUri(entry.metadataURI));
    if (!response.ok) return;
    const metadata = (await response.json()) as { name?: string; symbol?: string };
    if (!entry.name && metadata.name) entry.name = metadata.name;
    if (!entry.symbol && metadata.symbol) entry.symbol = metadata.symbol;
  } catch {
    // ignore metadata fetch failures
  }
}

export async function enrichToken(publicClient: PublicClient, entry: TokenSummary) {
  await enrichTokenFromChain(publicClient, entry);
  if (!entry.name || !entry.symbol) {
    await enrichTokenFromMetadata(entry);
  }
}
