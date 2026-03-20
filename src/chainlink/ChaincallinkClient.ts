/**
 * Chainlink Client for Pi SDK JavaScript
 * Provides access to Chainlink oracle services, price feeds, VRF, and Keepers
 */

export interface PriceFeedData {
  pair: string;
  rate: number;
  timestamp: number;
  source: string;
  confidence: number;
  nodes: number;
  decimals: number;
}

export interface BatchPriceRequest {
  pairs: string[];
  includeTimestamp?: boolean;
}

export interface BatchPriceResponse {
  [pair: string]: PriceFeedData;
}

export interface KeeperJob {
  id: string;
  name: string;
  contractAddress: string;
  functionSelector: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  repeatInterval: number;
  nextExecution: number;
  lastExecution?: number;
  executionCount: number;
  successCount: number;
  lastError?: string;
}

export interface VRFRequest {
  jobId: string;
  seed: string;
  nonce: number;
  callback: string;
}

export interface CCIPMessage {
  sourceChain: string;
  destinationChain: string;
  receiver: string;
  data: any;
  tokens?: Array<{
    token: string;
    amount: string;
  }>;
}

/**
 * ChaincallinkClient - Main client for Chainlink integration
 */
export class ChaincallinkClient {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: any; expires: number }>;
  private cacheDuration: number; // milliseconds

  constructor(apiKey: string, baseUrl?: string, cacheDuration = 300000) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.chain.link';
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
  }

  /**
   * Get single price from Chainlink Price Feed
   */
  async getPrice(pair: string): Promise<PriceFeedData> {
    const cacheKey = `price:${pair}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/price-feeds/${pair}`,
      { headers: { 'X-API-Key': this.apiKey } }
    );

    const data = await response.json();
    this.setCached(cacheKey, data);
    return data as PriceFeedData;
  }

  /**
   * Get multiple prices in batch
   */
  async getPrices(request: BatchPriceRequest): Promise<BatchPriceResponse> {
    const cacheKey = `prices:${request.pairs.join(',')}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/price-feeds/batch`,
      {
        method: 'POST',
        headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );

    const data = await response.json();
    this.setCached(cacheKey, data);
    return data as BatchPriceResponse;
  }

  /**
   * Get VRF (Verifiable Random Function) random value
   */
  async requestVRF(jobId: string, seed: string, nonce: number): Promise<VRFRequest> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/vrf/request`,
      {
        method: 'POST',
        headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, seed, nonce }),
      }
    );

    return response.json() as Promise<VRFRequest>;
  }

  /**
   * Get keeper job status
   */
  async getKeeperJob(jobId: string): Promise<KeeperJob> {
    const cacheKey = `keeper:${jobId}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/keepers/${jobId}`,
      { headers: { 'X-API-Key': this.apiKey } }
    );

    const data = await response.json();
    this.setCached(cacheKey, data);
    return data as KeeperJob;
  }

  /**
   * List all keeper jobs
   */
  async listKeeperJobs(status?: string): Promise<KeeperJob[]> {
    const url = status 
      ? `${this.baseUrl}/keepers?status=${status}`
      : `${this.baseUrl}/keepers`;

    const response = await this.fetchWithRetry(
      url,
      { headers: { 'X-API-Key': this.apiKey } }
    );

    return response.json() as Promise<KeeperJob[]>;
  }

  /**
   * Execute keeper job
   */
  async executeKeeperJob(jobId: string): Promise<{ success: boolean; txHash: string }> {
    this.invalidateCache(`keeper:${jobId}`);
    
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/keepers/${jobId}/execute`,
      {
        method: 'POST',
        headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      }
    );

    return response.json() as Promise<{ success: boolean; txHash: string }>;
  }

  /**
   * Send CCIP (Cross-Chain Interoperability Protocol) message
   */
  async sendCCIPMessage(message: CCIPMessage): Promise<{ messageId: string }> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/ccip/send`,
      {
        method: 'POST',
        headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }
    );

    return response.json() as Promise<{ messageId: string }>;
  }

  /**
   * Get CCIP message status
   */
  async getCCIPMessageStatus(messageId: string): Promise<{
    status: 'pending' | 'confirmed' | 'executed' | 'failed';
    sourceChain: string;
    destinationChain: string;
    confirmations?: number;
  }> {
    const cacheKey = `ccip:${messageId}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/ccip/${messageId}`,
      { headers: { 'X-API-Key': this.apiKey } }
    );

    const data = await response.json();
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Get Chainlink health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    activeNodes: number;
    totalNodes: number;
    uptime: number;
    feedsCount: number;
    averageLatency: number;
  }> {
    const cacheKey = 'health';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/health`,
      { headers: { 'X-API-Key': this.apiKey } }
    );

    const data = await response.json();
    this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Internal: Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.ok) {
          return response;
        }

        if (response.status === 429 || response.status >= 500) {
          // Retry on rate limit or server errors
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Request failed after retries');
  }

  /**
   * Cache management
   */
  private getCached(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheDuration,
    });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache duration
   */
  setCacheDuration(duration: number): void {
    this.cacheDuration = duration;
  }
}

/**
 * Create default client instance
 */
export function createChaincallinkClient(cacheDuration?: number): ChaincallinkClient {
  const apiKey = process.env.CHAINLINK_API_KEY || '';
  const baseUrl = process.env.CHAINLINK_BASE_URL;
  
  if (!apiKey) {
    console.warn('Warning: CHAINLINK_API_KEY environment variable not set');
  }

  return new ChaincallinkClient(apiKey, baseUrl, cacheDuration);
}

export default ChaincallinkClient;
