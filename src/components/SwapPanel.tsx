"use client";

import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { erc20Abi, risePoolAbi } from "@/lib/abis";
import { previewTradingFees } from "@/lib/fees";
import { formatAmountInput, formatTokenAmount } from "@/lib/format";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { TransactionReviewModal } from "@/components/TransactionReviewModal";
import { RiskSummaryCard } from "@/components/RiskSummaryCard";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { useMounted } from "@/hooks/useMounted";

type Props = {
  pool: `0x${string}`;
  token?: `0x${string}`;
  backingDecimals: number;
  isNativeBacking: boolean;
  backingAsset?: `0x${string}`;
  creatorVariableFeeBps: number;
  tokenSymbol?: string;
  onPoolActivity?: () => void | Promise<void>;
};

const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

export function SwapPanel({
  pool,
  token,
  backingDecimals,
  isNativeBacking,
  backingAsset,
  creatorVariableFeeBps,
  tokenSymbol,
  onPoolActivity,
}: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const mounted = useMounted();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const parsedAmount = (() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, mode === "buy" ? backingDecimals : 18);
    } catch {
      return 0n;
    }
  })();

  const { data: quoteBuy, isFetching: isQuoteBuyFetching } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "quoteBuy",
    args: [parsedAmount],
    query: { enabled: mode === "buy" && parsedAmount > 0n },
  });

  const { data: quoteSell, isFetching: isQuoteSellFetching } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "quoteSell",
    args: [parsedAmount],
    query: { enabled: mode === "sell" && parsedAmount > 0n },
  });

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    query: { enabled: Boolean(address) && isNativeBacking },
  });

  const { data: backingBalance, refetch: refetchBackingBalance } = useReadContract({
    address: backingAsset,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address) && !isNativeBacking && Boolean(backingAsset) },
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address) && Boolean(token) },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const quoteLoading = parsedAmount > 0n && (mode === "buy" ? isQuoteBuyFetching || quoteBuy === undefined : isQuoteSellFetching || quoteSell === undefined);
  const backingSymbol = isNativeBacking ? "BNB" : "USDT";
  const paymentSymbol = mode === "buy" ? backingSymbol : (tokenSymbol ?? "代币");
  const paymentDecimals = mode === "buy" ? backingDecimals : 18;
  const paymentBalance = mode === "buy" ? (isNativeBacking ? nativeBalance?.value : backingBalance) : tokenBalance;
  const exceedsBalance = Boolean(
    address && parsedAmount > 0n && paymentBalance !== undefined && parsedAmount > paymentBalance,
  );
  const submitDisabled = isPending || parsedAmount === 0n || exceedsBalance || quoteLoading;
  const balanceLabel = !mounted
    ? "请先连接钱包"
    : !address
      ? "请先连接钱包"
      : paymentBalance !== undefined
        ? `余额 ${formatAmountInput(paymentBalance, paymentDecimals)} ${paymentSymbol}`
        : "余额读取中…";

  function fillMaxAmount() {
    if (paymentBalance === undefined || paymentBalance === 0n) return;
    setAmount(formatAmountInput(paymentBalance, paymentDecimals));
  }

  useEffect(() => {
    if (!receipt.isSuccess) return;
    void refetchNativeBalance();
    void refetchBackingBalance();
    void refetchTokenBalance();
    void onPoolActivity?.();
  }, [onPoolActivity, receipt.data?.blockNumber, receipt.isSuccess, refetchBackingBalance, refetchNativeBalance, refetchTokenBalance]);

  const feePreview =
    mode === "buy" && parsedAmount > 0n
      ? previewTradingFees(parsedAmount, creatorVariableFeeBps)
      : undefined;
  const minOut =
    mode === "buy"
      ? (quoteBuy ? (quoteBuy * BigInt(10_000 - slippageBps)) / 10_000n : 0n)
      : (quoteSell ? (quoteSell * BigInt(10_000 - slippageBps)) / 10_000n : 0n);
  const slippagePct = (slippageBps / 100).toFixed(2);
  const riskLevel = slippageBps >= 300 ? "高风险" : slippageBps >= 100 ? "中风险" : "低风险";

  async function ensureAllowance(spender: `0x${string}`, asset: `0x${string}`, value: bigint) {
    if (!address || !publicClient) return;

    const allowance = await publicClient.readContract({
      address: asset,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, spender],
    });
    if (allowance >= value) return;

    await writeContractAsync({
      address: asset,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, value],
    });
  }

  async function handleSubmit() {
    if (!address || parsedAmount === 0n || exceedsBalance) return;

    setErrorMessage(null);

    try {
      if (mode === "buy") {
        if (!isNativeBacking && backingAsset) {
          await ensureAllowance(pool, backingAsset, parsedAmount);
        }
        const hash = await writeContractAsync({
          address: pool,
          abi: risePoolAbi,
          functionName: "buy",
          args: [parsedAmount, minOut],
          value: isNativeBacking ? parsedAmount : 0n,
        });
        setTxHash(hash);
        return;
      }

      if (!token) return;
      await ensureAllowance(pool, token, parsedAmount);
      const hash = await writeContractAsync({
        address: pool,
        abi: risePoolAbi,
        functionName: "sell",
        args: [parsedAmount, minOut],
      });
      setTxHash(hash);
    } catch (error) {
      setErrorMessage(getTxErrorMessage(error));
    }
  }

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("buy")}
          className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === "buy" ? "primary-btn font-semibold" : "line-btn text-[#d9ebff]"}`}
        >
          买入
        </button>
        <button
          type="button"
          onClick={() => setMode("sell")}
          className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === "sell" ? "primary-btn font-semibold" : "line-btn text-[#d9ebff]"}`}
        >
          卖出
        </button>
      </div>

      <label className="block text-sm text-[#a9c0dd]">
        <div className="flex items-center justify-between gap-3">
          <span>{mode === "buy" ? "支付储备资产数量" : "卖出代币数量"}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${exceedsBalance ? "text-[#ffb999]" : "text-[#8ea6c7]"}`}>{balanceLabel}</span>
            {mounted && address && paymentBalance !== undefined && paymentBalance > 0n ? (
              <button type="button" onClick={fillMaxAmount} className="text-xs text-[#9fd9ff] hover:text-white">
                全部
              </button>
            ) : null}
          </div>
        </div>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={`field mt-2 w-full rounded-xl px-3 py-2 ${exceedsBalance ? "border-[#ff9b7c] text-[#ffd7c2] focus:border-[#ff9b7c]" : ""}`}
          placeholder="0.0"
        />
        {exceedsBalance && paymentBalance !== undefined ? (
          <p className="mt-2 text-xs text-[#ffb999]">
            输入数量超过钱包余额（{formatTokenAmount(paymentBalance, paymentDecimals, 6)} {paymentSymbol}）。
          </p>
        ) : null}
      </label>

      <label className="mt-4 block text-sm text-[#a9c0dd]">
        滑点容忍 (bps)
        <input
          type="number"
          value={slippageBps}
          onChange={(event) => setSlippageBps(Number(event.target.value))}
          className="field mt-2 w-full rounded-xl px-3 py-2"
        />
      </label>

      <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-[#071526ad] p-4 text-sm text-[#d2e5ff]">
        <p>交易费 1.25%：1% 协议 + 0.25% 地板/创作者（本币 {creatorVariableFeeBps}/25 给创作者）。</p>
        {mode === "buy" && parsedAmount > 0n ? (
          <p>
            预估到手代币：{quoteLoading ? "报价更新中…" : quoteBuy ? formatTokenAmount(quoteBuy, 18, 6) : "—"}
            {feePreview ? `，净输入储备：${formatTokenAmount(feePreview.net, backingDecimals, 6)}` : ""}
          </p>
        ) : null}
        {mode === "sell" && parsedAmount > 0n ? (
          <p>预估到手储备：{quoteLoading ? "报价更新中…" : quoteSell ? formatTokenAmount(quoteSell, backingDecimals, 6) : "—"}</p>
        ) : null}
      </div>

      <RiskSummaryCard
        title="交易前风险检查"
        tone={slippageBps >= 300 ? "warn" : "neutral"}
        lines={[
          `滑点容忍：${slippagePct}%（${riskLevel}）`,
          mode === "buy"
            ? `最差成交：至少获得 ${minOut > 0n ? formatTokenAmount(minOut, 18, 6) : "—"} 代币`
            : `最差成交：至少获得 ${minOut > 0n ? formatTokenAmount(minOut, backingDecimals, 6) : "—"} 储备`,
        ]}
      />

      <button
        type="button"
        onClick={() => setReviewOpen(true)}
        disabled={submitDisabled}
        className="primary-btn mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {isPending ? "等待钱包确认…" : mode === "buy" ? "确认买入" : "确认卖出"}
      </button>

      {errorMessage ? <FeedbackBanner tone="error" message={errorMessage} /> : null}
      {receipt.isSuccess ? <FeedbackBanner tone="success" message="交易已确认。" /> : null}

      <TransactionReviewModal
        open={reviewOpen}
        title="交易确认"
        lines={[
          `方向：${mode === "buy" ? "买入" : "卖出"}`,
          `输入数量：${amount || "0"}`,
          `滑点：${slippagePct}%（${riskLevel}）`,
          `最差成交：${
            mode === "buy"
              ? `${minOut > 0n ? formatTokenAmount(minOut, 18, 6) : "—"} 代币`
              : `${minOut > 0n ? formatTokenAmount(minOut, backingDecimals, 6) : "—"} 储备`
          }`,
        ]}
        onCancel={() => setReviewOpen(false)}
        onConfirm={() => {
          setReviewOpen(false);
          void handleSubmit();
        }}
      />
    </section>
  );
}
