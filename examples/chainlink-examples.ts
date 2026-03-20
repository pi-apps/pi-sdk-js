/**
 * Chainlink Integration Examples for Pi SDK JavaScript
 * 
 * Complete working examples demonstrating Chainlink features
 */

import { ChaincallinkClient, createChaincallinkClient } from './ChaincallinkClient';

/**
 * Example 1: Portfolio Price Tracking
 * Monitor real-time prices for multiple assets
 */
export async function portfolioPriceTracking() {
  const client = createChaincallinkClient();

  const portfolioAssets = ['PI/USD', 'BTC/USD', 'ETH/USD', 'XLM/USD', 'USDC/USD'];

  // Fetch all prices
  const prices = await client.getPrices({ pairs: portfolioAssets });

  // Calculate portfolio value
  let totalValue = 0;
  const holdings = {
    PI: 1000,
    BTC: 0.5,
    ETH: 5,
    XLM: 10000,
    USDC: 50000,
  };

  Object.entries(prices).forEach(([pair, data]) => {
    const asset = pair.split('/')[0];
    const amount = holdings[asset] || 0;
    const value = amount * data.rate;
    totalValue += value;

    console.log(`${pair}: $${data.rate} (Confidence: ${(data.confidence * 100).toFixed(2)}%)`);
  });

  console.log(`Portfolio Total: $${totalValue.toFixed(2)}`);

  return { prices, totalValue, holdings };
}

/**
 * Example 2: Automated Trading with VRF
 * Execute trades based on oracle data with randomized execution
 */
export async function automatedTradingWithVRF() {
  const client = createChaincallinkClient();

  // Get current price
  const btcPrice = await client.getPrice('BTC/USD');

  // Set trading thresholds
  const buyThreshold = 40000;
  const sellThreshold = 50000;

  console.log(`Current BTC Price: $${btcPrice.rate}`);

  if (btcPrice.rate < buyThreshold) {
    // Request VRF for randomized execution
    const vrf = await client.requestVRF('trading-job-1', 'btc-buy', Date.now());
    console.log('VRF Random Nonce:', vrf.nonce);

    // Use randomness to determine trade size
    const tradeSize = (vrf.nonce % 5) + 1; // 1-5 units
    console.log(`Buy Signal: ${tradeSize} BTC at $${btcPrice.rate}`);
  } else if (btcPrice.rate > sellThreshold) {
    const vrf = await client.requestVRF('trading-job-1', 'btc-sell', Date.now());
    const tradeSize = (vrf.nonce % 5) + 1;
    console.log(`Sell Signal: ${tradeSize} BTC at $${btcPrice.rate}`);
  }

  return { btcPrice, signal: btcPrice.rate < buyThreshold ? 'BUY' : 'SELL' };
}

/**
 * Example 3: Staking with Keeper Automation
 * Automate staking rewards collection using Keepers
 */
export async function stakingWithKeeperAutomation() {
  const client = createChaincallinkClient();

  // Get staking keeper jobs
  const keeperJobs = await client.listKeeperJobs('active');

  const stakingJobs = keeperJobs.filter(job => job.name.includes('staking'));

  console.log(`Found ${stakingJobs.length} active staking jobs:`);

  for (const job of stakingJobs) {
    console.log(`\nJob: ${job.name}`);
    console.log(`Status: ${job.status}`);
    console.log(`Executions: ${job.executionCount} (${job.successCount} successful)`);
    console.log(`Success Rate: ${((job.successCount / job.executionCount) * 100).toFixed(2)}%`);
    console.log(`Next Execution: ${new Date(job.nextExecution).toISOString()}`);

    // Execute job if due
    if (Date.now() >= job.nextExecution) {
      const result = await client.executeKeeperJob(job.id);
      console.log(`Execution Triggered: ${result.txHash}`);
    }
  }

  return { stakingJobs };
}

/**
 * Example 4: Cross-Chain Payments with CCIP
 * Send stablecoins across blockchains
 */
export async function crossChainPayments() {
  const client = createChaincallinkClient();

  // Prepare cross-chain message
  const paymentMessage = {
    sourceChain: 'ethereum',
    destinationChain: 'polygon',
    receiver: '0x1234567890123456789012345678901234567890',
    data: {
      type: 'payment',
      amount: 1000,
      currency: 'USDC',
      reference: 'PAY-2025-001',
    },
    tokens: [{ token: 'USDC', amount: '1000000000' }], // 1000 USDC (6 decimals)
  };

  console.log('Initiating cross-chain payment...');
  console.log(`From: ${paymentMessage.sourceChain} → To: ${paymentMessage.destinationChain}`);
  console.log(`Receiver: ${paymentMessage.receiver}`);
  console.log(`Amount: 1000 USDC`);

  const result = await client.sendCCIPMessage(paymentMessage);
  console.log(`Message ID: ${result.messageId}`);

  // Poll message status
  let status = await client.getCCIPMessageStatus(result.messageId);
  console.log(`Initial Status: ${status.status}`);

  // Simulate polling (in real usage, would wait longer)
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    status = await client.getCCIPMessageStatus(result.messageId);
    console.log(`Status Update: ${status.status} (Confirmations: ${status.confirmations})`);

    if (status.status === 'executed') {
      console.log('✅ Payment delivered!');
      break;
    }
  }

  return { messageId: result.messageId, finalStatus: status };
}

/**
 * Example 5: Oracle Health Monitoring
 * Monitor Chainlink network health and fallback strategies
 */
export async function oracleHealthMonitoring() {
  const client = createChaincallinkClient();

  // Check network health
  const health = await client.getHealthStatus();

  console.log('Chainlink Network Health:');
  console.log(`Status: ${health.status}`);
  console.log(`Active Nodes: ${health.activeNodes}/${health.totalNodes}`);
  console.log(`Uptime: ${(health.uptime * 100).toFixed(2)}%`);
  console.log(`Price Feeds: ${health.feedsCount}`);
  console.log(`Avg Latency: ${health.averageLatency}ms`);

  // Implement fallback strategy
  if (health.status === 'degraded') {
    console.log('⚠️ Network degraded - increasing cache duration for safety');

    // Increase cache duration during degradation
    client.setCacheDuration(600000); // 10 minutes instead of 5
  } else if (health.status === 'offline') {
    console.log('❌ Network offline - using cached values or fallback data');
    // Use fallback prices from backup source
  } else {
    console.log('✅ Network healthy - using normal cache duration');
    client.setCacheDuration(300000); // 5 minutes
  }

  return { health };
}

/**
 * Main execution - run all examples
 */
async function runAllExamples() {
  console.log('=== Chainlink Pi SDK Integration Examples ===\n');

  try {
    console.log('📊 Example 1: Portfolio Price Tracking');
    console.log('----------------------------------------');
    await portfolioPriceTracking();

    console.log('\n\n📈 Example 2: Automated Trading with VRF');
    console.log('----------------------------------------');
    await automatedTradingWithVRF();

    console.log('\n\n🔄 Example 3: Staking with Keeper Automation');
    console.log('----------------------------------------');
    await stakingWithKeeperAutomation();

    console.log('\n\n💳 Example 4: Cross-Chain Payments with CCIP');
    console.log('----------------------------------------');
    await crossChainPayments();

    console.log('\n\n⚕️ Example 5: Oracle Health Monitoring');
    console.log('----------------------------------------');
    await oracleHealthMonitoring();

    console.log('\n\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export examples for testing
export default {
  portfolioPriceTracking,
  automatedTradingWithVRF,
  stakingWithKeeperAutomation,
  crossChainPayments,
  oracleHealthMonitoring,
  runAllExamples,
};
