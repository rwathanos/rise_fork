"use client";

import { Component, type ReactNode } from "react";

import { FeedbackBanner } from "@/components/FeedbackBanner";
import { TokenCard } from "@/components/TokenCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { useTokenRegistry } from "@/hooks/useTokenRegistry";

type BoundaryState = { error: Error | null };

class DiscoveryErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-[#ff9f9f]/35 bg-[#2a1010]/60 p-5 text-sm text-[#ffd5d5]">
          <p className="font-medium">发现区加载失败</p>
          <p className="mt-2 text-[#e8bcbc]">{this.state.error.message || "未知错误"}</p>
          <button
            type="button"
            className="line-btn mt-4 rounded-full px-4 py-2 text-xs"
            onClick={() => {
              try {
                window.localStorage.removeItem("rise-token-registry-v1");
              } catch {
                // ignore
              }
              this.setState({ error: null });
            }}
          >
            清除本地缓存并重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DiscoveryFeedInner() {
  const { tokens, isSyncing, hasSyncedOnce, syncError, refresh } = useTokenRegistry();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title text-xl font-semibold">发现</h2>
        <div className="flex items-center gap-3 text-sm text-[#a5bcdb]">
          <span>{tokens.length} 个市场</span>
          <button
            type="button"
            onClick={refresh}
            disabled={isSyncing}
            className="line-btn rounded-full px-3 py-1 text-xs disabled:opacity-60"
          >
            {isSyncing ? "同步中…" : "刷新"}
          </button>
        </div>
      </div>
      {isSyncing ? (
        <p className="mb-4 text-sm text-[#a5bcdb]">
          {tokens.length > 0 ? "正在后台更新市场列表…" : "正在从 Factory 批量加载市场列表，请稍候…"}
        </p>
      ) : null}
      {syncError ? <FeedbackBanner tone="error" message={`同步失败：${syncError}`} className="mb-4" /> : null}
      {!isSyncing && hasSyncedOnce && tokens.length === 0 ? (
        <EmptyStateCard title="还没有代币市场" description="先创建第一个市场，或点击刷新重新同步 Factory。" />
      ) : null}
      {tokens.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {tokens.map((token) => (
            <TokenCard key={token.pool} token={token} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function DiscoveryFeed() {
  return (
    <DiscoveryErrorBoundary>
      <DiscoveryFeedInner />
    </DiscoveryErrorBoundary>
  );
}
