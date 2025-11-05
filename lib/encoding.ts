/**
 * Encoding/Decoding utilities for Bitcoin price data
 */
import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters, type Hex } from 'viem';

export interface PriceUpdate {
  price: bigint;      // Price in cents (multiply by 100 to avoid decimals)
  timestamp: bigint;  // Unix timestamp in seconds
  updater: `0x${string}`; // Address of the bot that updated the price
}

/**
 * Encode price update data for storage
 */
export function encodePriceUpdate(update: PriceUpdate): Hex {
  return encodeAbiParameters(
    parseAbiParameters('uint256, uint64, address'),
    [update.price, update.timestamp, update.updater]
  );
}

/**
 * Decode price update data from storage
 * Handles nested object structure returned by SDK
 *
 * SDK returns: [{ value: { value: [price, timestamp, updater] } }]
 */
export function decodePriceUpdate(data: any): PriceUpdate {
  try {
    // Handle SDK format: array with nested value objects
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];

      // Check if it's a hex string (already encoded)
      if (typeof firstItem === 'string' && firstItem.startsWith('0x')) {
        const [price, timestamp, updater] = decodeAbiParameters(
          parseAbiParameters('uint256, uint64, address'),
          firstItem as Hex
        );
        return { price, timestamp, updater };
      }

      // SDK format: { value: { value: [price, timestamp, updater] } }
      if (firstItem && typeof firstItem === 'object' && 'value' in firstItem) {
        let current = firstItem;

        // Extract nested value (can be nested 1 or 2 levels)
        while (current && typeof current === 'object' && 'value' in current && !Array.isArray(current.value)) {
          current = current.value;
        }

        // Now current.value should be the array [price, timestamp, updater]
        const values = current.value;

        if (Array.isArray(values) && values.length >= 3) {
          const [price, timestamp, updater] = values;

          // Helper to convert to BigInt from various formats
          const toBigInt = (val: any): bigint => {
            if (typeof val === 'bigint') return val;
            if (typeof val === 'number') return BigInt(val);
            if (typeof val === 'string') return BigInt(val);

            // Handle SDK wrapped values: { name: '', type: 'uint256', value: bigint }
            if (val && typeof val === 'object' && 'value' in val) {
              return toBigInt(val.value); // Recursively extract
            }

            // Handle BigNumber or other objects
            if (val && typeof val === 'object') {
              if ('_hex' in val) return BigInt(val._hex);
              if ('toHexString' in val) return BigInt(val.toHexString());
              if ('toString' in val) {
                const str = val.toString();
                if (/^\d+$/.test(str)) return BigInt(str);
              }
            }

            throw new Error(`Cannot convert ${typeof val} to BigInt`);
          };

          // Extract updater address (may be wrapped like price/timestamp)
          const extractAddress = (addr: any): `0x${string}` => {
            if (typeof addr === 'string') return addr as `0x${string}`;
            if (addr && typeof addr === 'object' && 'value' in addr) {
              return extractAddress(addr.value);
            }
            return addr as `0x${string}`;
          };

          return {
            price: toBigInt(price),
            timestamp: toBigInt(timestamp),
            updater: extractAddress(updater),
          };
        }
      }
    }

    // Fallback: raw hex string
    if (typeof data === 'string' && data.startsWith('0x')) {
      const [price, timestamp, updater] = decodeAbiParameters(
        parseAbiParameters('uint256, uint64, address'),
        data as Hex
      );
      return { price, timestamp, updater };
    }

    throw new Error(`Unsupported data format. Type: ${typeof data}, Is array: ${Array.isArray(data)}`);
  } catch (error) {
    console.error('❌ Error decoding price update:', error);
    throw error;
  }
}

/**
 * Encode event topics for PriceUpdated event
 * Event: PriceUpdated(uint256 indexed price, uint64 timestamp)
 */
export function encodePriceEventTopics(price: bigint): `0x${string}`[] {
  return [
    encodeAbiParameters(parseAbiParameters('uint256'), [price])
  ];
}

/**
 * Encode event data for PriceUpdated event
 */
export function encodePriceEventData(timestamp: bigint): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('uint64'),
    [timestamp]
  );
}

/**
 * Format price for display (convert from cents to dollars)
 */
export function formatPrice(priceCents: bigint): string {
  const dollars = Number(priceCents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
