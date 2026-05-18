import { bsc, bscTestnet } from "wagmi/chains";

export const supportedChains = [bsc, bscTestnet] as const;

export const defaultChainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? "97");

export function factoryDeployBlock(): bigint | undefined {
  const configured = process.env.NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK;
  if (!configured) return undefined;
  return BigInt(configured);
}

export const bscMainnetUsdt = "0x55d398326f99059fF775485246999027B3197955" as const;
export const bscTestnetUsdt = "0x337610D27c682E347c9Cd60bD4b3B107B0bB37b7" as const;

export function usdtAddress(chainId: number): `0x${string}` {
  const override = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}` | undefined;
  if (override) return override;
  if (chainId === bsc.id) return bscMainnetUsdt;
  if (chainId === bscTestnet.id) return bscTestnetUsdt;
  return bscTestnetUsdt;
}

export function explorerAddressUrl(chainId: number, address: string) {
  const base = chainId === bsc.id ? "https://bscscan.com" : "https://testnet.bscscan.com";
  return `${base}/address/${address}`;
}

export function explorerTxUrl(chainId: number, hash: string) {
  const base = chainId === bsc.id ? "https://bscscan.com" : "https://testnet.bscscan.com";
  return `${base}/tx/${hash}`;
}
