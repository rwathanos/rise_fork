import { ORIGINATION_FEE_BPS } from "@/lib/fees";

const WAD = 10n ** 18n;
const BPS = 10_000n;

export function toWad(amount: bigint, backingDecimals: number): bigint {
  if (backingDecimals === 18) return amount;
  if (backingDecimals < 18) return amount * 10n ** BigInt(18 - backingDecimals);
  return amount / 10n ** BigInt(backingDecimals - 18);
}

/** Matches RisePool._availableReserveWad — max additional borrow the pool can send out. */
export function computeAvailableBorrowLiquidity(
  realReserveWad: bigint,
  totalBorrowedReserveWad: bigint,
  backingDecimals: number,
): bigint {
  if (realReserveWad <= totalBorrowedReserveWad) return 0n;
  return fromWad(realReserveWad - totalBorrowedReserveWad, backingDecimals);
}

export function fromWad(amountWad: bigint, backingDecimals: number): bigint {
  if (backingDecimals === 18) return amountWad;
  if (backingDecimals < 18) return amountWad / 10n ** BigInt(18 - backingDecimals);
  return amountWad * 10n ** BigInt(backingDecimals - 18);
}

/** Matches RisePool.openBorrow debt cap (collateral * floor, minus existing debt and origination fee). */
export function computeMaxBorrowAmount(params: {
  floorPriceWad: bigint;
  existingCollateral: bigint;
  newCollateral: bigint;
  existingDebtBacking: bigint;
  backingDecimals: number;
}): bigint {
  const { floorPriceWad, existingCollateral, newCollateral, existingDebtBacking, backingDecimals } = params;

  const totalCollateral = existingCollateral + newCollateral;
  if (floorPriceWad === 0n || totalCollateral === 0n) return 0n;

  const maxDebtWad = (totalCollateral * floorPriceWad) / WAD;
  const existingDebtWad = toWad(existingDebtBacking, backingDecimals);
  if (existingDebtWad >= maxDebtWad) return 0n;

  const headroomWad = maxDebtWad - existingDebtWad;
  const maxBorrowWad = (headroomWad * BPS) / (BPS + BigInt(ORIGINATION_FEE_BPS));
  return fromWad(maxBorrowWad, backingDecimals);
}

export function validateCollateralBalance(collateralAmount: bigint, walletBalance?: bigint): string | null {
  if (collateralAmount === 0n) return null;
  if (walletBalance === undefined) return null;
  if (collateralAmount > walletBalance) {
    return "抵押数量超过钱包余额，请减少抵押或先买入代币。";
  }
  return null;
}

export function validateBorrowAmount(params: {
  borrowAmount: bigint;
  maxBorrowAmount: bigint;
  collateralAmount: bigint;
  availablePoolLiquidity?: bigint;
}): string | null {
  if (params.collateralAmount === 0n) {
    return "请先填写抵押代币数量。";
  }
  if (params.borrowAmount === 0n) {
    return "请先填写借出储备数量。";
  }
  if (params.availablePoolLiquidity !== undefined && params.borrowAmount > params.availablePoolLiquidity) {
    return "借出储备超过池内可借流动性，请减少借出数量。";
  }
  if (params.maxBorrowAmount === 0n) {
    return "当前抵押下无可借额度，请增加抵押或减少既有债务。";
  }
  if (params.borrowAmount > params.maxBorrowAmount) {
    return "借出储备超过可借上限（含 3% 开仓费），请减少借出数量或增加抵押。";
  }
  return null;
}
