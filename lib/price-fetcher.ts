/**
 * Bitcoin Price Fetcher
 * Fetches BTC price from CoinMarketCap API and publishes to Somnia Streams
 */
import axios from 'axios';
import { getSDK } from './sdk';
import {
  getCmcApiKey,
  CMC_API_URL,
  PRICE_DATA_ID,
  PRICE_EVENT_ID,
  RETRY_INTERVAL_MS,
  getPriceSchemaId,
  getPublisherAddress,
} from './constants';
import {
  encodePriceUpdate,
  encodePriceEventTopics,
  encodePriceEventData,
  formatPrice,
} from './encoding';

export interface BTCPriceData {
  price: number;
  timestamp: number;
  lastUpdated: string;
}

/**
 * Fetch Bitcoin price from CoinMarketCap API
 */
export async function fetchBTCPrice(): Promise<BTCPriceData> {
  try {
    console.log('📡 Fetching BTC price from CoinMarketCap...');

    const apiKey = getCmcApiKey();
    if (!apiKey) {
      throw new Error('CMC_API_KEY environment variable is required');
    }

    const response = await axios.get(CMC_API_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
      },
      params: {
        symbol: 'BTC',
        convert: 'USD',
      },
    });

    const btcData = response.data.data.BTC;
    const price = btcData.quote.USD.price;
    const lastUpdated = btcData.quote.USD.last_updated;

    console.log(`✅ BTC Price: $${price.toFixed(2)}`);
    console.log(`📅 Last updated: ${lastUpdated}`);

    return {
      price,
      timestamp: Math.floor(Date.now() / 1000),
      lastUpdated,
    };
  } catch (error: any) {
    console.error('❌ Error fetching BTC price:', error.message);

    // Check for specific errors
    if (error.response?.status === 429) {
      console.error('⚠️  Rate limit exceeded. Free tier: 333 calls/day');
    } else if (error.response?.status === 401) {
      console.error('⚠️  Invalid API key');
    }

    throw error;
  }
}

/**
 * Publish price update to Somnia Streams
 */
export async function publishPriceUpdate(priceData: BTCPriceData): Promise<string> {
  try {
    console.log('📤 Publishing price update to Somnia Streams...');

    const schemaId = getPriceSchemaId();
    if (!schemaId) {
      throw new Error('PRICE_SCHEMA_ID not set. Please run deploy-schema.ts first');
    }

    const sdk = getSDK();

    // Convert price to cents (multiply by 100) to avoid decimals
    const priceCents = BigInt(Math.floor(priceData.price * 100));
    const timestamp = BigInt(priceData.timestamp);

    // Encode price update
    const encodedData = encodePriceUpdate({
      price: priceCents,
      timestamp,
      updater: getPublisherAddress() as `0x${string}`,
    });

    console.log(`💰 Price: ${formatPrice(priceCents)}`);
    console.log(`⏰ Timestamp: ${new Date(priceData.timestamp * 1000).toISOString()}`);

    // Prepare data and event streams
    const dataStreams = [{
      id: PRICE_DATA_ID,
      schemaId: schemaId,
      data: encodedData,
    }];

    const eventStreams = [{
      id: PRICE_EVENT_ID,
      argumentTopics: encodePriceEventTopics(priceCents),
      data: encodePriceEventData(timestamp),
    }];

    // Atomic write + emit
    const tx = await sdk.streams.setAndEmitEvents(dataStreams, eventStreams);

    console.log('✅ Transaction successful:', tx);
    console.log('🔔 Event emitted for real-time subscribers\n');

    return tx as string;
  } catch (error: any) {
    console.error('❌ Error publishing to Streams:', error.message);
    throw error;
  }
}

/**
 * Main function: Fetch and publish BTC price
 * Returns true if successful, false if should retry
 */
export async function fetchAndPublishPrice(): Promise<boolean> {
  try {
    const priceData = await fetchBTCPrice();
    await publishPriceUpdate(priceData);
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch and publish price');
    console.log(`🔄 Will retry in ${RETRY_INTERVAL_MS / 1000} seconds...\n`);
    return false;
  }
}

/**
 * Get current price from Somnia Streams
 */
export async function getCurrentPrice() {
  try {
    const schemaId = getPriceSchemaId();
    if (!schemaId) {
      throw new Error('PRICE_SCHEMA_ID not set');
    }

    const sdk = getSDK();
    const data = await sdk.streams.getAllPublisherDataForSchema(
      schemaId,
      getPublisherAddress() as `0x${string}`
    );

    if (!data || data.length === 0) {
      return null;
    }

    const { decodePriceUpdate } = await import('./encoding');
    return decodePriceUpdate(data[0] as `0x${string}`);
  } catch (error) {
    console.error('Error getting current price:', error);
    return null;
  }
}
