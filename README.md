# Zamron

Zamron is a multi chain USDC to confidential cUSDC application built around Circle CCTP, Zama fhEVM, and Filecoin. It lets a user bridge testnet USDC from Base Sepolia, Arbitrum Sepolia, and OP Sepolia into Ethereum Sepolia, wrap the bridged funds into confidential cUSDC in one click, transfer that cUSDC privately, unwrap back to plain USDC when needed, and archive encrypted operation receipts to Filecoin Calibration.

[Zamron Website](https://zamron.vercel.app), [Demo video](https://drive.google.com/drive/folders/1bHfYEZ1TKW8xDcdRw1Ckn8Q9_diLodEz)


<img width="1600" height="623" alt="image" src="https://github.com/user-attachments/assets/3dd9dfae-06f4-442c-8098-a4548cca5df0" />




## Project Description

The project combines three systems into one user flow:

- Circle CCTP moves canonical USDC from supported source chains into Ethereum Sepolia.
- Zama fhEVM powers the confidential token layer, so balances and transfer amounts remain encrypted on-chain.
- Filecoin Calibration stores encrypted operation receipts and anchors their references on-chain for durable, verifiable recordkeeping.

From the user's perspective, Zamron feels like one app: bridge, privatize, transfer, unwrap, and archive. Under the hood, each step is handled by a separate protocol layer with contracts and frontend flows coordinating across networks.

## Component Details

### Bridging via Circle CCTP to Sepolia

The app reads the user's USDC balance across Base Sepolia, Arbitrum Sepolia, and Optimism Sepolia and lets them bridge any or all of it to Ethereum Sepolia in one flow. For each selected source chain, Zamron approves the Circle Token Messenger, burns USDC through `depositForBurnWithHook(...)`, polls Circle's attestation API, and then finalizes the transfer on Ethereum Sepolia. On finalization, the `CCTPFinalizer` contract receives the minted Sepolia USDC and immediately wraps it into confidential cUSDC for the destination user, so the bridge lands directly into the private asset.

### Zama fhEVM and Confidential cUSDC

cUSDC is implemented as a confidential token on Ethereum Sepolia using Zama's fhEVM stack. Instead of storing plaintext balances on-chain, the token exposes encrypted balance handles through `confidentialBalanceOf(address)`, and the app only reveals a balance when the wallet explicitly authorizes a decrypt flow.

For private sends and unwrap requests, the frontend uses `@zama-fhe/relayer-sdk/web` in the browser to create an encrypted input bound to both the target contract and the user's address. Zamron adds the transfer amount as a 64-bit encrypted value, calls `encrypt()`, and receives two artifacts from the Zama flow:

- an encrypted handle representing the amount
- an input proof that the contract can verify on-chain

Those artifacts are then passed into confidential contract methods such as `confidentialTransfer(...)` and `swapConfidentialToERC20(...)`, so no plaintext amount is ever submitted to the chain.

~ Balance decryption uses the relayer's user decrypt flow. The app generates a fresh keypair client-side, creates an EIP-712 authorization payload, asks the wallet to sign it, and then calls `userDecrypt(...)` through the relayer SDK. This means the plaintext balance is only returned to an authorized client session tied to the user's wallet signature.

~ Unwrap is asynchronous. Zamron first submits an encrypted unwrap request to the helper contract, which emits a request identifier. The app then asks the Zama relayer/KMS path to publicly decrypt that pending amount and returns both the cleartext amount and decryption proof. Finally, Zamron calls `finalizeSwap(...)` with that proof so the user receives standard Sepolia USDC back.

### Filecoin Receipt Archive

Every successful operation produces a receipt that is encrypted in the browser using AES-GCM. The encryption key is derived from a deterministic wallet signature and never leaves the device. The encrypted payload is uploaded to Filecoin Calibration via the Synapse SDK, and the resulting Piece CID plus Data Set ID are then anchored on-chain in the `BridgeArchiveRegistry` contract together with the receipt hash, owner, operation type, and timestamp.

This gives the user two guarantees:

- the receipt contents stay private because Filecoin only receives the encrypted payload
- the archive entry stays verifiable because the Filecoin reference is recorded on-chain

Zamron also supports retrieval: the app loads the encrypted payload back from Filecoin, decrypts it locally with the same wallet-derived key, and reconstructs the original operation receipt.

## Setup Instructions

### 1. Prerequisites

Make sure you have:


- testnet USDC on Base Sepolia, Arbitrum Sepolia, or OP Sepolia
- Sepolia ETH for bridge and confidential operations
- Filecoin Calibration `tFIL` for gas if you want to archive receipts
- Filecoin Calibration `USDFC` if you want to pay for Synapse-backed storage uploads

### 2. Install Dependencies

Install the frontend dependencies from the repository root:

```bash
npm install
```

Install the contract dependencies:

```bash
cd contracts
npm install
cd ..
```


### 3. Start the App

Run the development server from the repository root:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### 4. Recommended Validation

Before recording or demoing, it is helpful to verify:

- the wallet can switch across Base Sepolia, Arbitrum Sepolia, OP Sepolia, Ethereum Sepolia, and Filecoin Calibration
- the frontend can read multi-chain USDC balances
- the deployed Sepolia contracts match the current wrapper/unwrapper assumptions
- Filecoin archive writes succeed and produce both a Piece CID and a Calibration registry transaction

