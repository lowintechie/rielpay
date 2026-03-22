# baraypay

Unified TypeScript SDK for Cambodian payments.

## About

baraypay is an open-source Node.js + TypeScript SDK that gives developers one clean API for Cambodian payments.
Instead of handling different provider APIs one by one, you integrate once and plug in providers like ABA PayWay and Bakong KHQR.

It is designed for production backend environments and framework flexibility, with first-class support for:
- payment creation and verification
- KHQR generation
- webhook handling
- Express and Next.js API integrations

Supported providers:
- ABA PayWay
- Bakong KHQR

Repository:
- https://github.com/lowintechie/baraypay

## Installation

```bash
npm install baraypay
```

## Quick Start

```ts
import { createBarayPay, abaPayway, bakongKHQR } from "baraypay";

const baraypay = createBarayPay({
  providers: [
    abaPayway({
      merchantId: process.env.ABA_MERCHANT_ID!,
      apiKey: process.env.ABA_API_KEY!,
      environment: "sandbox"
    }),
    bakongKHQR({
      merchantId: process.env.BAKONG_MERCHANT_ID!,
      merchantName: "baraypay Demo Merchant"
    })
  ]
});

const payment = await baraypay.createPayment({
  provider: "aba",
  amount: 10,
  currency: "USD",
  orderId: "order_123"
});

console.log(payment);
```

## Unified API

- `createPayment()`
- `verifyPayment()`
- `generateKHQR()`
- `webhookHandler()`

## Framework Examples

- Express: `examples/express/src/server.ts`
- Next.js API routes: `examples/nextjs/pages/api/pay.ts`
- Next.js webhook route: `examples/nextjs/pages/api/webhooks/aba.ts`

## Development

```bash
npm install
npm run build
npm test
```

## Contributing

Contributions are welcome.

- Guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Please run `npm run build` and `npm test` before opening a PR.

## Advanced (Optional)

If you want separate provider packages, you can use:

- `@baraypay/sdk`
- `@baraypay/abapayway`
- `@baraypay/bakong`

## Roadmap

- More providers (local banks and wallets)
- Webhook replay protection helper
- Idempotency layer
- Event emitter hooks
- Optional framework adapters (NestJS/Fastify)
