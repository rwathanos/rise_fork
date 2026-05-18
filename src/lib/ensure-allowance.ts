import type { PublicClient } from "viem";

import { erc20Abi } from "@/lib/abis";

type WriteContract = (variables: {
  address: `0x${string}`;
  abi: typeof erc20Abi;
  functionName: "approve";
  args: [`0x${string}`, bigint];
}) => Promise<`0x${string}`>;

/** Returns true when a new approve transaction was sent. */
export async function ensureErc20Allowance(params: {
  publicClient: PublicClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  spender: `0x${string}`;
  required: bigint;
  writeContractAsync: WriteContract;
}): Promise<boolean> {
  const { publicClient, owner, token, spender, required, writeContractAsync } = params;
  if (required === 0n) return false;

  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });

  if (allowance >= required) return false;

  await writeContractAsync({
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, required],
  });

  return true;
}
