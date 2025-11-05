import { NextRequest, NextResponse } from 'next/server';
import { getSDK } from '../../../lib/sdk';
import { PRICE_SCHEMA_ID, PUBLISHER_ADDRESS } from '../../../lib/constants';
import { decodePriceUpdate, formatPrice, formatTimestamp } from '../../../lib/encoding';
import { fetchAndPublishPrice } from '../../../lib/price-fetcher';

/**
 * GET /api/btc-price
 * Get current Bitcoin price from Somnia Streams
 */
export async function GET(req: NextRequest) {
  try {
    console.log('📖 Fetching current BTC price from Streams...');

    if (!PRICE_SCHEMA_ID) {
      return NextResponse.json(
        { success: false, error: 'Schema not configured. Please run deploy-schema.ts and set PRICE_SCHEMA_ID in .env' },
        { status: 500 }
      );
    }

    const sdk = getSDK();

    // Get current price data from Streams
    const data = await sdk.streams.getAllPublisherDataForSchema(
      PRICE_SCHEMA_ID,
      PUBLISHER_ADDRESS as `0x${string}`
    );

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No price data available yet' },
        { status: 404 }
      );
    }

    // Decode price update
    const priceUpdate = decodePriceUpdate(data[0] as `0x${string}`);

    const response = {
      success: true,
      data: {
        price: Number(priceUpdate.price) / 100, // Convert cents back to dollars
        priceFormatted: formatPrice(priceUpdate.price),
        timestamp: Number(priceUpdate.timestamp),
        timestampFormatted: formatTimestamp(priceUpdate.timestamp),
        updater: priceUpdate.updater,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error fetching price:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch price' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/btc-price
 * Manually trigger a price update (fetch from CoinMarketCap and publish)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Manual price update triggered...');

    if (!PRICE_SCHEMA_ID) {
      return NextResponse.json(
        { success: false, error: 'Schema not configured. Please run deploy-schema.ts and set PRICE_SCHEMA_ID in .env' },
        { status: 500 }
      );
    }

    // Fetch and publish new price
    const success = await fetchAndPublishPrice();

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch and publish price' },
        { status: 500 }
      );
    }

    // Get the newly published price
    const sdk = getSDK();
    const data = await sdk.streams.getAllPublisherDataForSchema(
      PRICE_SCHEMA_ID,
      PUBLISHER_ADDRESS as `0x${string}`
    );

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: true, message: 'Price updated but data not yet available' },
        { status: 200 }
      );
    }

    const priceUpdate = decodePriceUpdate(data[0] as `0x${string}`);

    const response = {
      success: true,
      message: 'Price updated successfully',
      data: {
        price: Number(priceUpdate.price) / 100,
        priceFormatted: formatPrice(priceUpdate.price),
        timestamp: Number(priceUpdate.timestamp),
        timestampFormatted: formatTimestamp(priceUpdate.timestamp),
        updater: priceUpdate.updater,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error updating price:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update price' },
      { status: 500 }
    );
  }
}
