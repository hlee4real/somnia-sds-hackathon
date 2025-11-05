/**
 * Bitcoin Price Display Component
 * Shows real-time BTC price with live updates
 */
'use client';

import { useBTCPrice, useRefreshBTCPrice } from '../hooks/useBTCPrice';
import { formatPrice, formatTimestamp } from '../lib/encoding';

export default function BTCPriceDisplay() {
  const priceState = useBTCPrice();
  const { refresh, isRefreshing } = useRefreshBTCPrice();

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh:', error);
      alert('Failed to refresh price. Please try again.');
    }
  };

  if (priceState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-500 to-yellow-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading Bitcoin price...</p>
        </div>
      </div>
    );
  }

  if (priceState.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-500 to-pink-600">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md">
          <h2 className="text-white text-2xl font-bold mb-4">Error</h2>
          <p className="text-white/90 mb-6">{priceState.error}</p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-white text-red-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const priceFormatted = priceState.priceBigInt
    ? formatPrice(priceState.priceBigInt)
    : '$0.00';

  const timestampFormatted = priceState.timestamp
    ? formatTimestamp(BigInt(priceState.timestamp))
    : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-yellow-500 to-amber-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Bitcoin Price Tracker
          </h1>
          <p className="text-white/90 text-lg">
            Real-time updates powered by Somnia Data Streams
          </p>
        </div>

        {/* Main Price Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
            {/* Bitcoin Symbol */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-full mb-4">
                <span className="text-white text-4xl font-bold">₿</span>
              </div>
              <h2 className="text-white text-2xl font-semibold">Bitcoin (BTC)</h2>
            </div>

            {/* Price Display */}
            <div className="text-center mb-8">
              <div className="text-white text-7xl font-bold mb-2 animate-pulse-subtle">
                {priceFormatted}
              </div>
              <div className="text-white/70 text-xl">USD</div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-sm mb-1">Last Updated</div>
                <div className="text-white text-lg font-medium">
                  {timestampFormatted}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-white/60 text-sm mb-1">Update Interval</div>
                <div className="text-white text-lg font-medium">Every 30 seconds</div>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/80 text-sm font-medium">Live Updates Active</span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full bg-white text-orange-600 font-semibold py-4 px-6 rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isRefreshing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                  Refreshing...
                </span>
              ) : (
                'Refresh Now'
              )}
            </button>

            {/* Data Source Info */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-center text-white/50 text-sm">
                Data from CoinMarketCap API • Stored on Somnia Blockchain
              </div>
              {priceState.updater && (
                <div className="text-center text-white/40 text-xs mt-2">
                  Publisher: {priceState.updater.slice(0, 6)}...{priceState.updater.slice(-4)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-white font-semibold mb-2">Real-time Updates</h3>
            <p className="text-white/70 text-sm">Automatic price updates every 30 seconds</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="text-white font-semibold mb-2">Blockchain Verified</h3>
            <p className="text-white/70 text-sm">All data stored on Somnia blockchain</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-white font-semibold mb-2">Live Streaming</h3>
            <p className="text-white/70 text-sm">Instant updates via Data Streams</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
