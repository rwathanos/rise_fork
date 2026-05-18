import { zeroAddress } from "viem";

export function factoryAddress(): `0x${string}` | undefined {
  const value = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (!value || value === zeroAddress) return undefined;
  return value as `0x${string}`;
}

export function isNativeBacking(backingAsset?: string) {
  if (!backingAsset) return true;
  return backingAsset.toLowerCase() === zeroAddress;
}
