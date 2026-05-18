"use client";

import { useState } from "react";
import Image from "next/image";
import { zeroAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { riseFactoryAbi } from "@/lib/abis";
import { usdtAddress } from "@/lib/chains";
import { factoryAddress } from "@/lib/contracts";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { TokenBadge } from "@/components/TokenBadge";

type BackingChoice = "BNB" | "USDT";

export function CreateTokenForm() {
  const { chainId } = useAccount();
  const factory = factoryAddress();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [backing, setBacking] = useState<BackingChoice>("BNB");
  const [creatorVariableFeeBps, setCreatorVariableFeeBps] = useState(12);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: creationFee } = useReadContract({
    address: factory,
    abi: riseFactoryAbi,
    functionName: "creationFee",
    query: { enabled: Boolean(factory) },
  });
  const usdt = chainId ? usdtAddress(chainId) : undefined;
  const { data: backingSupport } = useReadContracts({
    contracts:
      factory && usdt
        ? [
            { address: factory, abi: riseFactoryAbi, functionName: "supportedBackingAsset", args: [zeroAddress] },
            { address: factory, abi: riseFactoryAbi, functionName: "supportedBackingAsset", args: [usdt] },
          ]
        : [],
    query: { enabled: Boolean(factory && usdt) },
  });
  const bnbSupported = Boolean(backingSupport?.[0]?.result ?? true);
  const usdtSupported = Boolean(backingSupport?.[1]?.result ?? false);

  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  async function uploadMetadata() {
    const response = await fetch("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        symbol,
        description,
        image: logoDataUrl,
      }),
    });
    if (!response.ok) throw new Error("metadata upload failed");
    return (await response.json()) as { uri: string };
  }

  async function handleSubmit() {
    if (!factory || !confirmed || !chainId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { uri } = await uploadMetadata();
      const backingAsset = backing === "BNB" ? zeroAddress : usdtAddress(chainId);
      const hash = await writeContractAsync({
        address: factory,
        abi: riseFactoryAbi,
        functionName: "createToken",
        args: [name, symbol, uri, backingAsset, creatorVariableFeeBps],
        value: creationFee ?? 0n,
      });
      setTxHash(hash);
      setSuccessMessage("交易已提交，等待链上确认。");
    } catch (error) {
      setErrorMessage(getTxErrorMessage(error));
    }
  }

  return (
    <section className="glass-card rise-in rounded-2xl p-6 md:p-7">
      <h1 className="section-title font-[family-name:var(--font-serif)] text-3xl font-semibold">创建代币</h1>
      <p className="muted mt-2 text-sm">
        买卖总费 1.25%：1% 固定归协议，0.25% 由你在地板与创作者之间分配；借贷开仓费 3% 注入地板。创建后储备与费分配不可修改。
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass-card md:col-span-2 rounded-2xl p-4">
          <p className="text-sm text-[#a9c0dd]">发行预览</p>
          <div className="mt-3 flex items-center gap-3">
            {logoDataUrl ? (
              <Image
                src={logoDataUrl}
                alt="logo preview"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <TokenBadge symbol={symbol || "NEW"} fallback={name || "NEW"} size="md" />
            )}
            <div>
              <p className="section-title text-base font-semibold">{name || "未命名代币"}</p>
              <p className="text-sm text-[#a8bdd9]">{symbol || "TICKER"}</p>
            </div>
            <span className="chip ml-auto rounded-full px-3 py-1 text-xs">{backing}</span>
          </div>
        </div>

        <label className="text-sm text-[#a9c0dd]">
          名称
          <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-2 w-full rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm text-[#a9c0dd]">
          Ticker
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="field mt-2 w-full rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm text-[#a9c0dd] md:col-span-2">
          简介
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="field mt-2 min-h-28 w-full rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm text-[#a9c0dd]">
          储备资产
          <select value={backing} onChange={(e) => setBacking(e.target.value as BackingChoice)} className="field mt-2 w-full rounded-xl px-3 py-2">
            <option value="BNB" disabled={!bnbSupported}>BNB {bnbSupported ? "（已支持）" : "（未支持）"}</option>
            <option value="USDT" disabled={!usdtSupported}>USDT {usdtSupported ? "（已支持）" : "（未支持）"}</option>
          </select>
          <span className="mt-2 block text-xs text-[#8da8c8]">仅可创建为工厂白名单内的储备资产。</span>
        </label>
        <label className="text-sm text-[#a9c0dd]">
          创作者分得 0.25% 中的 BPS（0-25）
          <input
            type="range"
            min={0}
            max={25}
            value={creatorVariableFeeBps}
            onChange={(e) => setCreatorVariableFeeBps(Number(e.target.value))}
            className="mt-4 w-full"
          />
          <span className="mt-2 block text-[#edf7ff]">{creatorVariableFeeBps} / 25 BPS</span>
        </label>
        <label className="text-sm text-[#a9c0dd] md:col-span-2">
          Logo
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setLogoDataUrl(String(reader.result));
              reader.readAsDataURL(file);
            }}
            className="mt-2 block w-full text-[#d7e8ff]"
          />
          {logoDataUrl ? (
            <button
              type="button"
              onClick={() => setLogoDataUrl(null)}
              className="line-btn mt-3 rounded-lg px-3 py-1 text-xs"
            >
              移除 Logo，改用动态徽章
            </button>
          ) : null}
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm text-[#d7e8ff]">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
        我已确认名称、Ticker、储备资产与费分配在创建后不可修改。
      </label>

      <button
        type="button"
        disabled={!factory || isPending || !confirmed || (backing === "BNB" && !bnbSupported) || (backing === "USDT" && !usdtSupported)}
        onClick={() => void handleSubmit()}
        className="primary-btn mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {isPending ? "等待钱包确认…" : `支付创建费并上链${creationFee ? ` (${Number(creationFee) / 1e18} BNB)` : ""}`}
      </button>

      {errorMessage ? <FeedbackBanner tone="error" message={errorMessage} className="mt-4" /> : null}
      {successMessage ? <FeedbackBanner tone="info" message={successMessage} className="mt-4" /> : null}
      {receipt.isSuccess ? <FeedbackBanner tone="success" message="创建交易已确认，请返回发现页查看。" className="mt-2" /> : null}
    </section>
  );
}
