/**
 * React Hook for subscribing to real-time Bitcoin price updates
 */
'use client';

import { useEffect, useState } from 'react';
import { getClientSDK } from '../lib/client-sdk';
import { decodePriceUpdate } from '../lib/encoding';
import type { PriceUpdate } from '../lib/encoding';
import { getPriceSchemaId, getPublisherAddress } from '../lib/constants';

const PRICE_SCHEMA_ID = getPriceSchemaId();
const PUBLISHER_ADDRESS = getPublisherAddress();

export interface BTCPriceState {
  price: number | null;           // Price in USD
  priceBigInt: bigint | null;     // Price in cents (raw)
  timestamp: number | null;       // Unix timestamp
  updater: string | null;         // Address that updated the price
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook to subscribe to real-time Bitcoin price updates
 */
export function useBTCPrice() {
  const [state, setState] = useState<BTCPriceState>({
    price: null,
    priceBigInt: null,
    timestamp: null,
    updater: null,
    isLoading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    if (!PRICE_SCHEMA_ID || !PUBLISHER_ADDRESS) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Configuration missing: PRICE_SCHEMA_ID or PUBLISHER_ADDRESS not set',
      }));
      return;
    }

    let isSubscribed = true;
    const sdk = getClientSDK();

    // Function to fetch current price
    async function fetchCurrentPrice() {
      try {
        console.log('📡 Fetching initial BTC price...');
        const data = await sdk.streams.getAllPublisherDataForSchema(
          PRICE_SCHEMA_ID,
          PUBLISHER_ADDRESS as `0x${string}`
        );

        if (!isSubscribed) return;

        if (!data || data.length === 0) {
          console.log('⚠️  No price data available yet');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'No price data available yet',
          }));
          return;
        }

        const priceUpdate = decodePriceUpdate(data[0] as `0x${string}`);
        updateState(priceUpdate);
      } catch (error: any) {
        console.error('❌ Error fetching price:', error);
        if (isSubscribed) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error.message || 'Failed to fetch price',
          }));
        }
      }
    }

    // Function to update state from price data
    function updateState(priceUpdate: PriceUpdate) {
      const priceUSD = Number(priceUpdate.price) / 100;
      console.log('💰 Price updated:', priceUSD);

      setState({
        price: priceUSD,
        priceBigInt: priceUpdate.price,
        timestamp: Number(priceUpdate.timestamp),
        updater: priceUpdate.updater,
        isLoading: false,
        error: null,
        lastUpdate: new Date(),
      });
    }

    // Subscribe to real-time updates
    async function subscribeToUpdates() {
      try {
        console.log('🔔 Subscribing to BTC price updates...');

        // Set up event listener for price updates
        const subscription = await sdk.streams.subscribe({
          somniaStreamsEventId: 'PriceUpdated',
          ethCalls: [], // No additional contract calls needed
          onData: async (data: any) => {
            if (!isSubscribed) return;

            console.log('📨 Received price update event');
            // After event fires, fetch latest data from blockchain
            try {
              const latestData = await sdk.streams.getAllPublisherDataForSchema(
                PRICE_SCHEMA_ID,
                PUBLISHER_ADDRESS as `0x${string}`
              );

              if (latestData && latestData.length > 0) {
                const priceUpdate = decodePriceUpdate(latestData[0] as `0x${string}`);
                updateState(priceUpdate);
              }
            } catch (error) {
              console.error('❌ Error fetching updated price:', error);
            }
          },
          onError: (error: Error) => {
            console.error('❌ Subscription error:', error);
          },
          onlyPushChanges: false,
        });

        // Return cleanup function
        return subscription ? subscription.unsubscribe : null;
      } catch (error: any) {
        console.error('❌ Error subscribing to updates:', error);
        if (isSubscribed) {
          setState(prev => ({
            ...prev,
            error: error.message || 'Failed to subscribe to updates',
          }));
        }
        return null;
      }
    }

    // Initialize
    (async () => {
      // Fetch initial price
      await fetchCurrentPrice();

      // Subscribe to updates
      const unsubscribe = await subscribeToUpdates();

      // Cleanup on unmount
      return () => {
        isSubscribed = false;
        if (unsubscribe) {
          console.log('🔕 Unsubscribing from price updates');
          unsubscribe();
        }
      };
    })();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return state;
}

/**
 * Hook to manually trigger a price refresh
 */
export function useRefreshBTCPrice() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/btc-price', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh price');
      }

      const data = await response.json();
      console.log('✅ Price refreshed:', data);
      return data;
    } catch (error) {
      console.error('❌ Error refreshing price:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
}
