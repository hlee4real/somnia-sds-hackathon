/**
 * Deploy Bitcoin Bet Contract
 *
 * This script deploys the BitcoinBet smart contract to Somnia network
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Load environment variables
const envPath = resolve(join(__dirname, '../.env.local'));
console.log(`📄 Loading .env.local from: ${envPath}`);
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

// Contract bytecode - You need to compile contract.sol and paste the bytecode here
// Use: solc --optimize --bin contract.sol
// Or use Remix IDE to get the bytecode
const CONTRACT_BYTECODE = ''; // TODO: Add compiled bytecode here

const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "prediction",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "won",
        "type": "bool"
      }
    ],
    "name": "BetSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PriceUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "_prediction",
        "type": "bool"
      }
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_timestamp",
        "type": "uint256"
      }
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function main() {
  console.log('🚀 Deploying BitcoinBet Contract...\n');

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.RPC_URL;

  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env.local');
    process.exit(1);
  }

  if (!rpcUrl) {
    console.error('❌ RPC_URL not set in .env.local');
    process.exit(1);
  }

  if (!CONTRACT_BYTECODE) {
    console.error('❌ CONTRACT_BYTECODE not set. Please compile the contract and add the bytecode.');
    console.log('\nTo compile the contract:');
    console.log('1. Use Remix IDE (https://remix.ethereum.org)');
    console.log('2. Copy contract.sol content');
    console.log('3. Compile with Solidity 0.8.20');
    console.log('4. Copy the bytecode from the compilation details');
    console.log('5. Paste it in the CONTRACT_BYTECODE variable in this script\n');
    process.exit(1);
  }

  // Define Somnia chain configuration
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
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  };

  const account = privateKeyToAccount(privateKey);
  console.log(`📍 Deploying from: ${account.address}\n`);

  const walletClient = createWalletClient({
    account,
    chain: somniaChain,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: somniaChain,
    transport: http(rpcUrl),
  });

  try {
    // Deploy contract
    console.log('📤 Deploying contract...');

    const hash = await walletClient.deployContract({
      abi: CONTRACT_ABI,
      bytecode: CONTRACT_BYTECODE as `0x${string}`,
    });

    console.log('⏳ Waiting for deployment confirmation...');
    console.log(`📋 Transaction hash: ${hash}\n`);

    // Wait for deployment
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('✅ Contract deployed successfully!');
    console.log(`📍 Contract Address: ${receipt.contractAddress}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}\n`);

    console.log('📝 Next steps:');
    console.log(`1. Add this to your .env.local file:`);
    console.log(`   CONTRACT_ADDRESS=${receipt.contractAddress}`);
    console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${receipt.contractAddress}`);
    console.log(`2. Start the price fetcher: npm run start:fetcher`);
    console.log(`3. Start the frontend: npm run dev\n`);

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
