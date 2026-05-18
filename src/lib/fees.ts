export const TOTAL_TRADING_FEE_BPS = 125;
export const PROTOCOL_TRADING_FEE_BPS = 100;
export const VARIABLE_TRADING_FEE_BPS = 25;
export const ORIGINATION_FEE_BPS = 300;

export function previewTradingFees(amount: bigint, creatorVariableFeeBps: number) {
  const totalFee = (amount * BigInt(TOTAL_TRADING_FEE_BPS)) / 10_000n;
  const protocolFee = (amount * BigInt(PROTOCOL_TRADING_FEE_BPS)) / 10_000n;
  const variableFee = (amount * BigInt(VARIABLE_TRADING_FEE_BPS)) / 10_000n;
  const creatorFee = (variableFee * BigInt(creatorVariableFeeBps)) / BigInt(VARIABLE_TRADING_FEE_BPS);
  const floorFee = variableFee - creatorFee;
  return { totalFee, protocolFee, floorFee, creatorFee, net: amount - totalFee };
}

export function previewOriginationFee(borrowAmount: bigint) {
  return (borrowAmount * BigInt(ORIGINATION_FEE_BPS)) / 10_000n;
}
