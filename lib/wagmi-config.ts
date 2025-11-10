/**
 * Wagmi Configuration
 * Set up wagmi with Somnia Testnet as default network
 */
import { http, createConfig } from 'wagmi';
import { somniaTestnet } from './chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - Get from https://cloud.walletconnect.com
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

/**
 * Wagmi Configuration
 * Chains: Somnia Testnet (default)
 * Connectors: MetaMask/Injected, WalletConnect
 */
export const config = createConfig({
  chains: [somniaTestnet],
  connectors: [
    injected({
      target: 'metaMask',
    }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
          }),
        ]
      : []),
  ],
  transports: {
    [somniaTestnet.id]: http(),
  },
});
