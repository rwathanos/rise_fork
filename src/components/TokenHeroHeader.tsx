"use client";

import { TokenBadge } from "@/components/TokenBadge";

type Props = {
  symbol?: string;
  name?: string;
  backingLabel?: string;
  metadataURI?: string;
};

export function TokenHeroHeader({ symbol, name, backingLabel, metadataURI }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-3">
        <TokenBadge symbol={symbol || "TOKEN"} fallback={name || "TOKEN"} size="md" />
        <div>
          <p className="text-sm tracking-[0.16em] text-[#9fd9ff]">{symbol ?? "TOKEN"}</p>
          <h1 className="section-title mt-1 font-[family-name:var(--font-serif)] text-2xl font-semibold md:text-3xl">
            {name ?? "代币市场"}
          </h1>
        </div>
        {backingLabel ? <span className="chip ml-auto rounded-full px-3 py-1 text-xs">{backingLabel}</span> : null}
      </div>
      {metadataURI ? <p className="mt-3 text-sm text-[#adc1dc]">{metadataURI}</p> : null}
    </div>
  );
}

