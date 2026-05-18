"use client";

import { useAccount } from "wagmi";

import { WalletButton } from "@/components/WalletButton";

export function ConnectGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
        <p className="mb-4 text-zinc-300">请先连接 BSC 钱包以继续。</p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
