import type { EIP1193Provider } from "viem";
import type { Connector } from "wagmi";
import { injected } from "wagmi/connectors";

function findOkxProvider() {
  if (typeof window === "undefined") return undefined;

  if (window.okxwallet) {
    return {
      id: "okxWallet",
      name: "OKX Wallet",
      provider: window.okxwallet,
    };
  }

  const ethereum = window.ethereum;
  if (!ethereum) return undefined;

  const providers = ethereum.providers ?? [ethereum];
  for (const provider of providers) {
    const candidate = provider as EIP1193Provider & { isOkxWallet?: boolean; isOKExWallet?: boolean };
    if (candidate.isOkxWallet || candidate.isOKExWallet) {
      return {
        id: "okxWallet",
        name: "OKX Wallet",
        provider: candidate,
      };
    }
  }

  return undefined;
}

export const walletConnectors = [injected({ target: "metaMask" }), injected({ target: findOkxProvider })] as const;

const CONNECTOR_PRIORITY = ["metamask", "io.metamask", "okxwallet", "com.okex.wallet"];

function getWalletFamilyKey(connector: Connector) {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  const text = `${id} ${name}`;

  if (id === "metamask" || id === "io.metamask" || /metamask/i.test(name)) return "metamask";
  if (id === "okxwallet" || id === "com.okex.wallet" || /okx|okex/i.test(text)) return "okx";
  if (/rabby/i.test(text)) return "rabby";
  if (/coinbase/i.test(text)) return "coinbase";
  if (/binance/i.test(text)) return "binance";

  return id;
}

export function sortWalletConnectors(connectors: readonly Connector[]) {
  return [...connectors].sort((left, right) => {
    const leftIndex = CONNECTOR_PRIORITY.indexOf(left.id.toLowerCase());
    const rightIndex = CONNECTOR_PRIORITY.indexOf(right.id.toLowerCase());
    const leftRank = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const rightRank = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name, "zh-CN");
  });
}

export function uniqueWalletConnectors(connectors: readonly Connector[]) {
  const seen = new Set<string>();

  return sortWalletConnectors(connectors).filter((connector) => {
    const key = getWalletFamilyKey(connector);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatWalletConnectorName(name: string) {
  if (/okx/i.test(name) || /okex/i.test(name)) return "OKX 钱包";
  if (/metamask/i.test(name)) return "MetaMask";
  if (/rabby/i.test(name)) return "Rabby";
  if (/coinbase/i.test(name)) return "Coinbase Wallet";
  if (/binance/i.test(name)) return "Binance Web3 Wallet";
  return name;
}
