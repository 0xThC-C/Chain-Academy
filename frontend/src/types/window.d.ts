// Type declarations for wallet providers

interface EthereumProvider {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: Function): void;
  removeListener(event: string, handler: Function): void;
  _events?: any;
  _metamask?: { isRabby?: boolean };
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    __PROTECTION_LOADED__?: boolean;
  }
}

export {};