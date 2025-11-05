/**
 * Test script to fetch and publish Bitcoin price once
 */
import { config } from 'dotenv';
import { resolve, join } from 'path';

// Load environment variables from parent directory
config({ path: resolve(join(__dirname, '../../.env')) });

import { fetchAndPublishPrice } from '../lib/price-fetcher';

async function main() {
  console.log('🧪 Testing Bitcoin price fetch and publish...\n');

  try {
    const success = await fetchAndPublishPrice();

    if (success) {
      console.log('\n✅ Test successful! Price fetched and published to Somnia Streams');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed - see errors above');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

main();
