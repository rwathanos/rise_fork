"use client";

import { useEffect } from "react";

const BENIGN_WALLET_PROVIDER_ERRORS = [
  "Cannot redefine property: ethereum",
  "Cannot set property ethereum",
  "ethereum is not defined",
];

function collectRejectionText(reason: unknown): string {
  if (!reason) return "";
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "object") {
    const record = reason as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of ["shortMessage", "message", "details"] as const) {
      const value = record[key];
      if (typeof value === "string") parts.push(value);
    }
    if ("cause" in record) parts.push(collectRejectionText(record.cause));
    return parts.join(" ");
  }
  return String(reason);
}

function isBenignWalletProviderRejection(reason: unknown) {
  const text = collectRejectionText(reason);
  return BENIGN_WALLET_PROVIDER_ERRORS.some((snippet) => text.includes(snippet));
}

export function WalletRuntimeGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isBenignWalletProviderRejection(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    // Capture phase runs before Next.js dev overlay logs the rejection.
    window.addEventListener("unhandledrejection", onRejection, true);
    return () => window.removeEventListener("unhandledrejection", onRejection, true);
  }, []);

  return children;
}
