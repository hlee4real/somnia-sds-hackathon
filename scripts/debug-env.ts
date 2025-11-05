/**
 * Debug script to check environment variables
 */
import { config } from 'dotenv';
import { resolve, join } from 'path';

const envPath = resolve(join(__dirname, '../../.env'));
console.log('Loading .env from:', envPath);

config({ path: envPath });

console.log('\nEnvironment variables:');
console.log('PRICE_SCHEMA_ID:', process.env.PRICE_SCHEMA_ID);
console.log('PUBLISHER_ADDRESS:', process.env.PUBLISHER_ADDRESS);
console.log('RPC_URL:', process.env.RPC_URL);
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? '[SET]' : '[NOT SET]');
