"use client";

import Link from "next/link";

import { isNativeBacking } from "@/lib/contracts";
import { formatTokenAmount } from "@/lib/format";
import { pickCoverArt } from "@/lib/cover-art";
import type { TokenSummary } from "@/lib/token-registry";
import { TokenBadge } from "@/components/TokenBadge";

type Props = {
  token: TokenSummary;
  marketPrice?: bigint;
  floorPrice?: bigint;
};

export function TokenCard({ token, marketPrice, floorPrice }: Props) {
  const backingLabel = isNativeBacking(token.backingAsset) ? "BNB" : "USDT";
  const cover = pickCoverArt(token.pool);

  return (
    <Link
      href={`/token/${token.pool}`}
      className="glass-card rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#95e8d1]/45"
    >
      <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
        <div className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <TokenBadge symbol={token.symbol} fallback={token.token} size="sm" />
          <div>
          <h3 className="section-title text-lg font-semibold">{token.name ?? token.symbol ?? "未命名代币"}</h3>
          <p className="text-sm text-[#a8bdd9]">{token.symbol ?? short(token.token)}</p>
          </div>
        </div>
        <span className="chip rounded-full px-3 py-1 text-xs">{backingLabel}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#e6f2ff]">
        <div>
          <dt className="text-[#95aecd]">市价</dt>
          <dd>{marketPrice !== undefined ? formatTokenAmount(marketPrice, 18, 8) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[#95aecd]">地板</dt>
          <dd>{floorPrice !== undefined ? formatTokenAmount(floorPrice, 18, 8) : "—"}</dd>
        </div>
      </dl>
    </Link>
  );
}

function short(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
