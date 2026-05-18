"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useConnect } from "wagmi";

import { FeedbackBanner } from "@/components/FeedbackBanner";
import { preferredChain } from "@/lib/wagmi";
import { formatWalletConnectorName, uniqueWalletConnectors } from "@/lib/wallet-connectors";
import { getTxErrorMessage } from "@/lib/tx-errors";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WalletConnectModal({ open, onClose }: Props) {
  const { connect, connectors, isPending } = useConnect();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const availableConnectors = useMemo(() => uniqueWalletConnectors(connectors), [connectors]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="关闭连接钱包弹窗"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div className="pointer-events-none relative flex min-h-full items-end justify-center p-4 md:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-connect-title"
          className="glass-card pointer-events-auto w-full max-w-md max-h-[min(85vh,640px)] overflow-y-auto rounded-2xl p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="wallet-connect-title" className="section-title text-lg font-semibold">
                连接钱包
              </p>
              <p className="mt-1 text-sm text-[#a8bdd9]">选择 MetaMask、OKX 钱包，或浏览器已安装的其他钱包。</p>
            </div>
            <button type="button" onClick={onClose} className="line-btn rounded-full px-3 py-1 text-xs">
              关闭
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {availableConnectors.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#071526ad] px-4 py-3 text-sm text-[#d7e9ff]">
                未检测到可用钱包。请先安装 MetaMask、OKX 钱包等浏览器扩展。
              </p>
            ) : (
              availableConnectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setErrorMessage(null);
                    connect(
                      { connector, chainId: preferredChain.id },
                      {
                        onSuccess: () => onClose(),
                        onError: (error) => setErrorMessage(getTxErrorMessage(error)),
                      },
                    );
                  }}
                  className="line-btn flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm disabled:opacity-60"
                >
                  <span>{formatWalletConnectorName(connector.name)}</span>
                  <span className="text-xs text-[#8ea6c7]">{isPending ? "连接中…" : "连接"}</span>
                </button>
              ))
            )}
          </div>

          {errorMessage ? <FeedbackBanner tone="error" message={errorMessage} /> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
