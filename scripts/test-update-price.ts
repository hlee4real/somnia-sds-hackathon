/**
 * Test updating contract price manually
 */
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { BITCOIN_BET_ABI } from '../lib/contract-abi';

const envPath = resolve(join(__dirname, '../.env.local'));
config({ path: envPath });

async function main() {
  console.log('🧪 Testing contract price update...\n');

  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.RPC_URL;

  if (!contractAddress || !privateKey || !rpcUrl) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const somniaChain = defineChain({
    id: 50312, // Correct Somnia Devnet chain ID
    name: 'Somnia Devnet',
    nativeCurrency: {
      decimals: 18,
      name: 'STT',
      symbol: 'STT',
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
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

  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`👤 Sender: ${account.address}\n`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💳 Balance: ${balance} wei (${Number(balance) / 1e18} STT)\n`);

  if (balance === 0n) {
    console.error('❌ No balance! Get STT tokens from faucet.');
    process.exit(1);
  }

  // Test values
  const testPrice = BigInt(100000 * 100); // $100,000
  const testTimestamp = BigInt(Math.floor(Date.now() / 1000));

  console.log(`💰 Test price: ${testPrice} (${Number(testPrice) / 100})`);
  console.log(`⏰ Test timestamp: ${testTimestamp} (${new Date(Number(testTimestamp) * 1000).toISOString()})\n`);

  try {
    console.log('📊 Estimating gas...');
    const gasEstimate = await publicClient.estimateContractGas({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'updatePrice',
      args: [testPrice, testTimestamp],
      account,
    });

    console.log(`⛽ Estimated gas: ${gasEstimate}\n`);

    // Get current nonce
    const nonce = await publicClient.getTransactionCount({
      address: account.address,
    });
    console.log(`🔢 Nonce: ${nonce}\n`);

    console.log('📤 Sending transaction (legacy format)...');
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'updatePrice',
      args: [testPrice, testTimestamp],
      gas: gasEstimate + BigInt(50000),
      nonce,
      type: 'legacy',
    });

    console.log(`📋 Transaction hash: ${hash}`);
    console.log('⏳ Waiting for confirmation...\n');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('✅ Success!');
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    console.log(`📊 Status: ${receipt.status}\n`);

    // Read back the price
    const currentPrice = await publicClient.readContract({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'currentPrice',
    });

    console.log(`📈 Current price on contract: ${currentPrice} (${Number(currentPrice) / 100})`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);

    if (error.cause) {
      console.error('\nCause:', error.cause);
    }

    if (error.details) {
      console.error('\nDetails:', error.details);
    }
  }
}

main().catch(console.error);
