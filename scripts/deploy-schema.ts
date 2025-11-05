/**
 * Schema Deployment Script for Bitcoin Price Tracker
 *
 * This script registers the price update schema and event schema on Somnia blockchain.
 * Run this once before starting the price fetcher.
 *
 * Usage:
 *   npx tsx bitcoin-price-tracker/scripts/deploy-schema.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';

// Load environment variables from parent directory
config({ path: resolve(join(__dirname, '../../.env')) });

import { getSDK, getWalletClient } from '../lib/sdk';
import {
  PRICE_UPDATE_SCHEMA,
  PRICE_EVENT_ID,
  PRICE_EVENT_SCHEMA,
  ZERO_BYTES32
} from '../lib/constants';

async function main() {
  console.log('🚀 Starting Bitcoin Price Tracker schema deployment...\n');

  const sdk = getSDK();

  // Step 1: Compute Schema ID for price updates
  console.log('📝 Computing price update schema ID...');
  const schemaId = await sdk.streams.computeSchemaId(PRICE_UPDATE_SCHEMA);
  console.log(`✅ Schema ID: ${schemaId}\n`);
  console.log(`   Schema: ${PRICE_UPDATE_SCHEMA}\n`);

  // Step 2: Register price update schema
  console.log('📤 Registering price update schema on-chain...');
  try {
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId!);

    if (isRegistered) {
      console.log('⚠️  Schema already registered!\n');
    } else {
      const schemaTx = await sdk.streams.registerDataSchemas([
        {
          schema: PRICE_UPDATE_SCHEMA,
          parentSchemaId: ZERO_BYTES32,
        },
      ]);
      console.log(`✅ Price update schema registered! TX: ${schemaTx}\n`);
    }
  } catch (error: any) {
    if (error.message?.includes('already registered')) {
      console.log('⚠️  Schema already registered!\n');
    } else {
      throw error;
    }
  }

  // Step 3: Register Event Schema
  console.log('📤 Registering PriceUpdated event schema...');
  try {
    const eventTx = await sdk.streams.registerEventSchemas(
      [PRICE_EVENT_ID],
      [PRICE_EVENT_SCHEMA]
    );
    console.log(`✅ Event schema registered! TX: ${eventTx}\n`);
  } catch (error: any) {
    if (error.message?.includes('already registered') ||
        error.message?.includes('EventSchemaAlreadyRegistered')) {
      console.log('⚠️  Event schema already registered!\n');
    } else {
      throw error;
    }
  }

  // Step 4: Get publisher address
  const walletClient = getWalletClient();
  if (!walletClient.account) {
    throw new Error('Wallet client account not found');
  }
  const publisherAddress = walletClient.account.address;

  // Output configuration
  console.log('✅ Deployment complete!\n');
  console.log('📋 Add these to your .env file:\n');
  console.log(`PRICE_SCHEMA_ID=${schemaId}`);
  console.log(`PUBLISHER_ADDRESS=${publisherAddress}`);
  console.log(`\n# Or for Next.js (client-side access):`);
  console.log(`NEXT_PUBLIC_PRICE_SCHEMA_ID=${schemaId}`);
  console.log(`NEXT_PUBLIC_PUBLISHER_ADDRESS=${publisherAddress}\n`);
}

main()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
