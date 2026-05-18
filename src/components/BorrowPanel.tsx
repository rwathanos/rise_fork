"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { erc20Abi, risePoolAbi } from "@/lib/abis";
import { ensureErc20Allowance } from "@/lib/ensure-allowance";
import {
  computeAvailableBorrowLiquidity,
  computeMaxBorrowAmount,
  validateBorrowAmount,
  validateCollateralBalance,
} from "@/lib/borrow-limits";
import { previewOriginationFee } from "@/lib/fees";
import { formatAmountInput, formatTokenAmount } from "@/lib/format";
import { getTxErrorMessage } from "@/lib/tx-errors";
import { TransactionReviewModal } from "@/components/TransactionReviewModal";
import { RiskSummaryCard } from "@/components/RiskSummaryCard";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useMounted } from "@/hooks/useMounted";

const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

type Props = {
  pool: `0x${string}`;
  token?: `0x${string}`;
  backingDecimals: number;
  isNativeBacking: boolean;
  backingAsset?: `0x${string}`;
  tokenSymbol?: string;
  poolReserveBalance?: bigint;
  realReserveWad?: bigint;
  totalBorrowedReserveWad?: bigint;
  floorPriceWad?: bigint;
  onPoolActivity?: () => void | Promise<void>;
};

export function BorrowPanel({
  pool,
  token,
  backingDecimals,
  isNativeBacking,
  backingAsset,
  tokenSymbol,
  poolReserveBalance,
  realReserveWad,
  totalBorrowedReserveWad,
  floorPriceWad,
  onPoolActivity,
}: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
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

  const borrowInputInvalid = Boolean(borrowAmount) && borrowParsed === 0n;
  const collateralInputInvalid = Boolean(collateral) && collateralAmount === 0n;

  const { data: maxBorrowOnChain, refetch: refetchMaxBorrow } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "maxBorrow",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), staleTime: 0 },
  });

  const { data: position, refetch: refetchPosition } = useReadContract({
    address: pool,
    abi: risePoolAbi,
    functionName: "getPosition",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), staleTime: 0 },
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address && token), staleTime: 0 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const waitingPosition = mounted && Boolean(address) && maxBorrowOnChain === undefined && position === undefined;

  const backingSymbol = isNativeBacking ? "BNB" : "USDT";
  const availableBorrowLiquidity =
    realReserveWad !== undefined && totalBorrowedReserveWad !== undefined
      ? computeAvailableBorrowLiquidity(realReserveWad, totalBorrowedReserveWad, backingDecimals)
      : undefined;
  const reserveInfoLabel =
    poolReserveBalance !== undefined && availableBorrowLiquidity !== undefined
      ? `池内储备 ${formatTokenAmount(poolReserveBalance, backingDecimals, 6)} ${backingSymbol} · 可借流动性 ${formatTokenAmount(availableBorrowLiquidity, backingDecimals, 6)} ${backingSymbol}`
      : "池内储备读取中…";

  const existingCollateral = position?.[0] ?? 0n;
  const existingDebt = position?.[1] ?? 0n;

  const projectedMaxBorrow = useMemo(() => {
    if (floorPriceWad === undefined) return undefined;
    return computeMaxBorrowAmount({
      floorPriceWad,
      existingCollateral,
      newCollateral: collateralAmount,
      existingDebtBacking: existingDebt,
      backingDecimals,
    });
  }, [backingDecimals, collateralAmount, existingCollateral, existingDebt, floorPriceWad]);

  const collateralBalanceError = useMemo(() => {
    if (collateralInputInvalid) return "请输入有效数字。";
    return validateCollateralBalance(collateralAmount, tokenBalance);
  }, [collateralAmount, collateralInputInvalid, tokenBalance]);

  const borrowValidationError = useMemo(() => {
    if (borrowInputInvalid) return "请输入有效数字。";
    if (projectedMaxBorrow === undefined || borrowParsed === 0n) return null;
    return validateBorrowAmount({
      borrowAmount: borrowParsed,
      maxBorrowAmount: projectedMaxBorrow,
      collateralAmount,
      availablePoolLiquidity: availableBorrowLiquidity,
    });
  }, [availableBorrowLiquidity, borrowInputInvalid, borrowParsed, collateralAmount, projectedMaxBorrow]);

  const exceedsCollateralBalance = Boolean(
    address && collateralAmount > 0n && tokenBalance !== undefined && collateralAmount > tokenBalance,
  );

  const collateralBalanceLabel = !mounted
    ? "请先连接钱包"
    : !address
      ? "请先连接钱包"
      : tokenBalance !== undefined
        ? `钱包余额 ${formatAmountInput(tokenBalance, 18)} ${tokenSymbol ?? "代币"}`
        : "余额读取中…";

  const canSubmitBorrow =
    Boolean(token && address) &&
    collateralAmount > 0n &&
    borrowParsed > 0n &&
    !collateralBalanceError &&
    !borrowValidationError &&
    !exceedsCollateralBalance &&
    projectedMaxBorrow !== undefined &&
    borrowParsed <= projectedMaxBorrow;

  const refreshBorrowData = useCallback(async () => {
    await Promise.all([refetchTokenBalance(), refetchMaxBorrow(), refetchPosition()]);
    await onPoolActivity?.();
  }, [onPoolActivity, refetchMaxBorrow, refetchPosition, refetchTokenBalance]);

  useEffect(() => {
    if (!receipt.isSuccess) return;
    void refreshBorrowData();
  }, [receipt.data?.blockNumber, receipt.isSuccess, refreshBorrowData]);

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
  const debtNow = existingDebt;
  const capNow = (projectedMaxBorrow ?? 0n) + debtNow;
  const healthNowPct = capNow > 0n ? Number(((capNow - debtNow) * 10_000n) / capNow) / 100 : 100;
  const projectedDebt = debtNow + borrowParsed;
  const healthAfterPct = capNow > 0n ? Number(((capNow > projectedDebt ? capNow - projectedDebt : 0n) * 10_000n) / capNow) / 100 : 100;
  const healthLevel = healthAfterPct < 10 ? "高风险" : healthAfterPct < 25 ? "中风险" : "低风险";

  function fillMaxBorrow() {
    if (projectedMaxBorrow === undefined || projectedMaxBorrow === 0n) return;
    let amount = projectedMaxBorrow;
    if (availableBorrowLiquidity !== undefined && availableBorrowLiquidity < amount) {
      amount = availableBorrowLiquidity;
    }
    setBorrowAmount(formatUnits(amount, backingDecimals));
    setErrorMessage(null);
  }

  function fillMaxCollateral() {
    if (tokenBalance === undefined || tokenBalance === 0n) return;
    setCollateral(formatAmountInput(tokenBalance, 18));
    setErrorMessage(null);
  }

  function openBorrowReview() {
    const balanceError = validateCollateralBalance(collateralAmount, tokenBalance);
    if (balanceError) {
      setErrorMessage(balanceError);
      return;
    }
    const validationError = validateBorrowAmount({
      borrowAmount: borrowParsed,
      maxBorrowAmount: projectedMaxBorrow ?? 0n,
      collateralAmount,
      availablePoolLiquidity: availableBorrowLiquidity,
    });
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage(null);
    setReviewMode("borrow");
  }

  async function handleBorrow() {
    if (!canSubmitBorrow || !token || !address || !publicClient) return;

    setErrorMessage(null);

    try {
      await ensureErc20Allowance({
        publicClient,
        owner: address,
        token,
        spender: pool,
        required: collateralAmount,
        writeContractAsync,
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
    if (!address || !position || position[1] === 0n || !publicClient) return;

    setErrorMessage(null);

    try {
      const debt = position[1];
      if (!isNativeBacking && backingAsset) {
        await ensureErc20Allowance({
          publicClient,
          owner: address,
          token: backingAsset,
          spender: pool,
          required: debt,
          writeContractAsync,
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
          <span className="flex items-center justify-between gap-2">
            <span>抵押代币</span>
            <button
              type="button"
              onClick={fillMaxCollateral}
              disabled={!tokenBalance || tokenBalance === 0n}
              className="text-xs text-[#a8f2dc] hover:text-[#cdf9ed] disabled:opacity-40"
            >
              填入余额
            </button>
          </span>
          <input
            value={collateral}
            onChange={(event) => {
              setCollateral(event.target.value);
              setErrorMessage(null);
            }}
            className="field mt-2 w-full rounded-xl px-3 py-2"
          />
          <p className="mt-1 text-xs text-[#93aacc]">{collateralBalanceLabel}</p>
          {collateralBalanceError && collateralAmount > 0n ? (
            <p className="mt-1 text-xs text-[#ffcf9c]">{collateralBalanceError}</p>
          ) : null}
        </label>
        <label className="block text-sm text-[#a9c0dd]">
          <span className="flex items-center justify-between gap-2">
            <span>借出储备</span>
            <button
              type="button"
              onClick={fillMaxBorrow}
              disabled={!projectedMaxBorrow || projectedMaxBorrow === 0n}
              className="text-xs text-[#a8f2dc] hover:text-[#cdf9ed] disabled:opacity-40"
            >
              填入上限
            </button>
          </span>
          <input
            value={borrowAmount}
            onChange={(event) => {
              setBorrowAmount(event.target.value);
              setErrorMessage(null);
            }}
            className="field mt-2 w-full rounded-xl px-3 py-2"
          />
          <p className="mt-1 text-xs text-[#93aacc]">{reserveInfoLabel}</p>
          {borrowInputInvalid ? <p className="mt-1 text-xs text-[#ffcf9c]">请输入有效数量</p> : null}
          {borrowValidationError && borrowParsed > 0n ? (
            <p className="mt-1 text-xs text-[#ffcf9c]">{borrowValidationError}</p>
          ) : null}
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#071526ad] p-4 text-sm text-[#d2e5ff]">
        <p>
          本次最多可借：
          {projectedMaxBorrow !== undefined ? formatTokenAmount(projectedMaxBorrow, backingDecimals, 6) : "—"}
          {collateralAmount > 0n ? "（含当前抵押与表单新增抵押）" : null}
        </p>
        <p className="mt-1 text-xs text-[#93aacc]">
          链上当前仓位可追加：{maxBorrowOnChain !== undefined ? formatTokenAmount(maxBorrowOnChain, backingDecimals, 6) : "—"}
        </p>
        <p className="mt-2">开仓费：{borrowParsed > 0n ? formatTokenAmount(originationFee, backingDecimals, 6) : "—"}</p>
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
          onClick={openBorrowReview}
          disabled={isPending || !canSubmitBorrow}
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

      {errorMessage ? <FeedbackBanner tone="error" message={errorMessage} className="mt-4" /> : null}
      {receipt.isSuccess ? <FeedbackBanner tone="success" message="交易已确认。" className="mt-4" /> : null}

      <TransactionReviewModal
        open={Boolean(reviewMode)}
        title={reviewMode === "borrow" ? "借贷确认" : "还款确认"}
        lines={
          reviewMode === "borrow"
            ? [
                `抵押数量：${collateral || "0"}`,
                `钱包余额：${tokenBalance !== undefined ? formatTokenAmount(tokenBalance, 18, 4) : "—"} ${tokenSymbol ?? "代币"}`,
                `借出数量：${borrowAmount || "0"}`,
                `可借上限：${projectedMaxBorrow !== undefined ? formatTokenAmount(projectedMaxBorrow, backingDecimals, 6) : "—"}`,
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
