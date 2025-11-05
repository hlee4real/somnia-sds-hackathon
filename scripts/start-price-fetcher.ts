/**
 * Bitcoin Price Fetcher Service with Cron Job
 *
 * This script runs continuously and fetches Bitcoin price every 30 seconds,
 * publishing it to Somnia Streams for real-time updates.
 *
 * Usage:
 *   npx tsx bitcoin-price-tracker/scripts/start-price-fetcher.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import cron from 'node-cron';

// Load environment variables from parent directory
config({ path: resolve(join(__dirname, '../../.env')) });

import { fetchAndPublishPrice } from '../lib/price-fetcher';
import { FETCH_INTERVAL_MS, RETRY_INTERVAL_MS } from '../lib/constants';

console.log('🚀 Starting Bitcoin Price Fetcher Service...\n');
console.log(`⏰ Fetch interval: ${FETCH_INTERVAL_MS / 1000 / 60} minutes`);
console.log(`🔄 Retry interval on error: ${RETRY_INTERVAL_MS / 1000} seconds\n`);

// Track if we're currently fetching
let isFetching = false;
let retryTimeout: NodeJS.Timeout | null = null;

/**
 * Fetch price with retry logic
 */
async function fetchWithRetry() {
  if (isFetching) {
    console.log('⏭️  Skipping fetch - already in progress');
    return;
  }

  isFetching = true;

  try {
    const success = await fetchAndPublishPrice();

    if (!success && retryTimeout === null) {
      // Schedule retry after 1 minute
      console.log('📅 Scheduling retry...');
      retryTimeout = setTimeout(async () => {
        retryTimeout = null;
        isFetching = false;
        await fetchWithRetry();
      }, RETRY_INTERVAL_MS);
    }
  } finally {
    if (retryTimeout === null) {
      isFetching = false;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  // Fetch immediately on start
  console.log('🎬 Fetching initial price...\n');
  await fetchWithRetry();

  // Schedule cron job to run every 1 minute
  // Cron pattern: "* * * * *" = every minute
  console.log('📅 Setting up cron job (every 1 minute)...');
  cron.schedule('* * * * *', async () => {
    console.log(`\n⏰ Cron triggered at ${new Date().toISOString()}`);
    await fetchWithRetry();
  });

  console.log('✅ Price fetcher service is running!');
  console.log('Press Ctrl+C to stop\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down price fetcher service...');
  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down price fetcher service...');
  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }
  process.exit(0);
});

// Start the service
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
