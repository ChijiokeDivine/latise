# Latise: Confidential Wrapper Token Protocol

<div align="center">
  <h3>Shield Your On-Chain Assets</h3>
  <p>Confidential wrapper tokens for EVM blockchains using Fully Homomorphic Encryption (FHE) - ZAMA</p>
</div>

## 🤔 Why Do We Need Confidential Wrappers?

In the public world of blockchain, every transaction is visible to everyone. Your wallet balance, token holdings, and transfer history are all stored on-chain forever—for anyone to see. This transparency, while a feature of blockchain, creates serious problems for everyday users:

- **Front-running**: Traders can exploit public mempools to profit from others' pending transactions
- **Doxxing**: Anyone can trace your on-chain activity back to real-world identities
- **Financial privacy**: Your balances and spending habits are exposed
- **Business confidentiality**: Companies can't protect sensitive financial operations

Confidential wrapper tokens solve this by encrypting your ERC-20 tokens, allowing you to transact privately while still leveraging the security and infrastructure of public blockchains.

## 🏢 Use Cases Across Sectors

Confidential wrappers unlock privacy for countless industries:

1. **DeFi & Trading**: Trade without front-running or revealing your position sizes
2. **Payments**: Send tokens privately without exposing your financial history
3. **Salary & Remittances**: Pay employees or send remittances confidentially
4. **Gaming**: In-game assets and transfers stay private
5. **Enterprise**: Businesses can use blockchain without exposing sensitive data
6. **Charities**: Donors can contribute anonymously
7. **DAO Governance**: Vote privately without revealing your preferences

## 🚀 Project Overview

Latise is a user-friendly interface for managing confidential wrapper tokens on Ethereum and Sepolia. Built with Next.js, Zama's FHE technology, and Privy for wallet authentication, it makes privacy accessible to everyone.

### ✨ Key Features

#### 🔒 Shield (Wrap)
Convert your regular ERC-20 tokens into confidential wrapper tokens with a single click. Your tokens are encrypted using FHE, so only you can see your balance and transfer amounts.

#### 🔓 Unshield (Unwrap)
Convert your confidential tokens back to regular ERC-20s whenever you want. The decryption process happens off-chain via Zama's relayer network.

#### 📤 Send Confidential Tokens
Transfer confidential tokens to other wallets completely privately—no one can see how much you're sending.

#### 🔍 Decrypt Balance
View your confidential balance by decrypting it with your wallet signature.

#### 💰 Faucet
Get free test tokens on Sepolia to try everything out!

#### 📊 Analytics & Registry
- Explore all registered wrapper tokens
- View Total Value Shielded (TVS) metrics
- See transaction history
- Track volume trends

### 🛠️ Technical Architecture

#### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Smart Contracts**: Zama FHE Protocol
- **Wallet Auth**: Privy
- **Chain Interaction**: Wagmi + Viem
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS
- **Language**: TypeScript

#### FHE Bridge
The app uses an iframe-based FHE Bridge (`/app/fhe-bridge/page.tsx`) to isolate FHE operations, providing a secure environment for encryption/decryption without exposing sensitive data.

#### Custom Hooks
- `useTokenBalances`: Fetch and decrypt confidential balances
- `useWrap`: Handle wrapping (shielding) operations
- `useUnwrap`: Handle unwrapping (unshielding) operations
- `useConfidentialTransfer`: Execute confidential transfers
- `useRegistry`: Fetch registered token pairs
- `useTVS`: Get Total Value Shielded metrics

## 🎯 Ease of Use

We designed Latise with simplicity in mind:
- **Clean UI**: Intuitive interface similar to popular DeFi apps
- **1-Click Operations**: Shield, unshield, and send with just a few clicks
- **Wallet Integration**: Connect with your favorite wallet via Privy
- **Network Support**: Works on Sepolia testnet (ready for mainnet!)
- **Responsive Design**: Use it on desktop or mobile

## 🏃‍♂️ Run It On Your Machine

### Prerequisites
- Node.js 18+ and npm/pnpm/bun
- A crypto wallet (MetaMask, Coinbase Wallet, etc.)
- Sepolia testnet ETH for gas

### Installation

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd latise
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env.local` and fill in the required values (check AGENTS.md for environment setup)

4. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open in browser**
   Visit [http://localhost:3000](http://localhost:3000) to use the app!

### Available Scripts
- `pnpm run dev`: Start development server
- `pnpm run build`: Build for production
- `pnpm start`: Start production server
- `pnpm run lint`: Run ESLint

## 📚 Learn More
- [Zama FHE Documentation](https://docs.zama.org/homepage)
- [Privy Docs](https://docs.privy.io)
- [Next.js Docs](https://nextjs.org/docs)
- [Wagmi Docs](https://wagmi.sh)
