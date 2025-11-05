/**
 * Somnia Streams SDK initialization
 */
import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './chains';
import { getRpcUrl } from './constants';

/**
 * Server-side SDK utilities for Somnia Data Streams
 */

// Public client for reading (HTTP)
export function getPublicClient() {
  const RPC_URL = getRpcUrl();
  if (!RPC_URL) {
    throw new Error('RPC_URL environment variable is required');
  }
  return createPublicClient({
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });
}

// Wallet client for writing (server-side only)
export function getWalletClient() {
  const RPC_URL = getRpcUrl();
  if (!RPC_URL) {
    throw new Error('RPC_URL environment variable is required');
  }

  let PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();

  if (!PRIVATE_KEY || PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    throw new Error('PRIVATE_KEY not configured or still using placeholder value. Please set a valid private key in .env');
  }

  // Ensure it starts with 0x
  if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = `0x${PRIVATE_KEY}`;
  }

  // Validate format (should be 0x + 64 hex characters)
  if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
    throw new Error(
      `Invalid PRIVATE_KEY format. Expected 66 characters (0x + 64 hex digits), got ${PRIVATE_KEY.length} characters. ` +
      `Make sure your private key in .env has no quotes, spaces, or extra characters.`
    );
  }

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    chain: somniaTestnet,
    account,
    transport: http(RPC_URL),
  });
}

// SDK instance for server-side operations (writing + reading)
export function getSDK() {
  return new SDK({
    public: getPublicClient(),
    wallet: getWalletClient(),
  });
}
