"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { erc20Abi, risePoolAbi } from "@/lib/abis";
import { previewOriginationFee } from "@/lib/fees";
import { formatTokenAmount } from "@/lib/format";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { TransactionReviewModal } from "@/components/TransactionReviewModal";
import { RiskSummaryCard } from "@/components/RiskSummaryCard";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useMounted } from "@/hooks/useMounted";

type Props = {
  pool: `0x${string}`;
  token?: `0x${string}`;
  backingDecimals: number;
  isNativeBacking: boolean;
  backingAsset?: `0x${string}`;
};

export function BorrowPanel({ pool, token, backingDecimals, isNativeBacking, backingAsset }: Props) {
  const { address } = useAccount();
  const mounted = useMounted();
  const [collateral, setCollateral] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<"borrow" | "repay" | null>(null);

  const collateralAmount = useMemo(() => {
    try {
      return collateral ? parseUnits(collateral, 18) : 0n;
    } catch {
      return 0n;
    }
  }, [collateral]);

  const borrowParsed = useMemo(() => {
    try {
      return borrowAmount ? parseUnits(borrowAmount, backingDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [borrowAmount, backingDecimals]);

  const { data: maxBorrow } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "maxBorrow",
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

  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const waitingPosition = mounted && Boolean(address) && maxBorrow === undefined && position === undefined;

  if (waitingPosition) {
    return (
      <LoadingSkeleton
        blocks={[
          { width: "w-24", height: "h-6" },
          { width: "w-full", height: "h-12", rounded: "rounded-xl" },
          { width: "w-full", height: "h-12", rounded: "rounded-xl" },
          { width: "w-full", height: "h-24", rounded: "rounded-xl" },
        ]}
      />
    );
  }

  const originationFee = borrowParsed > 0n ? previewOriginationFee(borrowParsed) : 0n;
  const debtNow = position?.[1] ?? 0n;
  const additionalNow = maxBorrow ?? 0n;
  const capNow = debtNow + additionalNow;
  const healthNowPct = capNow > 0n ? Number(((capNow - debtNow) * 10_000n) / capNow) / 100 : 100;
  const projectedDebt = debtNow + borrowParsed;
  const healthAfterPct = capNow > 0n ? Number(((capNow > projectedDebt ? capNow - projectedDebt : 0n) * 10_000n) / capNow) / 100 : 100;
  const healthLevel = healthAfterPct < 10 ? "高风险" : healthAfterPct < 25 ? "中风险" : "低风险";

  async function handleBorrow() {
    if (!token || !address || collateralAmount === 0n || borrowParsed === 0n) return;

    setErrorMessage(null);

    try {
      await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [pool, collateralAmount],
      });
      const hash = await writeContractAsync({
        address: pool,
        abi: risePoolAbi,
        functionName: "openBorrow",
        args: [collateralAmount, borrowParsed],
      });
      setTxHash(hash);
    } catch (error) {
      setErrorMessage(getTxErrorMessage(error));
    }
  }

  async function handleRepay() {
    if (!address || !position || position[1] === 0n) return;

    setErrorMessage(null);

    try {
      const debt = position[1];
      if (!isNativeBacking && backingAsset) {
        await writeContractAsync({
          address: backingAsset,
          abi: erc20Abi,
          functionName: "approve",
          args: [pool, debt],
        });
      }
      const hash = await writeContractAsync({
        address: pool,
        abi: risePoolAbi,
        functionName: "repayAll",
        args: [],
        value: isNativeBacking ? debt : 0n,
      });
      setTxHash(hash);
    } catch (error) {
      setErrorMessage(getTxErrorMessage(error));
    }
  }

  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="section-title text-lg font-semibold">借贷</h2>
      <p className="muted mt-2 text-sm">
        可借上限按地板价计算；开仓费 3% 注入地板；无持续利息、无协议清算；仅支持一次性全额还款。
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-[#a9c0dd]">
          抵押代币
          <input
            value={collateral}
            onChange={(event) => setCollateral(event.target.value)}
            className="field mt-2 w-full rounded-xl px-3 py-2"
          />
        </label>
        <label className="block text-sm text-[#a9c0dd]">
          借出储备
          <input
            value={borrowAmount}
            onChange={(event) => setBorrowAmount(event.target.value)}
            className="field mt-2 w-full rounded-xl px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#071526ad] p-4 text-sm text-[#d2e5ff]">
        <p>当前可借：{maxBorrow !== undefined ? formatTokenAmount(maxBorrow, backingDecimals, 6) : "—"}</p>
        <p>开仓费：{borrowParsed > 0n ? formatTokenAmount(originationFee, backingDecimals, 6) : "—"}</p>
        <p>
          当前仓位：抵押 {position ? formatTokenAmount(position[0], 18, 4) : "—"} / 债务
          {position ? formatTokenAmount(position[1], backingDecimals, 6) : "—"}
        </p>
      </div>

      <RiskSummaryCard
        title="借贷前风险检查"
        tone={healthAfterPct < 10 ? "warn" : "neutral"}
        lines={[
          `当前健康度：${healthNowPct.toFixed(2)}%`,
          `开仓后预计健康度：${healthAfterPct.toFixed(2)}%（${healthLevel}）`,
          "健康度越低，仓位越接近地板借款上限。",
        ]}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setReviewMode("borrow")}
          disabled={isPending}
          className="primary-btn flex-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          开仓借贷
        </button>
        <button
          type="button"
          onClick={() => setReviewMode("repay")}
          disabled={isPending || !position || position[1] === 0n}
          className="line-btn flex-1 rounded-xl px-4 py-3 text-sm disabled:opacity-60"
        >
          全额还款
        </button>
      </div>

      {errorMessage ? <FeedbackBanner tone="error" message={errorMessage} /> : null}
      {receipt.isSuccess ? <FeedbackBanner tone="success" message="交易已确认。" /> : null}

      <TransactionReviewModal
        open={Boolean(reviewMode)}
        title={reviewMode === "borrow" ? "借贷确认" : "还款确认"}
        lines={
          reviewMode === "borrow"
            ? [
                `抵押数量：${collateral || "0"}`,
                `借出数量：${borrowAmount || "0"}`,
                `开仓费：${borrowParsed > 0n ? formatTokenAmount(originationFee, backingDecimals, 6) : "—"}`,
                `开仓后健康度：${healthAfterPct.toFixed(2)}%（${healthLevel}）`,
              ]
            : [
                "还款方式：一次性全额还款",
                `当前债务：${position ? formatTokenAmount(position[1], backingDecimals, 6) : "—"}`,
                `资产类型：${isNativeBacking ? "BNB" : "ERC20"}`,
              ]
        }
        onCancel={() => setReviewMode(null)}
        onConfirm={() => {
          const mode = reviewMode;
          setReviewMode(null);
          if (mode === "borrow") {
            void handleBorrow();
          } else if (mode === "repay") {
            void handleRepay();
          }
        }}
      />
    </section>
  );
}
