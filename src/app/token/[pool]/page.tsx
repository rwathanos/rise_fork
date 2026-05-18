"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

import { BorrowPanel } from "@/components/BorrowPanel";
import { PoolMetrics } from "@/components/PoolMetrics";
import { SwapPanel } from "@/components/SwapPanel";
import { TokenHeroHeader } from "@/components/TokenHeroHeader";
import { defaultChainId, explorerAddressUrl, usdtAddress } from "@/lib/chains";
import { useMounted } from "@/hooks/useMounted";
import { usePoolActivityRefresh } from "@/hooks/usePoolActivityRefresh";
import { usePoolState } from "@/hooks/usePoolState";
import { useTokenRegistry } from "@/hooks/useTokenRegistry";
import { pickCoverArt } from "@/lib/cover-art";

export default function TokenPage() {
  const params = useParams<{ pool: string }>();
  const pool = params.pool as `0x${string}`;
  const mounted = useMounted();
  const { address } = useAccount();
  const { tokens } = useTokenRegistry();
  const tokenEntry = tokens.find((item) => item.pool.toLowerCase() === pool.toLowerCase());
  const state = usePoolState(pool);
  const { refreshPoolData } = usePoolActivityRefresh(pool);

  const backingAsset = state.isNativeBacking ? undefined : usdtAddress(defaultChainId);
  const cover = pickCoverArt(pool);
  const backingLabel = state.isNativeBacking === undefined ? undefined : state.isNativeBacking ? "BNB" : "USDT";

  return (
    <div className="space-y-6 rise-in">
      <section className="glass-card overflow-hidden rounded-3xl p-0">
        <div className="h-44 w-full bg-cover bg-center md:h-52" style={{ backgroundImage: `url(${cover})` }} />
        <div className="p-6 md:p-7">
          <TokenHeroHeader
            symbol={tokenEntry?.symbol}
            name={tokenEntry?.name}
            backingLabel={backingLabel}
            metadataURI={tokenEntry?.metadataURI}
          />
          <a
            href={explorerAddressUrl(defaultChainId, pool)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-[#a8f2dc] hover:text-[#cbf8eb]"
          >
            在 BscScan 查看池合约
          </a>
        </div>
      </section>

      <PoolMetrics pool={pool} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SwapPanel
          pool={pool}
          token={state.token}
          backingDecimals={state.backingDecimals ?? 18}
          isNativeBacking={Boolean(state.isNativeBacking)}
          backingAsset={backingAsset}
          creatorVariableFeeBps={state.creatorVariableFeeBps ?? 0}
          tokenSymbol={tokenEntry?.symbol}
          onPoolActivity={refreshPoolData}
        />
        <BorrowPanel
          pool={pool}
          token={state.token}
          backingDecimals={state.backingDecimals ?? 18}
          isNativeBacking={Boolean(state.isNativeBacking)}
          backingAsset={backingAsset}
          tokenSymbol={tokenEntry?.symbol}
          poolReserveBalance={state.reserves?.[2]}
          realReserveWad={state.realReserveWad}
          totalBorrowedReserveWad={state.totalBorrowedReserveWad}
          floorPriceWad={state.floorPrice}
          onPoolActivity={refreshPoolData}
        />
      </div>

      {mounted && address && state.creator?.toLowerCase() === address.toLowerCase() ? (
        <section className="glass-card rounded-2xl p-5 text-sm text-[#d5e6fe]">
          你是该市场创作者。可在账户页查看可领取的创作者费用，或后续在此页补充 `claimCreatorFees` 入口。
        </section>
      ) : null}
    </div>
  );
}
