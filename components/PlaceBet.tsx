/**
 * Place Bet Component
 * Allows users to place bets on Bitcoin price movement
 */
'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { BITCOIN_BET_ABI } from '../lib/contract-abi';
import { formatPrice } from '../lib/encoding';

interface PlaceBetProps {
  currentPrice: bigint | null;
}

export default function PlaceBet({ currentPrice }: PlaceBetProps) {
  const [prediction, setPrediction] = useState<'higher' | 'lower' | null>(null);
  const { isConnected } = useAccount();
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const isContractValid = contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42;

  const handlePlaceBet = async (betPrediction: 'higher' | 'lower') => {
    if (!isConnected || !isContractValid) {
      alert('Please connect your wallet first');
      return;
    }

    if (!currentPrice || currentPrice === 0n) {
      alert('Waiting for price data...');
      return;
    }

    setPrediction(betPrediction);

    try {
      writeContract({
        address: contractAddress!,
        abi: BITCOIN_BET_ABI,
        functionName: 'placeBet',
        args: [betPrediction === 'higher'],
      });
    } catch (err) {
      console.error('Error placing bet:', err);
    }
  };

  // Reset state after successful bet
  if (isConfirmed && prediction) {
    setTimeout(() => {
      setPrediction(null);
    }, 3000);
  }

  if (!isConnected) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4 text-center">Place Your Bet</h3>
        <p className="text-white/70 text-center mb-4">
          Connect your wallet to start betting on Bitcoin price movements
        </p>
      </div>
    );
  }

  if (!isContractValid) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4 text-center">Place Your Bet</h3>
        <p className="text-white/70 text-center mb-4">
          Please deploy the contract and set CONTRACT_ADDRESS in .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <h3 className="text-white text-2xl font-bold mb-4 text-center">Place Your Bet</h3>

      {currentPrice && currentPrice > 0n ? (
        <div className="mb-6 text-center">
          <div className="text-white/60 text-sm mb-1">Current Price</div>
          <div className="text-white text-3xl font-bold">{formatPrice(currentPrice)}</div>
          <div className="text-white/70 text-sm mt-2">
            Predict if the next price will be higher or lower
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center">
          <div className="text-white/60">Loading price...</div>
        </div>
      )}

      {isConfirmed && prediction && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
          <p className="text-white text-center font-semibold">
            Bet placed successfully! You predicted {prediction}.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-white text-sm text-center">
            Error: {(error as any).shortMessage || error.message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handlePlaceBet('higher')}
          disabled={isPending || isConfirming || !currentPrice || currentPrice === 0n}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {isPending && prediction === 'higher' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Placing...
            </span>
          ) : isConfirming && prediction === 'higher' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Confirming...
            </span>
          ) : (
            <>
              <div className="text-2xl mb-1">📈</div>
              <div>HIGHER</div>
            </>
          )}
        </button>

        <button
          onClick={() => handlePlaceBet('lower')}
          disabled={isPending || isConfirming || !currentPrice || currentPrice === 0n}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {isPending && prediction === 'lower' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Placing...
            </span>
          ) : isConfirming && prediction === 'lower' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Confirming...
            </span>
          ) : (
            <>
              <div className="text-2xl mb-1">📉</div>
              <div>LOWER</div>
            </>
          )}
        </button>
      </div>

      {hash && (
        <div className="mt-4 text-center">
          <p className="text-white/60 text-xs">
            Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
          </p>
        </div>
      )}
    </div>
  );
}
