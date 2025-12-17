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
export class PiSdkBase {
    constructor() { }
    /**
     * Returns the current connection status
     * @returns {boolean}
     */
    static get_connected() { return PiSdkBase.connected; }
    /**
     * Returns the active user (if any)
     * @returns {object|null}
     */
    static get_user() { return PiSdkBase.user; }
    /**
     * Log info details (prefixed)
     * @param {...any} args
     */
    static log(...args) { console.log(this.logPrefix, ...args); }
    /**
     * Log error details (prefixed)
     * @param {...any} args
     */
    static error(...args) { console.error(this.logPrefix, ...args); }
    /**
     * Initialize/reset this instance only.
     * Does NOT modify static user or connected -- leaves connection/global state alone.
     * Future: reset instance fields here.
     */
    initializePiSdkBase() {
        // (When instance fields are added, reset them here.)
    }
    /**
     * Authenticate and connect user to Pi Network.
     * Sets PiSdkBase.connected and user. Calls `onConnection` if present.
     * @async
     * @returns {Promise<void>}
     */
    async connect() {
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
            let piInitOptions = { version: PiSdkBase.version };
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
                const authResponse = await Pi.authenticate(["payments", "username"], PiSdkBase.onIncompletePaymentFound);
                PiSdkBase.accessToken = authResponse.accessToken;
                PiSdkBase.user = authResponse.user;
                PiSdkBase.connected = true;
                PiSdkBase.log("Auth OK", authResponse);
                if (typeof this.onConnection == 'function') {
                    this.onConnection();
                }
            }
            catch (err) {
                PiSdkBase.connected = false;
                PiSdkBase.error("Auth failed", err);
            }
        }
        finally {
            release();
        }
    }
    static async postToServer(path, body) {
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
    static async onReadyForServerApproval(paymentId, accessToken) {
        if (!paymentId) {
            PiSdkBase.error("Approval: missing paymentId");
            return;
        }
        if (!accessToken) {
            PiSdkBase.error("Approval: missing accessToken");
            return;
        }
        try {
            const data = await PiSdkBase.postToServer("approve", { paymentId,
                accessToken });
            PiSdkBase.log("approve:", data);
        }
        catch (err) {
            PiSdkBase.error("approve error", err);
        }
    }
    static async onReadyForServerCompletion(paymentId, transactionId) {
        if (!paymentId || !transactionId) {
            PiSdkBase.error("Completion: missing ids");
            return;
        }
        try {
            const data = await PiSdkBase.postToServer("complete", { paymentId,
                transactionId });
            PiSdkBase.log("complete:", data);
        }
        catch (err) {
            PiSdkBase.error("complete error", err);
        }
    }
    static async onCancel(paymentId) {
        if (!paymentId) {
            PiSdkBase.error("Cancel: missing paymentId");
            return;
        }
        try {
            const data = await PiSdkBase.postToServer("cancel", { paymentId });
            PiSdkBase.log("cancel:", data);
        }
        catch (err) {
            PiSdkBase.error("cancel error", err);
        }
    }
    static async onError(error, paymentDTO) {
        const paymentId = paymentDTO?.identifier;
        if (!paymentId || !paymentDTO) {
            PiSdkBase.error("Error: missing ids", error, paymentDTO);
            return;
        }
        try {
            const data = await PiSdkBase.postToServer("error", { paymentId, error });
            PiSdkBase.log("error:", data);
        }
        catch (err) {
            PiSdkBase.error("error post", err);
        }
    }
    static async onIncompletePaymentFound(paymentDTO) {
        const paymentId = paymentDTO?.identifier;
        const transactionId = paymentDTO?.transaction?.txid || null;
        if (!paymentId) {
            PiSdkBase.error("Incomplete: missing paymentId");
            return;
        }
        try {
            const data = await PiSdkBase.postToServer("incomplete", { paymentId, transactionId });
            PiSdkBase.log("incomplete:", data);
        }
        catch (err) {
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
    createPayment(paymentData) {
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
        const onReadyForServerApproval = (paymentId) => {
            PiSdkBase.onReadyForServerApproval(paymentId, PiSdkBase.accessToken);
        };
        Pi.createPayment(paymentData, {
            "onReadyForServerApproval": onReadyForServerApproval,
            "onReadyForServerCompletion": PiSdkBase.onReadyForServerCompletion,
            "onCancel": PiSdkBase.onCancel,
            "onError": PiSdkBase.onError,
            "onIncompletePaymentFound": PiSdkBase.onIncompletePaymentFound
        });
    }
}
/**
 * Pi Network username object (shared across all instances)
 * @type {object|null}
 */
PiSdkBase.user = null;
/**
 * Connected status (shared across all instances)
 * @type {boolean}
 */
PiSdkBase.connected = false;
/**
 * Default payment API path (can be overridden)
 * @type {string}
 */
PiSdkBase.paymentBasePath = 'pi_payment';
/**
 * Log prefix for all static logs
 * @type {string}
 */
PiSdkBase.logPrefix = '[PiSDK]';
/**
 * SDK version
 * @type {string}
 */
PiSdkBase.version = "2.0";
PiSdkBase.connectMutex = new Mutex();
PiSdkBase.accessToken = null;
if (typeof window !== 'undefined') {
    window.PiSdkBase = PiSdkBase;
}
