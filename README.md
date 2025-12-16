# pi-sdk-js

The **pi-sdk-js** package provides the core JavaScript SDK logic for Pi Network payment flows. It offers a framework-agnostic, reusable base class implementing the protocol and transaction lifecycle, so all frontends in the ecosystem (React, Stimulus, Vue, etc.) share consistent business logic and API interactions.

## Purpose
- **Protocol abstraction:** Implements core Pi Network connect, authenticate, and payment workflows, using the Pi Browser SDK under the hood.
- **Frontend-agnostic:** Can be used in any modern JavaScript frontend, either directly or as a dependency of a framework-specific package.
- **Concurrency Safety:** Prevents concurrent/race condition issues during authentication with an internal mutex.
- **Single source of truth:** Upgrades and bugfixes here flow through all frontend integrations.

## Typical Usage
You usually won't use this package directly; instead, you'll use a framework package (like `pi-sdk-react`) that relies on it.

However, if you are integrating directly, simply inherit from, instantiate, or compose with the `PiSdkBase` class:

```js
import PiSdkBase from 'pi-sdk-js';

const pi = new PiSdkBase();
await pi.connect();
await pi.createPayment({ amount: 1, memo: "Test", metadata: { example: true } });
```

## Core API and Methods for Frontend Developers

### Methods

- **`async connect()`**
  Connects/authenticates the user to Pi Network. Call upon mount or when the user initiates login.

- **`async createPayment({ amount, memo, metadata, ... })`**
  Begin a Pi payment. Call this with payment details when user clicks a "Pay"/"Buy" button.

- **Lifecycle/Event hooks (overridable/bindable):**
    - `onConnection(user, accessToken)` – Called after successful connection.
    - `onReadyForServerApproval(paymentData)` – Called when ready for your server's payment approval (for UI spinner, etc).
    - `onApproveSuccess(paymentResult)` – Called when the Pi payment is fully completed and approved.
    - `onError(error)` – Called on errors during connect/payment flows.

### Properties
- **`connected`**: `boolean` — Whether the user is authenticated.
- **`user`**: `object|null` — Authenticated user data, if available.

### Events usage example
```js
const pi = new PiSdkBase();
pi.onConnection = (user, accessToken) => {
  // update UI, save session, etc.
};
pi.onError = (error) => {
  alert(`Pi error: ${error}`);
};
await pi.connect();
```

## Summary Table

| Method/Prop                 | Purpose                                      |
|-----------------------------|----------------------------------------------|
| `connect()`                 | Start login/authentication                   |
| `createPayment()`           | Initiate payment flow                        |
| `onConnection()`            | React to successful login                    |
| `onReadyForServerApproval()`| Payment protocol: waiting for approval step  |
| `onApproveSuccess()`        | After payment approved, user notified        |
| `onError()`                 | Handle errors (UI, logging, retry, etc.)     |
| `connected`                 | Is user authenticated? (buttons/UI)          |
| `user`                      | Current Pi user info                         |

## Contributing
All protocol logic should live here and be as side-effect-free and UI-agnostic as possible. Keep dependencies, especially UI, to a minimum—child packages handle framework-specific integration.

## License
This package is available as open source under the terms of the [PiOS License]. See `LICENSE` for details.
