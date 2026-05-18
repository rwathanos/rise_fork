"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";

import { WalletConnectModal } from "@/components/WalletConnectModal";
import { preferredChain } from "@/lib/wagmi";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
    });
  }, []);

  // Avoid SSR/client mismatch for wallet connection state.
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="primary-btn rounded-full px-4 py-2 text-sm font-semibold opacity-70"
      >
        连接钱包
      </button>
    );
  }

  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="primary-btn rounded-full px-4 py-2 text-sm font-semibold"
        >
          连接钱包
        </button>
        <WalletConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const wrongChain = chainId !== preferredChain.id;

  return (
    <div className="flex items-center gap-2">
      {wrongChain ? (
        <button
          type="button"
          onClick={() => switchChain({ chainId: preferredChain.id })}
          className="rounded-full border border-[#f8c68d]/70 px-3 py-2 text-xs text-[#ffddb1]"
        >
          切换到 {preferredChain.name}
        </button>
      ) : null}
      <span className="chip hidden rounded-full px-3 py-2 text-xs sm:inline">
        {preferredChain.name}
      </span>
      <span className="chip rounded-full px-3 py-2 text-xs">
        {shortAddress(address ?? "")}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="line-btn rounded-full px-3 py-2 text-xs"
      >
        断开
      </button>
    </div>
  );
}
