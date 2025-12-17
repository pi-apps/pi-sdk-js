# pi-sdk-js

A framework-agnostic JavaScript/TypeScript library for integrating Pi Network payment authentication and transaction flows in web applications.

## Features
- Protocol logic for Pi Network browser authentication and payment flows
- Concurrency-safe connection/authentication (`async-mutex` guarded)
- Framework-agnostic: use with React, Stimulus, or vanilla JS frontends
- TypeScript types provided (PiUser, PaymentData)
- Designed for integration in larger monorepos or as a standalone npm package
- Used as the base for higher-level UI libraries and Rails integrations

## Installation

From npm:
```sh
npm install pi-sdk-js
yarn add pi-sdk-js
```

Monorepo/local package development:
```sh
yarn add file:../js-base
```

## Usage Example

### Basic Setup
```ts
import { PiSdkBase, PaymentData } from "pi-sdk-js";

const sdk = new PiSdkBase();
sdk.onConnection = () => {
  // Ready to enable buy buttons, fetch user info, etc
};
sdk.connect();

function buy() {
  const paymentData: PaymentData = {
    amount: 0.01,
    memo: "Demo product",
    metadata: { description: "Demo", order_id: 1234 }
  };
  sdk.createPayment(paymentData);
}
```

### In a React Component
```tsx
import { PiSdkBase, PaymentData } from "pi-sdk-js";
import React, { useState, useEffect, useRef } from "react";

export default function PiButton() {
  const [connected, setConnected] = useState(false);
  const sdkRef = useRef<PiSdkBase | null>(null);

  useEffect(() => {
    const sdk = new PiSdkBase();
    sdk.onConnection = () => setConnected(true);
    sdkRef.current = sdk;
    sdk.connect();
  }, []);

  const buy = () => {
    const paymentData: PaymentData = {
      amount: 0.01,
      memo: "React Demo",
      metadata: { description: "Demo", order_id: Math.floor(10000 + Math.random() * 90000) }
    };
    sdkRef.current?.createPayment(paymentData);
  };

  return <button disabled={!connected} onClick={buy}>Buy</button>;
}
```

## API

### `class PiSdkBase`
- `.connect()` - Initiate connection and authentication. Handles concurrency via async-mutex.
- `.onConnection` - Optional callback for connection success.
- `.createPayment(paymentData)` - Initiate a Pi payment with required details.
- Static methods for checking connection and user state: `.get_connected()`, `.get_user()`
- See TypeScript declarations for all methods and type details.

### `PaymentData`
TypeScript interface for payment details:
```ts
interface PaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}
```

## Building & Publishing

Build (in monorepo):
```sh
yarn build
```

- Only the `dist/` directory is published as part of this package.
- Tests and test utilities are excluded from the distribution.

## License
SEE LICENCE IN LICENSE

## Author
John Kolen
