# 🎰 Decentralized Lottery Application (DApp)

> **A Secure, Transparent, and Autonomous Blockchain Lottery built on Ethereum, Solidity, and React.**

[![Solidity](https://img.shields.io/badge/Solidity-v0.4.17-blue.svg?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Network-Ganache%20Local%20EVM-627EEA.svg?logo=ethereum)](https://ethereum.org/)
[![React](https://img.shields.io/badge/Frontend-React.js-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Web3.js](https://img.shields.io/badge/Web3-v1.0.0--beta-F16822.svg?logo=web3.js)](https://web3js.readthedocs.io/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

--- 

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Why Decentralized Lottery? (Problem vs Solution)](#-why-decentralized-lottery-problem-vs-solution)
3. [Project Team & Roles](#-project-team--roles)
4. [System Architecture & Working Flow](#-system-architecture--working-flow)
5. [Smart Contract Deep Dive (`Lottery.sol`)](#-smart-contract-deep-dive-lotterysol)
6. [Prerequisites & System Setup](#-prerequisites--system-setup)
7. [Quick Start Guide (Run Project Locally)](#-quick-start-guide-run-project-locally)
8. [MetaMask Configuration & Team Accounts](#-metamask-configuration--team-accounts)
9. [Project Directory Structure](#-project-directory-structure)
10. [Step-by-Step Demo Walkthrough](#-step-by-step-demo-walkthrough)
11. [Viva / Examination Q&A (Frequently Asked Questions)](#-viva--examination-qa-frequently-asked-questions)
12. [Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## 📖 Project Overview

The **Decentralized Lottery Application (DApp)** is a Web3 application where multiple participants can enter a lottery draw by sending Ether (ETH). When the manager triggers the draw, the **Smart Contract autonomously selects a random winner and transfers 100% of the pooled Ether directly to the winner's wallet address**.

Once the prize is transferred, the smart contract automatically resets its state to accept players for the next lottery round.

### Key Highlights:
- **Zero Human Bias:** Winner selection and fund transfer are strictly executed by Solidity code on the Ethereum Virtual Machine (EVM).
- **Non-Custodial:** Neither the manager nor any third party can withdraw or siphon off participant funds for themselves.
- **Full Transparency:** Every entry, total pooled balance, and winner transaction is publicly verifiable on the blockchain ledger.
- **Interactive Cyber-Luxe UI:** Built with React.js featuring real-time account detection, live balance calculation, player list, transaction status cards, and winner celebrations.

---

## ⚖️ Why Decentralized Lottery? (Problem vs Solution)

| Aspect | Traditional Centralized Lottery | Our Decentralized DApp |
| :--- | :--- | :--- |
| **Trust Factor** | Trust is placed in a central owner / government. | **Trustless:** Trust is placed in deterministic smart contract code. |
| **Draw Transparency** | Random draw is done behind closed doors (risk of rigging). | **Open Algorithm:** Logic runs on-chain and is verifiable by anyone. |
| **Fund Safety** | Organizer holds your money (risk of fraud/default). | **Locked in Contract:** Funds cannot be withdrawn by anyone except the winner. |
| **Intermediary Cut** | Companies deduct 40% - 60% as profit/commission. | **0% Intermediary Fee:** 100% of the prize pool goes to the winner. |
| **Payout Speed** | Weeks or months of bureaucratic paper verification. | **Instant:** Transfer happens automatically in the same transaction block. |

---

## 👥 Project Team & Roles

| Member Name | Role & Responsibility | Ganache Account Index |
| :--- | :--- | :--- |
| **Sahil Katkar** | **Project Lead & Smart Contract Deployer (Manager)**<br>• Deploys smart contract<br>• Oversees architecture & local RPC integration<br>• Executes `pickWinner()` | Account `0` |
| **Ishwar Kumavat** | **Frontend & Web3 Integration**<br>• React UI development & state management<br>• MetaMask wallet event handlers<br>• Participant player in the draw | Account `1` |
| **Abdul Khan** | **Testing & Smart Contract Verification**<br>• Unit test execution and contract verification<br>• Gas optimization & transaction confirmation<br>• Participant player in the draw | Account `2` |

---

## 🏗️ System Architecture & Working Flow

```
                      +----------------------------------+
                      |         User / Participant       |
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |   MetaMask Wallet Extension      |
                      |   (Account Signs Transactions)   |
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |     React Frontend (Web3.js)     |
                      |     http://localhost:3000        |
                      +----------------------------------+
                                       | JSON-RPC (HTTP)
                                       v
+-------------------------------------------------------------------------+
| Local Ethereum EVM Blockchain (Ganache @ http://127.0.0.1:8545, ID: 1337) |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                Lottery.sol (Smart Contract)                     |   |
|   |                                                                 |   |
|   |   • manager: Sahil_katkar (0x6273...)                           |   |
|   |   • players: [Ishwar_kumavat, abdul_khan, ...]                  |   |
|   |   • enter(): Requires > 0.01 ETH, collects entry pool           |   |
|   |   • random(): Generates pseudo-random seed                      |   |
|   |   • pickWinner(): Transfers 100% ETH balance -> Resets array    |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

### Transaction Lifecycle:
1. **Entering the Lottery:**
   - Player specifies an amount (`> 0.01 ETH`) in the React UI.
   - MetaMask prompts the user to approve and sign the `enter()` transaction with gas.
   - ETH is transferred into the contract balance, and player's address is pushed to `players[]`.
2. **Picking the Winner:**
   - Manager logs into MetaMask with the deployer account.
   - Manager clicks **"Pick Winner"** button.
   - Contract generates a pseudo-random index `uint index = random() % players.length`.
   - Contract executes `players[index].transfer(this.balance)` to payout the winner.
   - `players` array is re-initialized to empty (`new address[](0)`) for the next round.

---

## 📜 Smart Contract Deep Dive (`Lottery.sol`)

The core smart contract is located at [`ethereum/contracts/Lottery.sol`](file:///c:/Users/Sahil/Desktop/Decentralized-Lottery-App-master/ethereum/contracts/Lottery.sol):

```solidity
pragma solidity ^0.4.17;

contract Lottery {
    address public manager;
    address[] public players;

    // Constructor: Saves the deployer's address as the manager
    function Lottery() public {
        manager = msg.sender;
    }

    // Enter Function: Allows players to join by sending ETH
    function enter() public payable {
        require(msg.value > .01 ether);
        players.push(msg.sender);
    }

    // Pseudo-random number generator
    function random() public view returns (uint) {
        return uint(keccak256(block.difficulty, now, players.length));
    }

    // Pick Winner: Selects winner, sends entire pool, resets players
    function pickWinner() public restricted {
        uint index = random() % players.length;
        players[index].transfer(this.balance);
        players = new address[](0);
    }

    // Function Modifier: Access control to restrict pickWinner to the manager
    modifier restricted() {
        require(msg.sender == manager);
        _;
    }

    // View Function: Returns all registered players in the current round
    function getPlayers() public view returns (address[]) {
        return players;
    }
}
```

### Essential Solidity Concepts Explained:
- `payable`: Must be added to any function that receives Ether. Without it, the EVM rejects incoming ETH.
- `require(...)`: Assertion statement. If the condition is false, the transaction halts immediately, reverts state changes, and refunds unspent gas.
- `modifier restricted()`: Custom access-control guard. The `_;` denotes where the guarded function body is executed after the requirement check passes.
- `this.balance`: The current Ether balance stored securely in the smart contract's address.
- `players = new address[](0)`: Resets the dynamic array to size 0 in storage, clearing the slate for round two.

---

## 💻 Prerequisites & System Setup

Make sure your machine has the following installed:
1. **Node.js** (v16.x, v18.x, or v20.x supported)
   - Verify by running: `node -v`
2. **Git**
   - Verify by running: `git --version`
3. **Google Chrome / Brave Browser**
4. **MetaMask Browser Extension**
   - Download from: [https://metamask.io/](https://metamask.io/)

---

## 🚀 Quick Start Guide (Run Project Locally)

Run the project smoothly by opening two terminals in the root directory:

### Terminal 1: Start Local Ganache Blockchain
```bash
npm run ganache
```
- Starts a local Ethereum RPC node at `http://127.0.0.1:8545`.
- Sets Chain ID to `1337`.
- Generates 10 pre-funded test accounts with **1000 ETH each**.
- ⚠️ **Keep this terminal running in the background.**

---

### Terminal 2: Deploy Contract & Launch Frontend

#### 1. Deploy the Smart Contract:
```bash
npm run deploy:local
```
- Compiles `Lottery.sol` using Solidity compiler `solc`.
- Deploys the contract from Account 0 (`Sahil_katkar / Manager`).
- **Automatically updates** `ui/src/contractConfig.js` with the fresh deployed contract address and ABI!

#### 2. (Optional) Seed Test Players into the Pool:
```bash
node scratch/add_players.js
```
- Automatically enters 4 players into the lottery pool with test ETH (0.5, 1.0, 1.5, 2.0 ETH).
- Instantly populates the prize pool with 5.0 ETH for realistic demos!

#### 3. Start the React Frontend:
```bash
npm run ui
```
- Launches the UI at [http://localhost:3000](http://localhost:3000).

---

## 🦊 MetaMask Configuration & Team Accounts

### Step 1: Add Local Ganache Network to MetaMask
1. Open MetaMask and click the **Network selector dropdown** (top-left).
2. Click **"Add Network"** ➡️ **"Add a network manually"**.
3. Fill in the network parameters:
   - **Network Name:** `Ganache Local`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `1337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to `Ganache Local`.

---

### Step 2: Import Team Accounts into MetaMask
You do not need to create new accounts or spend real money! Import the pre-funded private keys generated by our local chain:

| Member / Name | Public Address | Private Key (Import into MetaMask) | Balance |
| :--- | :--- | :--- | :--- |
| **Sahil Katkar (Manager)** | `0x627306090abaB3A6e1400e9345bC60c78a8BEf57` | `0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3` | 1000 ETH |
| **Ishwar Kumavat (Player)** | `0xf17f52151EbEF6C7334FAD080c5704D77216b732` | `0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f` | 1000 ETH |
| **Abdul Khan (Player)** | `0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef` | `0x0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1` | 1000 ETH |

> **How to import in MetaMask:**
> Click the Account Profile Icon (circle on top right) ➡️ **"Import account"** ➡️ Paste the Private Key ➡️ Click **Import**.

---

## 📂 Project Directory Structure

```text
Decentralized-Lottery-App-master/
├── ethereum/
│   ├── contracts/
│   │   └── Lottery.sol          # Solidity smart contract code
│   ├── compile.js               # Compiles Solidity code using solc to build/
│   ├── deploy.js                # Deployment script (testnet/Infura)
│   └── build/
│       └── Lottery.json         # Compiled ABI and EVM Bytecode
├── scratch/
│   ├── deploy_local.js          # Deploys contract to Ganache & updates contractConfig.js
│   ├── add_players.js           # Seeds dummy players into pool for quick demo
│   └── lottery_project_report.html # Academic presentation report & Viva guide
├── ui/                          # React Frontend Application
│   ├── public/                  # Static assets & index.html
│   ├── src/
│   │   ├── App.js               # Main React dashboard component
│   │   ├── App.css              # Cyber-luxe styling & animations
│   │   ├── contractConfig.js    # Injected Contract Address and ABI
│   │   ├── lottery.js           # Web3 Contract instance export
│   │   ├── web3.js              # MetaMask window.ethereum provider wrapper
│   │   └── index.js             # React DOM root entry point
├── package.json                 # Project scripts (ganache, deploy:local, ui)
└── README.md                    # This complete project documentation
```

---

## 🎮 Step-by-Step Demo Walkthrough

### 1. Connect MetaMask to DApp
- Navigate to `http://localhost:3000`.
- Click **"Connect MetaMask"** if prompted, and ensure the active network is `Ganache Local`.
- The top header will display your **Active Wallet Address**, **Account Nickname**, and **Live ETH Balance**.

### 2. Enter as a Player (Ishwar or Abdul)
- Switch your active MetaMask account to `Ishwar_kumavat` or `abdul_khan`.
- In the **"Enter Lottery"** card, type an amount (e.g., `0.1` ETH).
- Click **"Enter Lottery"**.
- Confirm the transaction in the MetaMask popup.
- Once confirmed, the **Total Prize Pool** increases and your address appears under **"Current Participants"**.

### 3. Draw Winner as Manager (Sahil)
- Switch your active MetaMask account to `Sahil_katkar (Manager)` (`0x6273...`).
- The **Manager Control Panel** will unlock.
- Click **"Pick Winner Now"**.
- Confirm the transaction in MetaMask.
- Watch the magic:
  - The smart contract picks a random winner index.
  - 100% of the prize pool is transferred directly to the winner's wallet.
  - A celebratory **Winner Announcement Card** appears with the winner's address and amount won!
  - The pool and participant list automatically reset to 0 for the next round.

---

## 🎓 Viva / Examination Q&A (Frequently Asked Questions)

Here are the most common questions external examiners or professors ask during project evaluations, along with model answers:

### Q1: How does randomness work in this contract, and why is it called "Pseudo-Random"?
> **Answer:**  
> In `Lottery.sol`, randomness is generated using `keccak256(block.difficulty, now, players.length)`.  
> It is **pseudo-random** because all these variables (current block timestamp, difficulty, player count) are deterministic and visible to blockchain validators/miners. For high-stakes mainnet lotteries, miners could theoretically bias blocks to influence the draw.  
> **Production Improvement:** On Ethereum mainnet, production dApps use **Chainlink VRF (Verifiable Random Function)**, which provides cryptographically provable off-chain randomness verified by smart contracts.

### Q2: Can the contract manager steal or withdraw the players' pooled money?
> **Answer:**  
> **No.** The smart contract has no withdrawal function for the manager. The only function that transfers ETH out of the contract is `pickWinner()`, which executes `players[index].transfer(this.balance)`. The entire pool is strictly transferred to a randomly selected player from the `players[]` array. Code is Law.

### Q3: What is the purpose of ABI and Web3.js in this project?
> **Answer:**  
> The smart contract is deployed on the EVM as binary bytecode. The **ABI (Application Binary Interface)** is a JSON file that defines the contract's methods, inputs, and outputs. **Web3.js** acts as the communication bridge: it takes the ABI and deployed contract address and translates JavaScript calls (like `lottery.methods.enter().send(...)`) into JSON-RPC calls that MetaMask and the Ethereum node can execute.

### Q4: Why does `enter()` cost gas while `getPlayers()` does not?
> **Answer:**  
> - `enter()` modifies blockchain storage (it updates the contract balance and pushes an address into the array). Any state change requires miners/validators to compute and store data, which costs **Gas**.
> - `getPlayers()` is marked with the `view` keyword. It only reads data from the node without modifying state, so read queries are **completely free** (0 gas).

### Q5: What happens if `pickWinner()` is called when there are 0 players?
> **Answer:**  
> If `players.length` is 0, the modulo calculation `random() % 0` results in a division-by-zero error, causing the EVM transaction to immediately revert without transferring any funds. In the frontend UI, the button is also disabled when player count is zero to prevent accidental gas waste.

---

## 🛠️ Troubleshooting & Common Issues

### 1. MetaMask shows "Nonce too high" or Transaction Stuck
- **Reason:** Ganache was restarted, but MetaMask still remembers old transaction count (nonces).
- **Fix:** In MetaMask, go to **Settings** ➡️ **Advanced** ➡️ **"Clear activity and nonce data"** (or "Reset Account"). Your funds remain safe, and nonces will re-synchronize with Ganache.

### 2. Error: `Cannot find module 'web3'` or `npm run ui` fails
- **Fix:** Ensure dependencies are installed in both directories:
  ```bash
  # Root directory
  npm install
  # UI directory
  cd ui && npm install && cd ..
  ```

### 3. Contract Address Mismatch after restarting Ganache
- **Reason:** Every fresh Ganache instance has an empty state.
- **Fix:** Simply re-run the deployment script:
  ```bash
  npm run deploy:local
  ```
  It automatically redeploys and writes the new address into `ui/src/contractConfig.js`.

---

## 📜 License & Acknowledgments

This project is open-source under the ISC License.  
Developed as an academic demonstration of Ethereum Smart Contracts and Decentralized Web3 Applications.
