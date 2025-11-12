# Bitcoin Price Tracker with Somnia Data Streams

Real-time Bitcoin price tracker powered by **Somnia Data Streams (SDS)** - a blockchain-native streaming protocol combining real-time data publishing, event-driven subscriptions, and on-chain storage.

## Why SDS?

- **Real-time updates**: Prices update every 2 minutes, users see changes instantly
- **Blockchain-verified**: Immutable on-chain audit trail
- **Event-driven**: WebSocket notifications, no polling needed
- **Decentralized**: No central database required

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Bitcoin Price Tracker                       │
│                   (Somnia Data Streams)                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  CoinMarketCap   │  External API
│      API         │  (Every 2 min)
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────┐
│               BACKEND: Price Fetcher Service                 │
│                                                              │
│  1. Fetch BTC price from CoinMarketCap                      │
│  2. Encode price data (price, timestamp, updater)           │
│  3. PUBLISH to Somnia Data Streams                          │
│     ├─ Write to schema (on-chain storage)                   │
│     └─ Emit event (real-time notification)                  │
│                                                              │
│  SDK Method: streams.setAndEmitEvents()                     │
└──────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────┐
│                  SOMNIA DATA STREAMS                         │
│                                                              │
│  ┌────────────────┐         ┌────────────────┐             │
│  │  Data Storage  │         │  Event Stream  │             │
│  │   (On-chain)   │         │  (WebSocket)   │             │
│  │                │         │                │             │
│  │  Schema ID     │         │  Event ID      │             │
│  │  Publisher     │         │  Subscribers   │             │
│  │  Encoded Data  │         │  Push Updates  │             │
│  └────────────────┘         └────────────────┘             │
└──────────────────────────────────────────────────────────────┘
         │                            │
         │ Read                       │ Subscribe
         ↓                            ↓
┌──────────────────────────────────────────────────────────────┐
│               FRONTEND: React Application                    │
│                                                              │
│  1. Initialize client SDK                                    │
│  2. SUBSCRIBE to price update events                         │
│  3. Receive real-time notifications                          │
│  4. Fetch latest data from stream                           │
│  5. Update UI instantly                                      │
│                                                              │
│  SDK Method: streams.subscribe()                            │
│  Hook: useBTCPrice()                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Schema Design

### Price Update Schema

We designed a structured schema for Bitcoin price data:

```solidity
// Schema Structure
PriceUpdate {
    uint256 price;      // Price in cents (e.g., 10000000 = $100,000.00)
    uint64 timestamp;   // Unix timestamp in seconds
    address updater;    // Address of the publisher (bot/service)
}
```

**Why This Design?**

1. **`uint256 price`** - Large enough for any price, stored in cents to avoid decimals
2. **`uint64 timestamp`** - Efficient storage for Unix timestamps (good until year 2262)
3. **`address updater`** - Tracks who published the data for accountability

### Schema Deployment

```typescript
// scripts/deploy-schema.ts
const schema = {
  types: ['uint256', 'uint64', 'address'],
  names: ['price', 'timestamp', 'updater']
};

const schemaId = await sdk.streams.registerSchema(schema);
// Returns: 0x7103d009c4b4541092ca693cbbed9aa0240b520eadfd0069e12d7b8eb445fef5
```

---

## Implementation Details

### 1. Backend: Publishing Data

**File:** `lib/price-fetcher.ts`

The backend fetches Bitcoin prices and publishes to SDS:

```typescript
import { SDK } from '@somnia-chain/streams';

// Initialize SDK with wallet for publishing
const sdk = new SDK({
  public: publicClient,
  wallet: walletClient,
});

// Encode price data according to schema
const encodedData = encodeAbiParameters(
  parseAbiParameters('uint256, uint64, address'),
  [priceCents, timestamp, publisherAddress]
);

// Publish to Somnia Data Streams
const tx = await sdk.streams.setAndEmitEvents(
  // Data stream (persistent storage)
  [{
    id: PRICE_DATA_ID,
    schemaId: PRICE_SCHEMA_ID,
    data: encodedData,
  }],
  // Event stream (real-time notification)
  [{
    id: PRICE_EVENT_ID,
    argumentTopics: [encodePrice(price)],
    data: encodeTimestamp(timestamp),
  }]
);
```

**Key Points:**
- Uses `setAndEmitEvents()` for atomic write + notify
- Data is stored persistently on-chain
- Event triggers real-time notifications to subscribers
- All operations are blockchain transactions (transparent & immutable)

### 2. Frontend: Subscribing to Updates

**File:** `hooks/useBTCPrice.ts`

The frontend subscribes to real-time updates:

```typescript
import { getClientSDK } from '../lib/client-sdk';

const sdk = getClientSDK();

// Subscribe to price update events
const subscription = await sdk.streams.subscribe({
  somniaStreamsEventId: 'PriceUpdated',
  ethCalls: [], // No additional contract calls
  onData: async (data) => {
    // New price available! Fetch from stream
    const latestData = await sdk.streams.getAllPublisherDataForSchema(
      PRICE_SCHEMA_ID,
      PUBLISHER_ADDRESS
    );

    // Decode and update UI
    const priceUpdate = decodePriceUpdate(latestData[0]);
    updateUI(priceUpdate);
  },
  onError: (error) => {
    console.error('Stream error:', error);
  },
  onlyPushChanges: false,
});

// Cleanup
return () => subscription.unsubscribe();
```

**Key Points:**
- WebSocket connection for real-time updates
- Event-driven: only fetches data when notified
- Automatic reconnection on disconnect
- Clean unsubscribe on component unmount

### 3. Data Encoding/Decoding

**File:** `lib/encoding.ts`

We use ABI encoding for efficient on-chain storage:

```typescript
// Encode for publishing
export function encodePriceUpdate(update: PriceUpdate): Hex {
  return encodeAbiParameters(
    parseAbiParameters('uint256, uint64, address'),
    [update.price, update.timestamp, update.updater]
  );
}

// Decode for reading
export function decodePriceUpdate(data: Hex): PriceUpdate {
  const [price, timestamp, updater] = decodeAbiParameters(
    parseAbiParameters('uint256, uint64, address'),
    data
  );
  return { price, timestamp, updater };
}
```

---

## Code Examples

### Example 1: Reading Current Price

```typescript
// Fetch latest price from stream
const sdk = getClientSDK();
const data = await sdk.streams.getAllPublisherDataForSchema(
  PRICE_SCHEMA_ID,
  PUBLISHER_ADDRESS
);

if (data && data.length > 0) {
  const priceUpdate = decodePriceUpdate(data[0]);
  console.log(`Current BTC Price: $${priceUpdate.price / 100}`);
  console.log(`Updated at: ${new Date(priceUpdate.timestamp * 1000)}`);
}
```

### Example 2: React Component with Real-Time Updates

```typescript
function BitcoinPrice() {
  const priceState = useBTCPrice(); // Custom hook using SDS

  if (priceState.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>${priceState.price?.toFixed(2)}</h1>
      <p>Last updated: {priceState.lastUpdate?.toLocaleString()}</p>
      <span className="live-indicator">● LIVE</span>
    </div>
  );
}
```

### Example 3: Publishing Price Update

```typescript
async function publishPrice(btcPrice: number) {
  const sdk = getSDK();
  const priceCents = BigInt(Math.floor(btcPrice * 100));
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const encodedData = encodePriceUpdate({
    price: priceCents,
    timestamp,
    updater: PUBLISHER_ADDRESS,
  });

  const tx = await sdk.streams.setAndEmitEvents(
    [{ id: PRICE_DATA_ID, schemaId: PRICE_SCHEMA_ID, data: encodedData }],
    [{ id: PRICE_EVENT_ID, argumentTopics: [...], data: [...] }]
  );

  console.log('Published! TX:', tx);
}
```

---

## Performance

**Total latency**: ~5 seconds from API fetch to UI update

| Metric | Value |
|--------|-------|
| Update Frequency | Every 2 minutes |
| Notification Latency | < 1 second |
| Concurrent Subscribers | Unlimited |

---

## Learn More

- [Somnia Documentation](https://docs.somnia.network)
- [Somnia Data Streams SDK](https://github.com/somnia-network/streams-sdk)
