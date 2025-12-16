/**
 * PiSdkBase
 *
 * Framework-agnostic base class for managing Pi Network auth & payments logic.
 *
 * - All state is stored statically, because Pi Browser only allows one session/user at a time.
 * - This class is intended to be mixed in or composed with framework-specific components (React, Stimulus, etc).
 * - Extend and/or override methods as needed.
 */
import { Mutex } from 'async-mutex';

export interface PiUser {
  name: string;
  [key: string]: any;
}

export interface PaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

// TODO: Strongly type paymentDTO according to Pi SDK docs.

declare global {
  interface Window {
    Pi: any;
    RAILS_ENV?: string;
  }
  var Pi: any;
}

export default class PiSdkBase {
  /**
   * Pi Network username object (shared across all instances)
   * @type {object|null}
   */
  static user : PiUser | null = null;

  /**
   * Connected status (shared across all instances)
   * @type {boolean}
   */
  static connected: boolean = false;

  /**
   * Default payment API path (can be overridden)
   * @type {string}
   */
  static paymentBasePath: string = 'pi_payment';

  /**
   * Log prefix for all static logs
   * @type {string}
   */
  static logPrefix: string  = '[PiSDK]';

  /**
   * SDK version
   * @type {string}
   */
  static version: string = "2.0";

  static connectMutex: Mutex = new Mutex();

  static accessToken: string | null = null;

  onConnection?: () => void;

  constructor() {}

  /**
   * Returns the current connection status
   * @returns {boolean}
   */
  static get_connected(): boolean { return PiSdkBase.connected; }

  /**
   * Returns the active user (if any)
   * @returns {object|null}
   */
  static get_user(): PiUser | null { return PiSdkBase.user; }

  /**
   * Log info details (prefixed)
   * @param {...any} args
   */
  static log(...args: unknown[]): void { console.log(this.logPrefix, ...args); }

  /**
   * Log error details (prefixed)
   * @param {...any} args
   */
  static error(...args: unknown[]): void { console.error(this.logPrefix, ...args); }

  /**
   * Initialize/reset this instance only.
   * Does NOT modify static user or connected -- leaves connection/global state alone.
   * Future: reset instance fields here.
   */
  initializePiSdkBase(): void {
    // (When instance fields are added, reset them here.)
  }

  /**
   * Authenticate and connect user to Pi Network.
   * Sets PiSdkBase.connected and user. Calls `onConnection` if present.
   * @async
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    const release = await PiSdkBase.connectMutex.acquire();
    try {
      if (PiSdkBase.connected && PiSdkBase.user) {
        // Already connected, skip re-authentication
        if (typeof this.onConnection == 'function') {
	  // Trigger post connection actions
          this.onConnection();
        }
        return;
      }
      if (!window.Pi ||
	  typeof window.Pi.init !== "function") {
        PiSdkBase.error("Pi SDK not loaded.");
        return;
      }
      // Fix type for this object:
      let piInitOptions: { version: string; sandbox?: boolean } = { version: PiSdkBase.version };
      const backendEnv = (window.RAILS_ENV ||
			  (typeof process !== 'undefined' && (process.env?.RAILS_ENV ||
							      process.env?.NODE_ENV)) || "development");
      if (backendEnv === "development" || backendEnv === "test") {
        piInitOptions.sandbox = true;
      }
      Pi.init(piInitOptions);
      PiSdkBase.log("SDK initialized", piInitOptions);
      PiSdkBase.connected = false;
      try {
        const authResponse = await Pi.authenticate(
          ["payments", "username"],
          PiSdkBase.onIncompletePaymentFound
        );
        PiSdkBase.accessToken = authResponse.accessToken;
        PiSdkBase.user = authResponse.user;
        PiSdkBase.connected = true;
        PiSdkBase.log("Auth OK", authResponse);
        if (typeof this.onConnection == 'function') {
          this.onConnection();
        }
      } catch (err) {
        PiSdkBase.connected = false;
        PiSdkBase.error("Auth failed", err);
      }
    } finally {
      release();
    }
  }

  static async postToServer(path: string, body: object): Promise<any> {
    const base = this.paymentBasePath || PiSdkBase.paymentBasePath;
    const resp = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return resp.json();
  }

  static async onReadyForServerApproval(paymentId: string,
					accessToken: string): Promise<void> {
    if (!paymentId) {
      PiSdkBase.error("Approval: missing paymentId");
      return;
    }
    if (!accessToken) {
      PiSdkBase.error("Approval: missing accessToken");
      return;
    }
    try {
      const data = await PiSdkBase.postToServer("approve",
						{ paymentId,
						  accessToken});
      PiSdkBase.log("approve:", data);
    } catch(err) {
      PiSdkBase.error("approve error", err);
    }
  }

  static async onReadyForServerCompletion(paymentId: string,
					  transactionId: string) : Promise<void> {
    if (!paymentId || !transactionId) {
      PiSdkBase.error("Completion: missing ids");
      return;
    }
    try {
      const data = await PiSdkBase.postToServer("complete",
						{ paymentId,
						  transactionId });
      PiSdkBase.log("complete:", data);
    } catch(err) {
      PiSdkBase.error("complete error", err);
    }
  }

  static async onCancel(paymentId: string): Promise<void> {
    if (!paymentId) {
      PiSdkBase.error("Cancel: missing paymentId");
      return;
    }
    try {
      const data = await PiSdkBase.postToServer("cancel",
						{ paymentId });
      PiSdkBase.log("cancel:", data);
    } catch(err) {
      PiSdkBase.error("cancel error", err);
    }
  }

  static async onError(error: string,
		       paymentDTO: any): Promise<void> {
    const paymentId = paymentDTO?.identifier;
    if (!paymentId || !paymentDTO) {
      PiSdkBase.error("Error: missing ids", error, paymentDTO);
      return;
    }
    try {
      const data = await PiSdkBase.postToServer("error", { paymentId, error });
      PiSdkBase.log("error:", data);
    } catch(err) {
      PiSdkBase.error("error post", err);
    }
  }

  static async onIncompletePaymentFound(paymentDTO: any) {
    const paymentId = paymentDTO?.identifier;
    const transactionId = paymentDTO?.transaction?.txid || null;
    if (!paymentId) {
      PiSdkBase.error("Incomplete: missing paymentId");
      return;
    }
    try {
      const data = await PiSdkBase.postToServer("incomplete", { paymentId, transactionId });
      PiSdkBase.log("incomplete:", data);
    } catch(err) {
      PiSdkBase.error("incomplete post error", err);
    }
  }

  /**
   * Create a new payment request.
   * @param {object} paymentData - Payment details.
   * @param {number} paymentData.amount - Amount in Pi.
   * @param {string} paymentData.memo - Payment memo.
   * @param {object} paymentData.metadata - Optional metadata.
   */
  createPayment(paymentData: PaymentData): void {
    if (!PiSdkBase.connected) {
      PiSdkBase.error("Not connected to Pi.");
      return;
    }
    const { amount, memo, metadata } = paymentData || {};
    if (typeof amount !== 'number' ||
        !memo || typeof memo !== 'string' ||
        !metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
      PiSdkBase.error("Invalid paymentData", paymentData);
      return;
    }

    const onReadyForServerApproval = (paymentId: string) => {
      PiSdkBase.onReadyForServerApproval(paymentId,
      PiSdkBase.accessToken!);
    }
    Pi.createPayment(
      paymentData,
      {
        "onReadyForServerApproval": onReadyForServerApproval,
        "onReadyForServerCompletion": PiSdkBase.onReadyForServerCompletion,
        "onCancel": PiSdkBase.onCancel,
        "onError": PiSdkBase.onError,
        "onIncompletePaymentFound": PiSdkBase.onIncompletePaymentFound
      }
    );
  }
}

if (typeof window !== 'undefined') {
  (window as any).PiSdkBase = PiSdkBase;
}
