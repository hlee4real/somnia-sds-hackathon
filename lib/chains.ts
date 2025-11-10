import { defineChain } from 'viem';

/**
 * Somnia Mainnet Chain Definition
 * Based on network.md configuration:
 * - Chain ID: 5031
 * - RPC URL: https://api.infra.mainnet.somnia.network/
 * - Explorer: https://explorer.somnia.network/
 * - Native Token: SOMI
 */
export const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  network: 'somnia-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMI',
    symbol: 'SOMI',
  },
  rpcUrls: {
    default: {
      http: ['https://api.infra.mainnet.somnia.network/'],
    },
    public: {
      http: ['https://api.infra.mainnet.somnia.network/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://explorer.somnia.network',
    },
  },
  testnet: false,
});

/**
 * Somnia Dream Testnet Chain Definition
 * Includes webSocket URLs for proper SDK subscription support
 */
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://api.infra.testnet.somnia.network/ws'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://api.infra.testnet.somnia.network/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://shannon-explorer.somnia.network/' },
  },
  testnet: true,
});
