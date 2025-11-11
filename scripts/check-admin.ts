/**
 * Check Admin Address of Deployed Contract
 */
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { createPublicClient, http } from 'viem';
import { BITCOIN_BET_ABI } from '../lib/contract-abi';

// Load environment variables
const envPath = resolve(join(__dirname, '../.env.local'));
config({ path: envPath });

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
  const expectedAdmin = process.env.WALLET_ADDRESS;
  const rpcUrl = process.env.RPC_URL;

  if (!contractAddress || !rpcUrl) {
    console.error('❌ CONTRACT_ADDRESS or RPC_URL not set');
    process.exit(1);
  }

  console.log('🔍 Checking contract admin...\n');
  console.log(`Contract: ${contractAddress}`);
  console.log(`Expected admin: ${expectedAdmin}\n`);

  const somniaChain = {
    id: 50312, // Correct Somnia Devnet chain ID
    name: 'Somnia Devnet',
    network: 'somnia-devnet',
    nativeCurrency: {
      decimals: 18,
      name: 'STT',
      symbol: 'STT',
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  };

  const publicClient = createPublicClient({
    chain: somniaChain,
    transport: http(rpcUrl),
  });

  try {
    // Read admin address from contract
    const admin = await publicClient.readContract({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'admin',
    });

    console.log(`✅ Contract admin: ${admin}\n`);

    if (admin.toLowerCase() === expectedAdmin?.toLowerCase()) {
      console.log('✅ Admin matches! You can update the price.');
    } else {
      console.log('❌ Admin does NOT match!');
      console.log('\n⚠️  The contract was deployed by a different address.');
      console.log('Solutions:');
      console.log('1. Update PRIVATE_KEY and WALLET_ADDRESS in .env.local to match the deployer');
      console.log('2. Or redeploy the contract with the current wallet');
    }

    // Also check current price
    const currentPrice = await publicClient.readContract({
      address: contractAddress,
      abi: BITCOIN_BET_ABI,
      functionName: 'currentPrice',
    });

    console.log(`\nCurrent price on contract: ${currentPrice} (${Number(currentPrice) / 100})`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
