import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";

import { defaultChainId, supportedChains } from "./chains";
import { walletConnectors } from "./wallet-connectors";

const transports = {
  [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL),
  [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL),
} as const;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [...walletConnectors],
  transports,
  ssr: false,
  multiInjectedProviderDiscovery: true,
});

export const preferredChain = supportedChains.find((chain) => chain.id === defaultChainId) ?? bscTestnet;
