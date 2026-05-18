"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { ConnectGuard } from "@/components/ConnectGuard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { TokenBadge } from "@/components/TokenBadge";
import { erc20Abi, risePoolAbi } from "@/lib/abis";
import { pickCoverArt } from "@/lib/cover-art";
import { formatTokenAmount } from "@/lib/format";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { useTokenRegistry } from "@/hooks/useTokenRegistry";

export default function PortfolioPage() {
  const { address } = useAccount();
  const { tokens } = useTokenRegistry();
  const { writeContractAsync } = useWriteContract();
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim(pool: `0x${string}`) {
    setClaimError(null);

    try {
      await writeContractAsync({
        address: pool,
        abi: risePoolAbi,
        functionName: "claimCreatorFees",
      });
    } catch (error) {
      setClaimError(getTxErrorMessage(error));
    }
  }

  return (
    <ConnectGuard>
      <div className="rise-in space-y-6">
        <div>
          <h1 className="section-title font-[family-name:var(--font-serif)] text-3xl font-semibold">账户</h1>
          <p className="muted mt-2 text-sm">查看持仓、借贷与创作者市场。</p>
        </div>

        <section className="space-y-4">
          <h2 className="section-title text-lg font-semibold">持仓</h2>
          {tokens.length === 0 ? (
            <EmptyStateCard title="暂无持仓市场" description="先在发现页参与交易后，这里会展示你的仓位和借贷信息。" className="p-8" />
          ) : (
            tokens.map((token) => (
              <HoldingRow key={token.pool} tokenAddress={token.token} pool={token.pool} symbol={token.symbol ?? "TOKEN"} />
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="section-title text-lg font-semibold">我创建的代币</h2>
          {claimError ? <p className="text-sm text-[#ffcf9c]">{claimError}</p> : null}
          {tokens.filter((token) => address && token.creator.toLowerCase() === address.toLowerCase()).length === 0 ? (
            <EmptyStateCard title="暂无你创建的市场" description="创建代币后可在此领取创作者费用并管理市场。" className="p-8" />
          ) : (
            tokens
              .filter((token) => address && token.creator.toLowerCase() === address.toLowerCase())
              .map((token) => (
                <CreatorRow
                  key={token.pool}
                  pool={token.pool}
                  symbol={token.symbol ?? "TOKEN"}
                  onClaim={() => handleClaim(token.pool)}
                />
              ))
          )}
        </section>
      </div>
    </ConnectGuard>
  );
}

function HoldingRow({
  tokenAddress,
  pool,
  symbol,
}: {
  tokenAddress: `0x${string}`;
  pool: `0x${string}`;
  symbol: string;
}) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: Boolean(address) },
  });

  const { data: position } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "getPosition",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: Boolean(address) },
  });

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
        <div className="h-20 w-full bg-cover bg-center" style={{ backgroundImage: `url(${pickCoverArt(pool)})` }} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TokenBadge symbol={symbol} fallback={tokenAddress} size="sm" />
          <div>
          <p className="font-medium text-[#eef7ff]">{symbol}</p>
          <p className="text-sm text-[#a8bdd9]">余额 {balance !== undefined ? formatTokenAmount(balance, 18, 4) : "—"}</p>
          <p className="text-sm text-[#93aacc]">
            借贷仓位：抵押 {position ? formatTokenAmount(position[0], 18, 4) : "—"} / 债务
            {position ? formatTokenAmount(position[1], 18, 6) : "—"}
          </p>
          </div>
        </div>
        <Link href={`/token/${pool}`} className="text-sm text-[#a8f2dc] hover:text-[#cdf9ed]">
          进入市场
        </Link>
      </div>
    </div>
  );
}

function CreatorRow({
  pool,
  symbol,
  onClaim,
}: {
  pool: `0x${string}`;
  symbol: string;
  onClaim: () => void | Promise<void>;
}) {
  return (
    <div className="glass-card flex items-center justify-between rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <TokenBadge symbol={symbol} fallback={pool} size="sm" />
        <div>
        <p className="font-medium text-[#eef7ff]">{symbol}</p>
        <p className="text-sm text-[#9ab2d2]">{pool}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onClaim()}
        className="line-btn rounded-full px-4 py-2 text-sm text-[#baf5e3]"
      >
        领取创作者费
      </button>
    </div>
  );
}
