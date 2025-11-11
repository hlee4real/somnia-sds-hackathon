/**
 * Bet History Component
 * Displays user's betting history and results
 */
'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { BITCOIN_BET_ABI, Bet } from '../lib/contract-abi';
import { formatPrice } from '../lib/encoding';
import { formatTimestamp } from '../lib/encoding';

export default function BetHistory() {
  const { address, isConnected } = useAccount();
  const [bets, setBets] = useState<(Bet & { betId: number })[]>([]);
  const [isLoadingBets, setIsLoadingBets] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const isContractValid = contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42;

  // Get user's bet IDs
  const { data: betIds, refetch: refetchBetIds } = useReadContract({
    address: contractAddress,
    abi: BITCOIN_BET_ABI,
    functionName: 'getUserBets',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!isContractValid,
    },
  });

  // Watch for new bets placed by this user
  useWatchContractEvent({
    address: contractAddress,
    abi: BITCOIN_BET_ABI,
    eventName: 'BetPlaced',
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
          // Refetch bet IDs when user places a new bet
          refetchBetIds();
        }
      });
    },
    enabled: !!address && !!isContractValid,
  });

  // Watch for bet settlements
  useWatchContractEvent({
    address: contractAddress,
    abi: BITCOIN_BET_ABI,
    eventName: 'BetSettled',
    onLogs(logs) {
      logs.forEach((log) => {
        // Find the bet in our local state and update it
        setBets((prevBets) =>
          prevBets.map((bet) => {
            if (bet.betId === Number(log.args.betId)) {
              return {
                ...bet,
                settled: true,
                won: log.args.won || false,
              };
            }
            return bet;
          })
        );
      });
    },
    enabled: !!address && !!isContractValid,
  });

  // Fetch bet details when betIds change
  useEffect(() => {
    async function fetchBetDetails() {
      if (!betIds || betIds.length === 0 || !contractAddress) {
        setBets([]);
        return;
      }

      setIsLoadingBets(true);

      try {
        const { readContract } = await import('viem/actions');
        const { createPublicClient, http } = await import('viem');

        // Define Somnia chain configuration
        const somniaChain = {
          id: 50312, // Correct Somnia Devnet chain ID
          name: 'Somnia Devnet',
          network: 'somnia-devnet',
          nativeCurrency: {
            decimals: 18,
            name: 'STT',
            symbol: 'STT',
          },
          rpcUrls: {
            default: {
              http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network'],
            },
            public: {
              http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network'],
            },
          },
        };

        const publicClient = createPublicClient({
          chain: somniaChain,
          transport: http(),
        });

        const betDetails = await Promise.all(
          betIds.map(async (betId) => {
            const bet = await readContract(publicClient, {
              address: contractAddress!,
              abi: BITCOIN_BET_ABI,
              functionName: 'getBet',
              args: [betId],
            });

            return {
              ...bet,
              betId: Number(betId),
            };
          })
        );

        // Sort by timestamp (newest first)
        betDetails.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        setBets(betDetails);
      } catch (error) {
        console.error('Error fetching bet details:', error);
      } finally {
        setIsLoadingBets(false);
      }
    }

    fetchBetDetails();
  }, [betIds, contractAddress]);

  if (!isConnected) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4">Your Bet History</h3>
        <p className="text-white/70 text-center">Connect your wallet to view your betting history</p>
      </div>
    );
  }

  if (!isContractValid) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4">Your Bet History</h3>
        <p className="text-white/70 text-center">
          Please deploy the contract and set CONTRACT_ADDRESS in .env.local
        </p>
      </div>
    );
  }

  if (isLoadingBets) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4">Your Bet History</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (!bets || bets.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-white text-2xl font-bold mb-4">Your Bet History</h3>
        <p className="text-white/70 text-center">You haven't placed any bets yet</p>
      </div>
    );
  }

  const wonBets = bets.filter((bet) => bet.settled && bet.won).length;
  const lostBets = bets.filter((bet) => bet.settled && !bet.won).length;
  const pendingBets = bets.filter((bet) => !bet.settled).length;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <h3 className="text-white text-2xl font-bold mb-4">Your Bet History</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
          <div className="text-green-400 text-2xl font-bold">{wonBets}</div>
          <div className="text-white/70 text-xs">Won</div>
        </div>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-center">
          <div className="text-red-400 text-2xl font-bold">{lostBets}</div>
          <div className="text-white/70 text-xs">Lost</div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
          <div className="text-yellow-400 text-2xl font-bold">{pendingBets}</div>
          <div className="text-white/70 text-xs">Pending</div>
        </div>
      </div>

      {/* Bet List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {bets.map((bet) => (
          <div
            key={bet.betId}
            className={`p-4 rounded-lg border ${
              bet.settled
                ? bet.won
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {bet.prediction ? '📈' : '📉'}
                </span>
                <div>
                  <div className="text-white font-semibold">
                    {bet.prediction ? 'HIGHER' : 'LOWER'}
                  </div>
                  <div className="text-white/60 text-xs">
                    {formatTimestamp(bet.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {bet.settled ? (
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      bet.won
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {bet.won ? 'WON' : 'LOST'}
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/50 text-white">
                    PENDING
                  </div>
                )}
              </div>
            </div>

            <div className="text-white/80 text-sm">
              Price at bet: <span className="font-bold">{formatPrice(bet.priceAtBet)}</span>
            </div>

            <div className="text-white/60 text-xs mt-1">
              Bet ID: #{bet.betId}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
