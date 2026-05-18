import type { PublicClient } from "viem";

import { fetchTokenLabelsByPools } from "@/lib/factory-token-list";
import { factoryAddress } from "@/lib/contracts";
import type { TokenSummary } from "@/lib/token-registry";

/** Apply batched on-chain labels to entries missing name/symbol. */
export async function batchApplyTokenLabels(publicClient: PublicClient, tokens: TokenSummary[]) {
  const factory = factoryAddress();
  if (!factory) return tokens;

  const pools = tokens
    .filter((entry) => !entry.name || !entry.symbol)
    .map((entry) => entry.pool);

  if (pools.length === 0) return tokens;

  try {
    const labels = await fetchTokenLabelsByPools(publicClient, factory, pools);
    const labelByPool = new Map(labels.map((label) => [label.pool.toLowerCase(), label]));

    for (const entry of tokens) {
      const label = labelByPool.get(entry.pool.toLowerCase());
      if (!label) continue;
      if (!entry.name && label.name) entry.name = label.name;
      if (!entry.symbol && label.symbol) entry.symbol = label.symbol;
    }
  } catch {
    // Factory may not support label batch endpoints yet.
  }

  return tokens;
}
