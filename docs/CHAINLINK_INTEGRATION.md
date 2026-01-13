/**
 * Chainlink Integration Guide for Pi SDK JavaScript
 * 
 * This guide covers Chainlink integration for the Pi SDK, including:
 * - Price Feeds for real-time oracle data
 * - VRF (Verifiable Random Function) for randomness
 * - Keepers for automated contract execution
 * - CCIP for cross-chain messaging
 */

## Installation

```bash
npm install @pi-apps/pi-sdk @pi-apps/chainlink-client
# or
yarn add @pi-apps/pi-sdk @pi-apps/chainlink-client
```

## Quick Start

### Price Feeds

Get real-time prices from Chainlink oracles:

```typescript
import { createChaincallinkClient } from '@pi-apps/chainlink-client';

const client = createChaincallinkClient();

// Get single price
const piPrice = await client.getPrice('PI/USD');
console.log(piPrice.rate);        // 3.14
console.log(piPrice.confidence);  // 0.99

// Get multiple prices
const prices = await client.getPrices({
  pairs: ['PI/USD', 'BTC/USD', 'ETH/USD']
});

console.log(prices['PI/USD'].rate);
console.log(prices['BTC/USD'].rate);
```

### VRF (Verifiable Random Function)

Generate cryptographically secure random numbers:

```typescript
const client = createChaincallinkClient();

// Request random number
const vrfRequest = await client.requestVRF(
  'job-id-123',
  'seed-value',
  1
);

console.log(vrfRequest.jobId);    // job-id-123
console.log(vrfRequest.nonce);    // 1
```

### Keepers (Automated Execution)

Automate contract function execution:

```typescript
const client = createChaincallinkClient();

// Get keeper job status
const job = await client.getKeeperJob('keeper-job-123');
console.log(job.status);          // 'active'
console.log(job.executionCount);  // 45

// Execute keeper job
const result = await client.executeKeeperJob('keeper-job-123');
console.log(result.txHash);       // Transaction hash

// List all keeper jobs
const jobs = await client.listKeeperJobs('active');
jobs.forEach(job => {
  console.log(`${job.name}: ${job.status}`);
});
```

### CCIP (Cross-Chain Interoperability)

Send messages and tokens across chains:

```typescript
const client = createChaincallinkClient();

// Send cross-chain message
const message = {
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  receiver: '0x1234...5678',
  data: { amount: 100, type: 'payment' },
  tokens: [
    { token: 'USDC', amount: '1000000' }
  ]
};

const result = await client.sendCCIPMessage(message);
console.log(result.messageId);    // ccip-msg-123

// Check message status
const status = await client.getCCIPMessageStatus(result.messageId);
console.log(status.status);       // 'pending' | 'confirmed' | 'executed'
console.log(status.confirmations);// 5
```

## Configuration

Set environment variables:

```bash
export CHAINLINK_API_KEY="your-api-key"
export CHAINLINK_BASE_URL="https://api.chain.link"
```

Or configure programmatically:

```typescript
import { ChaincallinkClient } from '@pi-apps/chainlink-client';

const client = new ChaincallinkClient(
  'your-api-key',
  'https://api.chain.link',
  300000 // Cache duration in milliseconds (5 minutes)
);

// Update cache duration
client.setCacheDuration(600000); // 10 minutes

// Clear cache
client.clearCache();
```

## API Reference

### getPrice(pair: string): Promise<PriceFeedData>

Get current price for a trading pair.

**Parameters:**
- `pair` (string): Trading pair (e.g., 'PI/USD', 'BTC/USD')

**Returns:**
```typescript
{
  pair: string;
  rate: number;
  timestamp: number;
  source: string;
  confidence: number;      // 0-1
  nodes: number;           // Number of nodes in consensus
  decimals: number;        // Decimal places
}
```

### getPrices(request: BatchPriceRequest): Promise<BatchPriceResponse>

Get multiple prices in a single request.

**Parameters:**
- `request.pairs` (string[]): Array of trading pairs
- `request.includeTimestamp` (boolean, optional): Include timestamp in response

**Returns:**
```typescript
{
  [pair: string]: PriceFeedData
}
```

### requestVRF(jobId: string, seed: string, nonce: number): Promise<VRFRequest>

Request a verifiable random number.

**Parameters:**
- `jobId` (string): VRF job ID
- `seed` (string): Random seed value
- `nonce` (number): Request nonce

### getKeeperJob(jobId: string): Promise<KeeperJob>

Get keeper job status.

**Parameters:**
- `jobId` (string): Keeper job ID

**Returns:**
```typescript
{
  id: string;
  name: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  executionCount: number;
  successCount: number;
  nextExecution: number;
}
```

### executeKeeperJob(jobId: string): Promise<{ success: boolean; txHash: string }>

Execute a keeper job immediately.

**Parameters:**
- `jobId` (string): Keeper job ID

### sendCCIPMessage(message: CCIPMessage): Promise<{ messageId: string }>

Send a cross-chain message.

**Parameters:**
```typescript
{
  sourceChain: string;
  destinationChain: string;
  receiver: string;
  data: any;
  tokens?: Array<{ token: string; amount: string }>;
}
```

### getHealthStatus(): Promise<HealthStatus>

Get Chainlink network health status.

**Returns:**
```typescript
{
  status: 'healthy' | 'degraded' | 'offline';
  activeNodes: number;
  totalNodes: number;
  uptime: number;              // 0-1
  feedsCount: number;
  averageLatency: number;       // milliseconds
}
```

## Advanced Usage

### Caching

Chainlink responses are cached for 5 minutes by default:

```typescript
const client = createChaincallinkClient(600000); // 10 minute cache

// Access cache details
client.setCacheDuration(1200000); // 20 minutes
```

### Error Handling

```typescript
try {
  const price = await client.getPrice('PI/USD');
} catch (error) {
  console.error('Failed to fetch price:', error.message);
  // Handle gracefully
}
```

### Retry Logic

Requests automatically retry with exponential backoff:
- Rate limits (429): Automatic retry
- Server errors (5xx): Automatic retry
- Max retries: 3
- Backoff: 2^n seconds

## Best Practices

1. **API Key Security**
   - Store API keys in environment variables
   - Never commit keys to version control
   - Rotate keys regularly

2. **Caching**
   - Use appropriate cache durations (5-10 minutes recommended)
   - Clear cache before critical operations
   - Monitor cache hit rates

3. **Error Handling**
   - Always wrap calls in try/catch
   - Implement fallback prices or actions
   - Log errors for monitoring

4. **Performance**
   - Batch requests when possible
   - Use batch price endpoint for multiple pairs
   - Implement request throttling

5. **Production Deployment**
   - Test with real API keys on testnet first
   - Monitor request rates and costs
   - Implement circuit breakers for failed requests
   - Use health checks regularly

## Troubleshooting

### API Key Not Recognized

```typescript
// Verify API key is set
const apiKey = process.env.CHAINLINK_API_KEY;
if (!apiKey) {
  console.error('CHAINLINK_API_KEY not set');
}
```

### Slow Response Times

- Increase cache duration for less frequent updates
- Use batch endpoints instead of individual requests
- Check network connectivity and API status

### Cross-Chain Message Stuck

```typescript
// Check message status
const status = await client.getCCIPMessageStatus(messageId);
if (status.status === 'failed') {
  console.error('Message failed - check gas fees and balance');
}
```

## Support

For issues and questions:
- GitHub: https://github.com/pi-apps/pi-sdk-js
- Documentation: https://docs.chain.link
- Community: https://chain.link/community

---

**Latest Update**: January 11, 2025  
**Chainlink Version**: 2.5+  
**Pi SDK Version**: 3.0+
