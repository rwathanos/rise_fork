"use client";

import Link from "next/link";

import { FeedbackBanner } from "@/components/FeedbackBanner";
import { TokenCardLive } from "@/components/TokenCardLive";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { factoryAddress } from "@/lib/contracts";
import { useTokenRegistry } from "@/hooks/useTokenRegistry";

export default function HomePage() {
  const { tokens, isSyncing, hasSyncedOnce, syncError, refresh } = useTokenRegistry();
  const factory = factoryAddress();

  return (
    <div className="space-y-8 rise-in">
      <section className="hero-canvas glass-card rounded-3xl p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-[#9fd9ff]">RISE on BSC</p>
        <h1 className="section-title shimmer-line mt-3 max-w-2xl font-[family-name:var(--font-serif)] text-4xl font-semibold md:text-5xl">
          无许可发币、地板价保护、无清算借贷
        </h1>
        <p className="muted mt-4 max-w-2xl">
          协议作为唯一对手方，支持 BNB 与 USDT 储备市场。交易费 1.25%，借贷开仓费 3% 注入地板。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/create" className="primary-btn rounded-full px-5 py-3 text-sm font-semibold">
            创建代币
          </Link>
          <Link href="/portfolio" className="line-btn rounded-full px-5 py-3 text-sm">
            查看账户
          </Link>
        </div>
      </section>

      {!factory ? (
        <div className="rounded-2xl border border-[#ffdca5]/35 bg-[#ffdca51c] p-4 text-sm text-[#ffe8c8]">
          请在 `web/.env.local` 配置 `NEXT_PUBLIC_FACTORY_ADDRESS` 与 RPC 后再连接链上数据。
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-xl font-semibold">发现</h2>
          <div className="flex items-center gap-3 text-sm text-[#a5bcdb]">
            <span>{tokens.length} 个市场</span>
            <button type="button" onClick={refresh} disabled={isSyncing} className="line-btn rounded-full px-3 py-1 text-xs disabled:opacity-60">
              {isSyncing ? "同步中…" : "刷新"}
            </button>
          </div>
        </div>
        {isSyncing ? (
          <p className="mb-4 text-sm text-[#a5bcdb]">
            {tokens.length > 0 ? "正在后台更新市场列表…" : "正在从链上同步 Factory 事件，请稍候…"}
          </p>
        ) : null}
        {syncError ? <FeedbackBanner tone="error" message={`同步失败：${syncError}`} className="mb-4" /> : null}
        {!isSyncing && hasSyncedOnce && tokens.length === 0 ? (
          <EmptyStateCard title="还没有代币市场" description="先创建第一个市场，或点击刷新重新同步 Factory 事件。" />
        ) : null}
        {tokens.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tokens.map((token) => (
              <TokenCardLive key={token.pool} token={token} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
