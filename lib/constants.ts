/**
 * Bitcoin Price Tracker Constants
 * Schema definition and configuration
 */

// Schema definition for Bitcoin price updates
// Format: (uint256 price, uint64 timestamp, address updater)
export const PRICE_UPDATE_SCHEMA = '(uint256,uint64,address)';

// Zero bytes32 for parent schema (top-level schema)
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Fixed ID for price data (KV store pattern)
export const PRICE_DATA_ID = '0x0000000000000000000000000000000000000000000000000000000000000001' as const;

// Event schema ID for price updates
export const PRICE_EVENT_ID = 'PriceUpdated';

// Event schema: PriceUpdated(uint256 indexed price, uint64 timestamp)
export const PRICE_EVENT_SCHEMA = {
  params: [
    { name: 'price', paramType: 'uint256', isIndexed: true },
    { name: 'timestamp', paramType: 'uint64', isIndexed: false },
  ],
  eventTopic: 'PriceUpdated(uint256 indexed price, uint64 timestamp)',
};

// Environment variables (loaded from .env via dotenv)
// All values come from environment only - no hardcoded fallbacks

export function getRpcUrl(): string {
  return process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '';
}

export function getPrivateKey(): string {
  return process.env.PRIVATE_KEY || '';
}

export function getWalletAddress(): string {
  return process.env.WALLET_ADDRESS || process.env.NEXT_PUBLIC_WALLET_ADDRESS || '';
}

// Schema ID (set after deployment) - lazy evaluation
export function getPriceSchemaId(): `0x${string}` {
  return (process.env.PRICE_SCHEMA_ID || process.env.NEXT_PUBLIC_PRICE_SCHEMA_ID || '') as `0x${string}`;
}

// Publisher address (bot address that updates prices)
export function getPublisherAddress(): string {
  return process.env.PUBLISHER_ADDRESS || process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS || getWalletAddress();
}

// CoinMarketCap API configuration - from environment only
export function getCmcApiKey(): string {
  return process.env.CMC_API_KEY || '';
}

// Backward compatibility exports (lazy evaluation)
export const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '';
export const PRICE_SCHEMA_ID = (process.env.PRICE_SCHEMA_ID || process.env.NEXT_PUBLIC_PRICE_SCHEMA_ID || '') as `0x${string}`;
export const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
export const WALLET_ADDRESS = process.env.WALLET_ADDRESS || process.env.NEXT_PUBLIC_WALLET_ADDRESS || '';
export const PUBLISHER_ADDRESS = process.env.PUBLISHER_ADDRESS || process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS || WALLET_ADDRESS;
export const CMC_API_KEY = process.env.CMC_API_KEY || '';
export const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';

// Fetch interval (1 minute = 60000ms)
export const FETCH_INTERVAL_MS = 1 * 60 * 1000;

// Retry interval on error (30 seconds)
export const RETRY_INTERVAL_MS = 30 * 1000;
