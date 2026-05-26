# Pixora 

Pixora is an AI-powered, multiplayer image-guessing game built on **GenLayer**. 

Players join a room, look at an AI-generated image, and try to guess what the prompt was. Instead of relying on hardcoded logic, the game leverages GenLayer's **Intelligent Contracts** to evaluate the creativity and accuracy of the guesses using Large Language Models (LLMs), dynamically awarding XP based on how close the guess is to the true prompt!

## Features

- **Intelligent Evaluation:** Guesses are graded on-chain by GenLayer's AI validators, ensuring nuanced, context-aware scoring.
- **Web2 UX, Web3 Power:** 
  - Players log in with a simple username.
  - Player names and sessions are managed off-chain via **Upstash Redis** for lightning-fast speeds.
  - The game flows without intrusive MetaMask popups for every guess!
- **Real-time Gameplay:** Beautiful Waiting Rooms, live progress bars, and global leaderboards.
- **Sleek UI:** Built with Next.js 14, Tailwind CSS, and Framer Motion aesthetics.

##  Tech Stack

- **Smart Contracts:** Python (GenLayer Intelligent Contracts)
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Database:** Upstash Redis (Serverless)
- **Web3 Integration:** `genlayer-js` SDK

---

##  Getting Started

### 1. Requirements
- A running GenLayer Studio or GenLayer Simulator.
- Node.js (v18+) and `npm`.
- An Upstash Redis account (free tier works perfectly).

### 2. Deploy the Intelligent Contract
The core game logic lives in the GenLayer smart contract.
1. Open GenLayer Studio.
2. Deploy the `contracts/image_guessing.py` file.
3. Copy the deployed contract address.

### 3. Setup the Frontend Environment
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Copy the example `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in the required variables:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS="your_deployed_genlayer_address"
   UPSTASH_REDIS_REST_URL="your_upstash_url"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
   ```

### 4. Run the Game
Execute the following commands to install dependencies and start the Next.js development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start playing!

---

##  How to Play
1. **Connect Wallet:** The Host connects their GenLayer-compatible wallet.
2. **Create a Room:** The Host defines the rules, number of rounds, and the images.
3. **Join Game:** Players navigate to the room link, enter their username, and join the lobby.
4. **Guess:** During the active round, players submit their best guesses.
5. **AI Evaluation:** The GenLayer Intelligent Contract kicks in, evaluates the answers using LLMs, and updates the leaderboard!

## 📜 License
This project is licensed under the MIT License.
