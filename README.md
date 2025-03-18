# Account Abstraction Wallet

This repository contains the implementation of a passkey-based smart contract wallet featuring social recovery via zkMail, developed as part of the research conducted in the thesis titled "Advancing Security and Usability in the Decentralized Web by leveraging Account Abstraction".

## Implemented Features

1. **Passkey Authentication**: Eliminates the reliance on private keys, reducing the complexity and risk typically associated with wallet management.
2. **zkMail-based Social Recovery**: Integrates zero-knowledge proofs over emails, enabling a secure and user-friendly guardian-based recovery system.
3. **Ethereum Standards**: Utilizes ERC-4337 and ERC-7579 to provide a robust foundation, ensuring compatibility, extensibility, and improved user experience.

## Environment Setup

The file `src/lib/constants.ts` manages the environment variables required to run the wallet application.

| Variable          | Description                                                                                                                               | Example                             | Required |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------- |
| `BUNDLER_URL`     | URL of the ERC-4337 bundler for submitting user operations.                                                                               | `https://bundler.example.com/rpc`   | Yes      |
| `PIMLICO_API_KEY` | Your API key for the Pimlico bundler/paymaster service.                                                                                   | `your-pimlico-api-key`              | Yes      |
| `RELAYER_URL`     | URL of the email relayer service.                                                                                                         | `https://relayer.example.com/`      | Yes      |
| `PAYMASTER_URL`   | (Optional) URL of a sponsoring paymaster service to cover users' transaction fees. If omitted, users must pay their own transaction fees. | `https://paymaster.example.com/rpc` | No       |

## Development

To start the development server, run:

```bash
npm install
npm run dev
```

## Deployment

To build the project for production, run:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.
