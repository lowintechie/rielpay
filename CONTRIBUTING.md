# Contributing to baraypay

Thanks for contributing to baraypay. We welcome fixes, features, docs improvements, and new provider adapters.

## Prerequisites

- Node.js 20+
- npm 10+
- Git

## Local Setup

```bash
git clone git@github.com:lowintechie/baraypay.git
cd baraypay
npm install
npm run build
npm test
```

## Project Layout

- `packages/sdk`: core unified API and shared types
- `packages/abapayway`: ABA PayWay provider adapter
- `packages/bakong`: Bakong KHQR provider adapter
- `packages/baraypay`: all-in-one public package
- `examples/*`: integration examples (Express, Next.js)
- `tests/*`: smoke tests

## How to Contribute

1. Fork the repository and create a feature branch.
2. Make changes with focused commits.
3. Add or update tests for behavior changes.
4. Run:
```bash
npm run build
npm test
```
5. Open a Pull Request with:
- what changed
- why it changed
- how it was tested

## Provider Contributions

When adding a new payment provider:

1. Create a new package under `packages/<provider-name>`.
2. Implement the `ProviderAdapter` contract from `@baraypay/sdk`.
3. Normalize statuses to baraypay unified statuses.
4. Add docs and usage examples.
5. Add smoke tests for create/verify/webhook flows (or equivalent supported features).

## Style and Quality

- Use TypeScript strict mode patterns.
- Keep APIs backward compatible when possible.
- Prefer small, reviewable PRs over very large ones.
- Never commit secrets or real merchant keys.

## Reporting Issues

Please open an issue with:

- clear reproduction steps
- expected behavior
- actual behavior
- environment details (Node version, OS)
