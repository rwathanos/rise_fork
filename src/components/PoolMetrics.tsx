"use client";

import { usePoolState } from "@/hooks/usePoolState";
import { formatTokenAmount } from "@/lib/format";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export function PoolMetrics({ pool }: { pool: `0x${string}` }) {
  const { marketPrice, floorPrice, reserves, backingDecimals, creatorVariableFeeBps, isLoading } = usePoolState(pool);

  if (isLoading && !reserves && marketPrice === undefined && floorPrice === undefined) {
    return (
      <LoadingSkeleton
        blocks={[
          { width: "w-40", height: "h-6" },
          { width: "w-full", height: "h-24", rounded: "rounded-xl" },
          { width: "w-full", height: "h-24", rounded: "rounded-xl" },
        ]}
      />
    );
  }

  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="section-title text-lg font-semibold">市场概览</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-[#9cb2ce]">市价 (WAD)</dt>
          <dd className="text-lg text-[#ecf6ff]">{marketPrice !== undefined ? formatTokenAmount(marketPrice, 18, 8) : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#9cb2ce]">地板 (WAD)</dt>
          <dd className="text-lg text-[#ecf6ff]">{floorPrice !== undefined ? formatTokenAmount(floorPrice, 18, 8) : "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#9cb2ce]">池内储备</dt>
          <dd className="text-lg text-[#ecf6ff]">
            {reserves ? formatTokenAmount(reserves[2], backingDecimals ?? 18, 6) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-[#9cb2ce]">创作者 0.25% 分配</dt>
          <dd className="text-lg text-[#ecf6ff]">{creatorVariableFeeBps ?? "—"} / 25 BPS</dd>
        </div>
      </dl>
    </section>
  );
}
