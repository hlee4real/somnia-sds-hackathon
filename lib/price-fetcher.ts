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
import { createWalletClient, http, createPublicClient, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { BITCOIN_BET_ABI } from './contract-abi';

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
 * Update price on the smart contract
 */
export async function updateContractPrice(priceData: BTCPriceData): Promise<void> {
  try {
    console.log('📝 Updating price on smart contract...');

    const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    const rpcUrl = process.env.RPC_URL;

    if (!contractAddress) {
      console.warn('⚠️  CONTRACT_ADDRESS not set, skipping contract update');
      return;
    }

    if (!privateKey || !rpcUrl) {
      console.warn('⚠️  PRIVATE_KEY or RPC_URL not set, skipping contract update');
      return;
    }

    // Define Somnia chain configuration with defineChain for proper typing
    const somniaChain = defineChain({
      id: 50312, // Correct Somnia Devnet chain ID
      name: 'Somnia Devnet',
      nativeCurrency: {
        decimals: 18,
        name: 'STT',
        symbol: 'STT',
      },
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
      },
      testnet: true,
    });

    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
      account,
      chain: somniaChain,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: somniaChain,
      transport: http(rpcUrl),
    });

    // Convert price to cents (multiply by 100) to avoid decimals
    const priceCents = BigInt(Math.floor(priceData.price * 100));
    const timestamp = BigInt(priceData.timestamp);

    console.log(`💰 Price to set: ${priceCents} (${Number(priceCents) / 100})`);
    console.log(`⏰ Timestamp: ${timestamp} (${new Date(Number(timestamp) * 1000).toISOString()})`);
    console.log(`📍 Contract: ${contractAddress}`);
    console.log(`👤 Sender: ${account.address}\n`);

    // Check balance first
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💳 Account balance: ${balance} wei (${Number(balance) / 1e18} STT)`);

    if (balance === 0n) {
      console.error('❌ Account has no balance! Please fund your wallet with STT tokens.');
      return;
    }

    try {
      // Estimate gas first
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi: BITCOIN_BET_ABI,
        functionName: 'updatePrice',
        args: [priceCents, timestamp],
        account,
      });

      console.log(`⛽ Estimated gas: ${gasEstimate}`);

      // Get current nonce
      const nonce = await publicClient.getTransactionCount({
        address: account.address,
      });
      console.log(`🔢 Nonce: ${nonce}`);

      // Call updatePrice on the contract with explicit parameters
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: BITCOIN_BET_ABI,
        functionName: 'updatePrice',
        args: [priceCents, timestamp],
        gas: gasEstimate + BigInt(50000), // Add buffer
        nonce,
        type: 'legacy', // Force legacy transaction
      });

      console.log('⏳ Waiting for transaction confirmation...');
      console.log(`📋 Transaction hash: ${hash}`);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log('✅ Contract price updated successfully!');
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`📊 Status: ${receipt.status}\n`);

    } catch (txError: any) {
      console.error('❌ Transaction error:', txError.message);
      if (txError.cause) {
        console.error('Cause:', txError.cause);
      }
      if (txError.details) {
        console.error('Details:', txError.details);
      }
      throw txError;
    }

  } catch (error: any) {
    console.error('❌ Error updating contract price:', error.message);
    console.error('Full error:', error);
    // Don't throw - we don't want to fail the entire process if contract update fails
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
    // Also update the smart contract
    await updateContractPrice(priceData);
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
