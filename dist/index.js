const f = new Error("request for lock canceled");
var v = function(l, e, r, n) {
  function o(i) {
    return i instanceof r ? i : new r(function(a) {
      a(i);
    });
  }
  return new (r || (r = Promise))(function(i, a) {
    function h(s) {
      try {
        c(n.next(s));
      } catch (u) {
        a(u);
      }
    }
    function d(s) {
      try {
        c(n.throw(s));
      } catch (u) {
        a(u);
      }
    }
    function c(s) {
      s.done ? i(s.value) : o(s.value).then(h, d);
    }
    c((n = n.apply(l, e || [])).next());
  });
};
class w {
  constructor(e, r = f) {
    this._value = e, this._cancelError = r, this._weightedQueues = [], this._weightedWaiters = [];
  }
  acquire(e = 1) {
    if (e <= 0)
      throw new Error(`invalid weight ${e}: must be positive`);
    return new Promise((r, n) => {
      this._weightedQueues[e - 1] || (this._weightedQueues[e - 1] = []), this._weightedQueues[e - 1].push({ resolve: r, reject: n }), this._dispatch();
    });
  }
  runExclusive(e, r = 1) {
    return v(this, void 0, void 0, function* () {
      const [n, o] = yield this.acquire(r);
      try {
        return yield e(n);
      } finally {
        o();
      }
    });
  }
  waitForUnlock(e = 1) {
    if (e <= 0)
      throw new Error(`invalid weight ${e}: must be positive`);
    return new Promise((r) => {
      this._weightedWaiters[e - 1] || (this._weightedWaiters[e - 1] = []), this._weightedWaiters[e - 1].push(r), this._dispatch();
    });
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(e) {
    this._value = e, this._dispatch();
  }
  release(e = 1) {
    if (e <= 0)
      throw new Error(`invalid weight ${e}: must be positive`);
    this._value += e, this._dispatch();
  }
  cancel() {
    this._weightedQueues.forEach((e) => e.forEach((r) => r.reject(this._cancelError))), this._weightedQueues = [];
  }
  _dispatch() {
    var e;
    for (let r = this._value; r > 0; r--) {
      const n = (e = this._weightedQueues[r - 1]) === null || e === void 0 ? void 0 : e.shift();
      if (!n)
        continue;
      const o = this._value, i = r;
      this._value -= r, r = this._value + 1, n.resolve([o, this._newReleaser(i)]);
    }
    this._drainUnlockWaiters();
  }
  _newReleaser(e) {
    let r = !1;
    return () => {
      r || (r = !0, this.release(e));
    };
  }
  _drainUnlockWaiters() {
    for (let e = this._value; e > 0; e--)
      this._weightedWaiters[e - 1] && (this._weightedWaiters[e - 1].forEach((r) => r()), this._weightedWaiters[e - 1] = []);
  }
}
var y = function(l, e, r, n) {
  function o(i) {
    return i instanceof r ? i : new r(function(a) {
      a(i);
    });
  }
  return new (r || (r = Promise))(function(i, a) {
    function h(s) {
      try {
        c(n.next(s));
      } catch (u) {
        a(u);
      }
    }
    function d(s) {
      try {
        c(n.throw(s));
      } catch (u) {
        a(u);
      }
    }
    function c(s) {
      s.done ? i(s.value) : o(s.value).then(h, d);
    }
    c((n = n.apply(l, e || [])).next());
  });
};
class m {
  constructor(e) {
    this._semaphore = new w(1, e);
  }
  acquire() {
    return y(this, void 0, void 0, function* () {
      const [, e] = yield this._semaphore.acquire();
      return e;
    });
  }
  runExclusive(e) {
    return this._semaphore.runExclusive(() => e());
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock() {
    return this._semaphore.waitForUnlock();
  }
  release() {
    this._semaphore.isLocked() && this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
}
const t = class t {
  constructor() {
  }
  static get_connected() {
    return t.connected;
  }
  static get_user() {
    return t.user;
  }
  static log(...e) {
    console.log(this.logPrefix, ...e);
  }
  static error(...e) {
    console.error(this.logPrefix, ...e);
  }
  static checkPaymentBasePath() {
    t.paymentBasePath == "tbd" && (typeof window < "u" && (window.__NEXT_DATA__ || typeof window.next < "u" && window.next.version) ? t.paymentBasePath = "api/pi_payment" : t.paymentBasePath = "pi_payment");
  }
  initializePiSdkBase() {
  }
  async connect() {
    const e = await t.connectMutex.acquire();
    try {
      if (t.connected && t.user) {
        typeof this.onConnection == "function" && this.onConnection();
        return;
      }
      if (!window.Pi || typeof window.Pi.init != "function") {
        t.error("Pi SDK not loaded.");
        return;
      }
      let r = { version: t.version };
      const n = window.RAILS_ENV || typeof process < "u" && (process.env?.RAILS_ENV || process.env?.NODE_ENV) || "development";
      (n === "development" || n === "test") && (r.sandbox = !0), window.Pi.init(r), t.log("SDK initialized", r), t.connected = !1;
      try {
        const o = await window.Pi.authenticate([
          "payments",
          "username"
        ], t.onIncompletePaymentFound);
        t.accessToken = o.accessToken, t.user = o.user, t.connected = !0, t.log("Auth OK", o), typeof this.onConnection == "function" && this.onConnection();
      } catch (o) {
        t.connected = !1, t.error("Auth failed", o);
      }
    } finally {
      e();
    }
  }
  static async postToServer(e, r) {
    t.checkPaymentBasePath();
    const n = t.paymentBasePath;
    return t.log(`POST: ${n}/${e}: ${JSON.stringify(r)}`), (await fetch(`${n}/${e}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(r)
    })).json();
  }
  static async onReadyForServerApproval(e, r) {
    if (!e) {
      t.error("Approval: missing paymentId");
      return;
    }
    if (!r) {
      t.error("Approval: missing accessToken");
      return;
    }
    try {
      const n = await t.postToServer("approve", {
        paymentId: e,
        accessToken: r
      });
      t.log("approve:", n);
    } catch (n) {
      t.error("approve error", n);
    }
  }
  static async onReadyForServerCompletion(e, r) {
    if (!e || !r) {
      t.error("Completion: missing ids");
      return;
    }
    try {
      const n = await t.postToServer("complete", {
        paymentId: e,
        transactionId: r
      });
      t.log("complete:", n);
    } catch (n) {
      t.error("complete error", n);
    }
  }
  static async onCancel(e) {
    if (!e) {
      t.error("Cancel: missing paymentId");
      return;
    }
    try {
      const r = await t.postToServer("cancel", { paymentId: e });
      t.log("cancel:", r);
    } catch (r) {
      t.error("cancel error", r);
    }
  }
  static async onError(e, r) {
    const n = r?.identifier;
    if (!n || !r) {
      t.error("Error: missing ids", e, r);
      return;
    }
    try {
      const o = await t.postToServer("error", { paymentId: n, error: e });
      t.log("error:", o);
    } catch (o) {
      t.error("error post", o);
    }
  }
  static async onIncompletePaymentFound(e) {
    const r = e?.identifier, n = e?.transaction?.txid || null;
    if (!r) {
      t.error("Incomplete: missing paymentId");
      return;
    }
    try {
      const o = await t.postToServer("incomplete", { paymentId: r, transactionId: n });
      t.log("incomplete:", o);
    } catch (o) {
      t.error("incomplete post error", o);
    }
  }
  /**
   * Create a new payment request.
   * @param {object} paymentData - Payment details.
   * @param {number} paymentData.amount - Amount in Pi.
   * @param {string} paymentData.memo - Payment memo.
   * @param {object} paymentData.metadata - Optional metadata.
   */
  createPayment(e) {
    if (!t.connected) {
      t.error("Not connected to Pi.");
      return;
    }
    const { amount: r, memo: n, metadata: o } = e || {};
    if (typeof r != "number" || !n || typeof n != "string" || !o || typeof o != "object" || Object.keys(o).length === 0) {
      t.error("Invalid paymentData", e);
      return;
    }
    const i = (a) => {
      t.onReadyForServerApproval(a, t.accessToken);
    };
    Pi.createPayment(
      e,
      {
        onReadyForServerApproval: i,
        onReadyForServerCompletion: t.onReadyForServerCompletion,
        onCancel: t.onCancel,
        onError: t.onError,
        onIncompletePaymentFound: t.onIncompletePaymentFound
      }
    );
  }
};
t.user = null, t.connected = !1, t.paymentBasePath = "tbd", t.logPrefix = "[PiSDK]", t.version = "2.0", t.connectMutex = new m(), t.accessToken = null;
let p = t;
typeof window < "u" && (window.PiSdkBase = p);
export {
  p as PiSdkBase
};
//# sourceMappingURL=index.js.map
