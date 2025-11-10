/**
 * Connect Wallet Button Component
 * Handles wallet connection with Somnia Testnet as default
 */
'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { somniaTestnet } from '@/lib/chains';
import { useEffect, useState } from 'react';

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showConnectors, setShowConnectors] = useState(false);

  // Check if connected to wrong network
  const isWrongNetwork = isConnected && chain?.id !== somniaTestnet.id;

  // Auto-switch to Somnia Testnet if on wrong network
  useEffect(() => {
    if (isWrongNetwork && switchChain) {
      switchChain({ chainId: somniaTestnet.id });
    }
  }, [isWrongNetwork, switchChain]);

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setShowConnectors(false);
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {/* Network Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {chain?.name || 'Connected'}
          </span>
        </div>

        {/* Address & Disconnect Button */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-sm font-mono font-medium">
            {formatAddress(address)}
          </span>
          <button
            onClick={handleDisconnect}
            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Disconnect
          </button>
        </div>

        {/* Wrong Network Warning */}
        {isWrongNetwork && (
          <button
            onClick={() => switchChain?.({ chainId: somniaTestnet.id })}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Switch to Somnia Testnet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {!showConnectors ? (
        <button
          onClick={() => setShowConnectors(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Connect Wallet</h3>
              <button
                onClick={() => setShowConnectors(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                
              </button>
            </div>

            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector, chainId: somniaTestnet.id });
                    setShowConnectors(false);
                  }}
                  disabled={status === 'pending'}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-left font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {connector.name[0]}
                    </div>
                    <span>{connector.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error.message}
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Default Network: <span className="font-semibold">{somniaTestnet.name}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showConnectors && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowConnectors(false)}
        />
      )}
    </div>
  );
}
