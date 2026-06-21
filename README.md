# Latise: Confidential Wrapper Token Protocol

<div align="center">

  <h3>🔐 Shield Your On-Chain Assets</h3>
  <p>Confidential wrapper tokens for EVM blockchains using Fully Homomorphic Encryption (FHE) - powered by ZAMA</p>
 
</div>

---

## 📖 Table of Contents
1. [Why Do We Need Confidential Wrappers?](#-why-do-we-need-confidential-wrappers)
2. [Use Cases Across Sectors](#-use-cases-across-sectors)
3. [Project Overview](#-project-overview)
4. [Key Features](#-key-features)
5. [Technical Architecture](#-technical-architecture)
6. [The Challenge: Privy + Zama WASM & the Iframe Solution](#-the-challenge-privy--zama-wasm--the-iframe-solution)
7. [Ease of Use](#-ease-of-use)
8. [Run It On Your Machine](#-run-it-on-your-machine)
9. [Learn More](#-learn-more)

---

## 🤔 Why Do We Need Confidential Wrappers?

In the public, transparent world of blockchain, every transaction is broadcast to the entire network, stored on-chain forever, and visible to anyone who cares to look. While this openness is one of blockchain's greatest strengths for trustlessness and auditability, it creates serious problems for everyday users and businesses who need financial privacy.

Let's break down these problems:

### 1. Front-Running and MEV (Miner Extractable Value)
Traders can see your pending transactions in the public mempool and exploit them to their advantage. This costs DeFi users billions of dollars every year.

### 2. Doxxing and Identity Exposure
By analyzing wallet activity, third parties can trace your on-chain history back to your real-world identity, exposing sensitive personal information.

### 3. Financial Privacy Compromised
Your wallet balances, token holdings, and spending habits are completely transparent, which can make you a target for scams, theft, or just unwanted attention.

### 4. Business Confidentiality at Risk
Companies can't use public blockchains for sensitive financial operations, since all transactions would be visible to competitors, regulators, and the public.

### The Solution: Confidential Wrapper Tokens
Confidential wrapper tokens solve these issues by encrypting your regular ERC-20 tokens using Fully Homomorphic Encryption (FHE). This allows you to:
- Transact privately on public blockchains
- Keep your balances and transfer amounts encrypted
- Still leverage all the security and infrastructure of EVM networks

<div align="center">
  <img src="/coins_fl.png" alt="Confidential Tokens" width="350" style="border-radius: 8px;" />
</div>

---

## 🏢 Use Cases Across Sectors

Confidential wrappers unlock privacy for countless industries and applications:

### 1. DeFi & Trading
- Trade without front-running
- Keep position sizes private
- Execute large orders without moving markets

### 2. Payments & Remittances
- Send tokens privately without exposing financial history
- Pay employees confidentially
- Send family remittances discreetly

### 3. Gaming & NFTs
- In-game asset transfers stay private
- NFT purchases remain anonymous
- Gaming economies get financial privacy

### 4. Enterprise & Business
- Use blockchain without exposing sensitive data
- Keep financial operations confidential
- Secure supply chain payments

### 5. Charities & Donations
- Allow donors to contribute anonymously
- Protect donor identities while maintaining transparency

### 6. DAO Governance
- Vote privately without revealing preferences
- Prevent vote buying and voter intimidation

### 7. Personal Finance
- Manage your crypto portfolio privately
- Avoid targeted scams and phishing

---

## 🚀 Project Overview

Latise is a beautiful, user-friendly interface for managing confidential wrapper tokens on Ethereum and Sepolia testnet. Built with modern tools and powered by Zama's cutting-edge FHE technology, it makes on-chain privacy accessible to everyone—from crypto newbies to experienced DeFi users.

The project uses:
- **Zama FHE Protocol**: For encrypted token operations
- **Privy**: For seamless wallet authentication and onboarding
- **Next.js 16**: For fast, modern web application
- **Wagmi + Viem**: For safe and efficient smart contract interactions
- **TanStack Query**: For great data fetching and caching
- **Tailwind CSS**: For clean, responsive UI



---

## ✨ Key Features

Let's dive into each feature in detail:

### 🔒 Shield (Wrap)
Convert your regular ERC-20 tokens into confidential wrapper tokens with a single click!
- Simple, intuitive form interface
- Real-time balance checks
- Token selector with all registered pairs
- Clear transaction confirmation
- Encryption handled securely by Zama's FHE SDK



### 🔓 Unshield (Unwrap)
Convert your confidential tokens back to regular ERC-20s whenever you want.
- Same great UI as shielding
- Decryption process handled off-chain by Zama's relayer network
- Takes 10-60 seconds (completely normal for FHE operations!)
- Clear status updates throughout the process

### 📤 Send Confidential Tokens
Transfer confidential tokens to other wallets completely privately—no one can see how much you're sending!
- Recipient address input with validation
- Token selector
- Balance checks
- Secure, encrypted transfers on-chain

### 🔍 Decrypt Balance
View your confidential balance by decrypting it with your wallet signature.
- One-click balance decryption
- Real-time balance display
- "Decrypting..." status indicator
- Disabled state to prevent duplicate requests

### 💰 Faucet
Get free test tokens on Sepolia to try everything out! Perfect for testing the full flow.



### 📊 Analytics & Registry
- **Registry**: Explore all registered wrapper tokens
  - See token pairs, addresses, decimals, and status
  - Filter by valid/revoked tokens
  - Clean, responsive table UI


- **Analytics**: View Total Value Shielded (TVS) and volume metrics
  - Interactive charts
  - Historical data


- **Transactions**: See your transaction history with status updates

---

## 🛠️ Technical Architecture

Let's take a deep dive into how Latise works under the hood:

### Tech Stack Breakdown
- **Framework**: Next.js 16 (App Router)
- **Smart Contracts**: Zama FHE Protocol
- **Wallet Authentication**: Privy
- **Chain Interaction**: Wagmi + Viem
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Data Visualization**: Recharts

### FHE Bridge: Secure Isolation for FHE Operations
The app uses a unique iframe-based FHE Bridge (`/app/fhe-bridge/page.tsx`) to isolate FHE operations, providing a secure environment for encryption/decryption without exposing sensitive data. We'll talk more about why this was needed later!

### Custom Hooks
We built several custom hooks to make development clean and maintainable:
- `useTokenBalances`: Fetch and decrypt confidential balances
- `useWrap`: Handle wrapping (shielding) operations
- `useUnwrap`: Handle unwrapping (unshielding) operations
- `useConfidentialTransfer`: Execute confidential transfers
- `useRegistry`: Fetch registered token pairs
- `useTVS`: Get Total Value Shielded metrics
- `useFaucet`: Handle faucet claims
- `useVolumeEvents`: Fetch transaction volume data

### Project Structure
```
latise/
├── app/
│   ├── api/             # API routes (prices, registry, relayer proxy, tvs)
│   ├── components/      # Reusable components (sidebar, network switcher)
│   ├── dashboard/       # Main dashboard pages
│   │   ├── analytics/   # Analytics page
│   │   ├── faucet/      # Faucet page
│   │   ├── registry/    # Registry page
│   │   ├── send/        # Confidential send page
│   │   ├── shield/      # Shield page
│   │   ├── transactions/ # Transactions page
│   │   ├── unshield/    # Unshield page
│   │   └── vault/       # Main vault page
│   ├── fhe-bridge/      # FHE Bridge iframe
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities (constants, ABIs, clients, fhe bridge)
│   ├── providers/       # React providers
│   └── types/           # TypeScript types
└── public/              # Static assets
```

---

## 🔧 The Challenge: Privy + Zama WASM & the Iframe Solution

This is an important part of our story—let's talk about a real technical challenge we faced and solved!

### The Problem

When building Latise, we encountered a classic web development conflict between two powerful technologies:

#### Zama FHE Requirements
Zama's FHE SDK relies on **Fully Homomorphic Encryption WebAssembly (WASM) binaries** running inside Web Workers. To enable high-performance browser features like `SharedArrayBuffer` that this WASM requires, modern browsers mandate **strict security headers**:

- `Cross-Origin-Opener-Policy (COOP)`: Must be set to `same-origin`
- `Cross-Origin-Embedder-Policy (COEP)`: Must be set to `require-corp`

These headers create a secure, isolated environment for WASM and SharedArrayBuffer to work safely.

#### Privy Requirements
Privy (much like Coinbase Smart Wallet or Base Account) uses **cross-origin popups or embedded iframes** to handle:
- Secure OAuth login flows
- Wallet generation and management
- Transaction signing and approval

#### The Conflict
Here's the problem:
- When `COOP` is set to `same-origin`, the browser **completely severs the communication link** between your main dApp window and any login popups or cross-origin iframes opened by Privy
- Because Privy can no longer talk to its own popup or embedded frame, your login flows and wallet actions **instantly fail**
- But without those COOP/COEP headers, Zama's FHE WASM and SharedArrayBuffer **won't work at all**!

This was a major roadblock—we couldn't have both Zama FHE and Privy working together... or so we thought!

### The Solution: Offload Zama SDK to an Iframe

After some head-scratching and research, we came up with a clever solution: **isolate Zama's FHE SDK in its own dedicated iframe!**

Here's how it works:
1. The **main application** keeps relaxed security headers (no COOP/COEP) so Privy works perfectly
2. We create a **separate iframe page** (`/app/fhe-bridge/page.tsx`) with the strict COOP/COEP headers required by Zama
3. The main app and FHE Bridge communicate via **postMessage API**
4. The iframe handles all FHE operations (encryption, decryption, etc.) and sends results back to the main app

This architecture gives us the best of both worlds!



### Implementation Details

The FHE Bridge system has several key components:

1. **FHE Bridge Page** (`/app/fhe-bridge/page.tsx`)
   - Runs with strict COOP/COEP headers
   - Initializes Zama's FHE SDK
   - Listens for messages from the main app
   - Executes FHE operations and responds with results

2. **FHE Bridge Utilities** (`/app/lib/fheBridge.tsx`)
   - Type-safe message types for main app ↔ iframe communication
   - Helper functions for sending messages and waiting for responses
   - Error handling and timeouts

3. **FHE Bridge Provider** (`/app/providers/FHEBridgeProvider.tsx`)
   - Manages the iframe lifecycle
   - Provides a clean interface for the rest of the app to use FHE operations
   - Handles loading states and errors

This solution is clean, secure, and allows both Privy and Zama to work flawlessly together!

---

## 🎯 Ease of Use

We designed Latise with simplicity in mind, so privacy is accessible to everyone:

- **Clean, Modern UI**: Intuitive interface similar to popular DeFi apps you already know
- **1-Click Operations**: Shield, unshield, send, and decrypt balances with just a few clicks
- **Wallet Integration**: Connect with your favorite wallet via Privy (MetaMask, Coinbase Wallet, Rainbow, and more!)
- **Network Support**: Works great on Sepolia testnet (ready for mainnet!)
- **Responsive Design**: Use it on desktop or mobile—works perfectly everywhere
- **Clear Status Updates**: Every operation has clear, friendly status messages so you always know what's happening



---

## 🏃‍♂️ Run It On Your Machine

Ready to try Latise yourself? Let's get it running!

### Prerequisites
First, make sure you have:
- Node.js 18+ (or newer)
- npm, pnpm, or bun (pnpm recommended!)
- A crypto wallet (MetaMask, Coinbase Wallet, Rainbow, etc.)
- Sepolia testnet ETH for gas fees

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd latise
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or npm install
   # or bun install
   ```

3. **Set up environment variables**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Now open `.env.local` and fill in the required values. Check `AGENTS.md` for detailed environment setup instructions!

4. **Start the development server**
   ```bash
   pnpm run dev
   # or npm run dev
   # or bun dev
   ```

5. **Open in your browser**
   Visit [http://localhost:3000](http://localhost:3000) to use the app!

### Available Scripts
- `pnpm run dev`: Start development server (hot reload included!)
- `pnpm run build`: Build for production
- `pnpm start`: Start production server
- `pnpm run lint`: Run ESLint to check code quality

---

## 📚 Learn More

Want to dive deeper? Check out these resources:
- [Zama FHE Documentation](https://docs.zama.org/homepage)
- [Privy Docs](https://docs.privy.io)
- [Next.js Docs](https://nextjs.org/docs)
- [Wagmi Docs](https://wagmi.sh)
- [Viem Docs](https://viem.sh)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

<div align="center">
  <p>Built with ❤️ for on-chain privacy</p>
  <p>© 2026 Latise</p>
</div>
