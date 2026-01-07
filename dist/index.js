const f = new Error("request for lock canceled");
var v = function(l, e, t, n) {
  function o(i) {
    return i instanceof t ? i : new t(function(c) {
      c(i);
    });
  }
  return new (t || (t = Promise))(function(i, c) {
    function h(s) {
      try {
        a(n.next(s));
      } catch (u) {
        c(u);
      }
    }
    function p(s) {
      try {
        a(n.throw(s));
      } catch (u) {
        c(u);
      }
    }
    function a(s) {
      s.done ? i(s.value) : o(s.value).then(h, p);
    }
    a((n = n.apply(l, e || [])).next());
  });
};
class m {
  constructor(e, t = f) {
    this._value = e, this._cancelError = t, this._weightedQueues = [], this._weightedWaiters = [];
  }
  acquire(e = 1) {
    if (e <= 0)
      throw new Error(`invalid weight ${e}: must be positive`);
    return new Promise((t, n) => {
      this._weightedQueues[e - 1] || (this._weightedQueues[e - 1] = []), this._weightedQueues[e - 1].push({ resolve: t, reject: n }), this._dispatch();
    });
  }
  runExclusive(e, t = 1) {
    return v(this, void 0, void 0, function* () {
      const [n, o] = yield this.acquire(t);
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
    return new Promise((t) => {
      this._weightedWaiters[e - 1] || (this._weightedWaiters[e - 1] = []), this._weightedWaiters[e - 1].push(t), this._dispatch();
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
    this._weightedQueues.forEach((e) => e.forEach((t) => t.reject(this._cancelError))), this._weightedQueues = [];
  }
  _dispatch() {
    var e;
    for (let t = this._value; t > 0; t--) {
      const n = (e = this._weightedQueues[t - 1]) === null || e === void 0 ? void 0 : e.shift();
      if (!n)
        continue;
      const o = this._value, i = t;
      this._value -= t, t = this._value + 1, n.resolve([o, this._newReleaser(i)]);
    }
    this._drainUnlockWaiters();
  }
  _newReleaser(e) {
    let t = !1;
    return () => {
      t || (t = !0, this.release(e));
    };
  }
  _drainUnlockWaiters() {
    for (let e = this._value; e > 0; e--)
      this._weightedWaiters[e - 1] && (this._weightedWaiters[e - 1].forEach((t) => t()), this._weightedWaiters[e - 1] = []);
  }
}
var w = function(l, e, t, n) {
  function o(i) {
    return i instanceof t ? i : new t(function(c) {
      c(i);
    });
  }
  return new (t || (t = Promise))(function(i, c) {
    function h(s) {
      try {
        a(n.next(s));
      } catch (u) {
        c(u);
      }
    }
    function p(s) {
      try {
        a(n.throw(s));
      } catch (u) {
        c(u);
      }
    }
    function a(s) {
      s.done ? i(s.value) : o(s.value).then(h, p);
    }
    a((n = n.apply(l, e || [])).next());
  });
};
class y {
  constructor(e) {
    this._semaphore = new m(1, e);
  }
  acquire() {
    return w(this, void 0, void 0, function* () {
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
const r = class r {
  constructor() {
  }
  static get_connected() {
    return r.connected;
  }
  static get_user() {
    return r.user;
  }
  static log(...e) {
    console.log(this.logPrefix, ...e);
  }
  static error(...e) {
    console.error(this.logPrefix, ...e);
  }
  initializePiSdkBase() {
  }
  async connect() {
    const e = await r.connectMutex.acquire();
    try {
      if (r.connected && r.user) {
        typeof this.onConnection == "function" && this.onConnection();
        return;
      }
      if (!window.Pi || typeof window.Pi.init != "function") {
        r.error("Pi SDK not loaded.");
        return;
      }
      let t = { version: r.version };
      const n = window.RAILS_ENV || typeof process < "u" && (process.env?.RAILS_ENV || process.env?.NODE_ENV) || "development";
      (n === "development" || n === "test") && (t.sandbox = !0), window.Pi.init(t), r.log("SDK initialized", t), r.connected = !1;
      try {
        const o = await window.Pi.authenticate([
          "payments",
          "username"
        ], r.onIncompletePaymentFound);
        r.accessToken = o.accessToken, r.user = o.user, r.connected = !0, r.log("Auth OK", o), typeof this.onConnection == "function" && this.onConnection();
      } catch (o) {
        r.connected = !1, r.error("Auth failed", o);
      }
    } finally {
      e();
    }
  }
  static async postToServer(e, t) {
    const n = this.paymentBasePath || r.paymentBasePath;
    return (await fetch(`${n}/${e}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(t)
    })).json();
  }
  static async onReadyForServerApproval(e, t) {
    if (!e) {
      r.error("Approval: missing paymentId");
      return;
    }
    if (!t) {
      r.error("Approval: missing accessToken");
      return;
    }
    try {
      const n = await r.postToServer("approve", {
        paymentId: e,
        accessToken: t
      });
      r.log("approve:", n);
    } catch (n) {
      r.error("approve error", n);
    }
  }
  static async onReadyForServerCompletion(e, t) {
    if (!e || !t) {
      r.error("Completion: missing ids");
      return;
    }
    try {
      const n = await r.postToServer("complete", {
        paymentId: e,
        transactionId: t
      });
      r.log("complete:", n);
    } catch (n) {
      r.error("complete error", n);
    }
  }
  static async onCancel(e) {
    if (!e) {
      r.error("Cancel: missing paymentId");
      return;
    }
    try {
      const t = await r.postToServer("cancel", { paymentId: e });
      r.log("cancel:", t);
    } catch (t) {
      r.error("cancel error", t);
    }
  }
  static async onError(e, t) {
    const n = t?.identifier;
    if (!n || !t) {
      r.error("Error: missing ids", e, t);
      return;
    }
    try {
      const o = await r.postToServer("error", { paymentId: n, error: e });
      r.log("error:", o);
    } catch (o) {
      r.error("error post", o);
    }
  }
  static async onIncompletePaymentFound(e) {
    const t = e?.identifier, n = e?.transaction?.txid || null;
    if (!t) {
      r.error("Incomplete: missing paymentId");
      return;
    }
    try {
      const o = await r.postToServer("incomplete", { paymentId: t, transactionId: n });
      r.log("incomplete:", o);
    } catch (o) {
      r.error("incomplete post error", o);
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
    if (!r.connected) {
      r.error("Not connected to Pi.");
      return;
    }
    const { amount: t, memo: n, metadata: o } = e || {};
    if (typeof t != "number" || !n || typeof n != "string" || !o || typeof o != "object" || Object.keys(o).length === 0) {
      r.error("Invalid paymentData", e);
      return;
    }
    const i = (c) => {
      r.onReadyForServerApproval(c, r.accessToken);
    };
    Pi.createPayment(
      e,
      {
        onReadyForServerApproval: i,
        onReadyForServerCompletion: r.onReadyForServerCompletion,
        onCancel: r.onCancel,
        onError: r.onError,
        onIncompletePaymentFound: r.onIncompletePaymentFound
      }
    );
  }
};
r.user = null, r.connected = !1, r.paymentBasePath = "pi_payment", r.logPrefix = "[PiSDK]", r.version = "2.0", r.connectMutex = new y(), r.accessToken = null;
let d = r;
typeof window < "u" && (window.PiSdkBase = d);
export {
  d as PiSdkBase
};
//# sourceMappingURL=index.js.map
