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
    static user: PiUser | null;
    /**
     * Connected status (shared across all instances)
     * @type {boolean}
     */
    static connected: boolean;
    /**
     * Default payment API path (can be overridden)
     * @type {string}
     */
    static paymentBasePath: string;
    /**
     * Log prefix for all static logs
     * @type {string}
     */
    static logPrefix: string;
    /**
     * SDK version
     * @type {string}
     */
    static version: string;
    static connectMutex: Mutex;
    static accessToken: string | null;
    onConnection?: () => void;
    constructor();
    /**
     * Returns the current connection status
     * @returns {boolean}
     */
    static get_connected(): boolean;
    /**
     * Returns the active user (if any)
     * @returns {object|null}
     */
    static get_user(): PiUser | null;
    /**
     * Log info details (prefixed)
     * @param {...any} args
     */
    static log(...args: unknown[]): void;
    /**
     * Log error details (prefixed)
     * @param {...any} args
     */
    static error(...args: unknown[]): void;
    /**
     * Initialize/reset this instance only.
     * Does NOT modify static user or connected -- leaves connection/global state alone.
     * Future: reset instance fields here.
     */
    initializePiSdkBase(): void;
    /**
     * Authenticate and connect user to Pi Network.
     * Sets PiSdkBase.connected and user. Calls `onConnection` if present.
     * @async
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    static postToServer(path: string, body: object): Promise<any>;
    static onReadyForServerApproval(paymentId: string, accessToken: string): Promise<void>;
    static onReadyForServerCompletion(paymentId: string, transactionId: string): Promise<void>;
    static onCancel(paymentId: string): Promise<void>;
    static onError(error: string, paymentDTO: any): Promise<void>;
    static onIncompletePaymentFound(paymentDTO: any): Promise<void>;
    /**
     * Create a new payment request.
     * @param {object} paymentData - Payment details.
     * @param {number} paymentData.amount - Amount in Pi.
     * @param {string} paymentData.memo - Payment memo.
     * @param {object} paymentData.metadata - Optional metadata.
     */
    createPayment(paymentData: PaymentData): void;
}
