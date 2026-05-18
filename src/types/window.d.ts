import type { EIP1193Provider } from "viem";

type InjectedEthereumProvider = EIP1193Provider & {
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  providers?: InjectedEthereumProvider[];
};

declare global {
  interface Window {
    okxwallet?: EIP1193Provider;
    ethereum?: InjectedEthereumProvider;
  }
}

export {};
