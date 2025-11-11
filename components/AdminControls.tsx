/**
 * Admin Controls Component
 * Allows admin to manually update the contract price
 */
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BITCOIN_BET_ABI } from '../lib/contract-abi';
import { getCurrentPrice } from '../lib/price-fetcher';
import { formatPrice } from '../lib/encoding';

export default function AdminControls() {
  const { address } = useAccount();
  const [isFetching, setIsFetching] = useState(false);
  const [latestPrice, setLatestPrice] = useState<{ price: bigint; timestamp: bigint } | null>(null);

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const adminAddress = process.env.NEXT_PUBLIC_WALLET_ADDRESS?.toLowerCase();
  const isAdmin = address?.toLowerCase() === adminAddress;

  const fetchLatestPrice = async () => {
    setIsFetching(true);
    try {
      const priceData = await getCurrentPrice();
      if (priceData) {
        setLatestPrice({
          price: priceData.price,
          timestamp: priceData.timestamp,
        });
      }
    } catch (err) {
      console.error('Error fetching price:', err);
      alert('Failed to fetch price from Streams');
    } finally {
      setIsFetching(false);
    }
  };

  const updateContractPrice = async () => {
    if (!latestPrice || !contractAddress) return;

    writeContract({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'updatePrice',
      args: [latestPrice.price, latestPrice.timestamp],
    });
  };

  if (!isAdmin) {
    return null; // Only show to admin
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-purple-500/10 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚙️</span>
          Admin Controls
        </h3>

        {isConfirmed && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
            <p className="text-white text-center font-semibold">
              Price updated successfully! All pending bets have been settled.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-white text-sm">
              Error: {(error as any).shortMessage || error.message}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Step 1: Fetch Latest Price */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-white/70 text-sm mb-2">Step 1: Fetch Latest Price from Streams</div>
            <button
              onClick={fetchLatestPrice}
              disabled={isFetching}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
            >
              {isFetching ? 'Fetching...' : 'Fetch Latest Price'}
            </button>

            {latestPrice && (
              <div className="mt-3 text-white text-sm">
                <div>Price: <span className="font-bold">{formatPrice(latestPrice.price)}</span></div>
                <div>Timestamp: <span className="font-mono">{new Date(Number(latestPrice.timestamp) * 1000).toLocaleString()}</span></div>
              </div>
            )}
          </div>

          {/* Step 2: Update Contract */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-white/70 text-sm mb-2">Step 2: Update Contract & Settle Bets</div>
            <button
              onClick={updateContractPrice}
              disabled={!latestPrice || isPending || isConfirming}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing...
                </span>
              ) : isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Confirming...
                </span>
              ) : (
                'Update Contract Price'
              )}
            </button>
          </div>
        </div>

        {hash && (
          <div className="mt-4 text-center">
            <p className="text-white/60 text-xs">
              Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
            </p>
          </div>
        )}

        <div className="mt-4 text-white/50 text-xs text-center">
          Only visible to admin ({adminAddress?.slice(0, 6)}...{adminAddress?.slice(-4)})
        </div>
      </div>
    </div>
  );
}
