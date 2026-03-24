# Will-On-Chain: Decentralized Crypto Inheritance System

A fully decentralized, trustless will and inheritance execution system built on Ethereum. Owners create wills, deposit multi-asset portfolios (ETH, ERC-20, ERC-721, ERC-1155), assign heirs with percentage shares, and the system autonomously detects owner inactivity through a time-based heartbeat mechanism. Inheritance is executed on-chain only after a multi-phase confirmation pipeline — including zero-knowledge proof age verification (Groth16) and iden3/Privado DID-based liveness proofs — ensuring no single party can prematurely trigger asset distribution.

> **Research Paper**: This implementation accompanies the research paper *"Decentralized Crypto-Asset Inheritance Using Smart Contracts, Zero-Knowledge Proofs, and DID-Based Liveness Verification"*.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Smart Contract Inheritance Chain](#smart-contract-inheritance-chain)
- [Will State Machine](#will-state-machine)
- [Mathematical Formulas & Timing](#mathematical-formulas--timing)
- [Zero-Knowledge Proof Systems](#zero-knowledge-proof-systems)
  - [Age Verification ZKP](#1-age-verification-zkp-groth16--4-signals)
  - [DID Liveness Proof](#2-did-liveness-proof-groth16--5-signals)
- [Deployment Guide (Remix IDE)](#deployment-guide-remix-ide)
- [Web Application](#web-application)
  - [Setup & Contract Connection](#1-setup--contract-connection)
  - [Dashboard](#2-dashboard)
  - [Create Will (4-Step Wizard)](#3-create-will-4-step-wizard)
  - [Manage Will](#4-manage-will)
  - [Heartbeat & Liveness](#5-heartbeat--liveness)
  - [Inheritance Execution](#6-inheritance-execution)
  - [Claims (Pull-Based)](#7-claims-pull-based)
  - [Test Tokens](#8-test-tokens)
- [Backend API](#backend-api)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)

---

## Architecture Overview

The system comprises three layers:

| Layer | Components | Purpose |
|-------|-----------|---------|
| **Smart Contracts** | 12 Solidity contracts (inheritance chain) | On-chain will logic, asset custody, heartbeat, ZKP verification |
| **ZKP Circuits** | 2 Circom circuits + Groth16 provers | Privacy-preserving age verification and DID liveness proofs |
| **Web Application** | React.js frontend + Node.js backend | User interface for all contract interactions via MetaMask |

The owner deploys contracts via **Remix IDE** on any EVM chain (Sepolia testnet recommended), then pastes the deployed contract address into the web app to interact with the system.

---

## Smart Contract Inheritance Chain

The contracts follow a strict single-inheritance chain to stay within EVM bytecode size limits (EIP-170: 24,576 bytes):

```
WillTypes.sol          (Enums, structs, constants)
    └── WillStorage.sol     (State variables, mappings, modifiers)
        └── HeartbeatManager.sol  (Heartbeat recording, delegation, DID proof)
            └── AssetManager.sol      (ETH/ERC-20/ERC-721/ERC-1155 deposits)
                └── ExecutionManager.sol  (Batch execution, claims, sweeps)
                    └── WillManager.sol       (Will creation, activation, disputes)
                        = UnifiedWillManager  (Deployed entry point)
```

**Supporting contracts:**
| Contract | Purpose |
|----------|---------|
| `AgeVerifier.sol` | Groth16 verifier for 4-signal age proof |
| `Verifier.sol` | Groth16 verifier for 5-signal DID liveness proof |
| `LivenessRegistry.sol` | On-chain DID liveness record storage |
| `AgeVerificationSystem.sol` | Wrapper combining age verifier + will manager |
| `ERC721FractionalWrapper.sol` | Wraps indivisible NFTs into fungible shares |
| `NFTGovernanceWrapper.sol` | t-of-n threshold multisig for shared NFT governance |
| `ILivenessVerifier.sol` | Interface for liveness verification |

**Test tokens (for Sepolia testing):**
| Contract | Standard | Purpose |
|----------|----------|---------|
| `TestUSDC.sol` | ERC-20 | Faucet: mint 1000 USDC per call |
| `CryptoArtNFT.sol` | ERC-721 | Mint NFTs with metadata URI |
| `GameAssetsNFT.sol` | ERC-1155 | Faucet: mint fungible game items |
| `MockVerifier.sol` | — | Always-true verifier for testing |

---

## Will State Machine

Every will transitions through a strict state machine. No state can be skipped.

```
                    ┌──────────────────────────────────────────┐
                    │              Owner recovers               │
                    │          (recordHeartbeat / recoverWill)  │
                    ▼                                          │
┌─────────┐   activateWill   ┌────────┐   heartbeat   ┌──────────────┐
│ Created │ ───────────────► │ Active │ ◄──────────── │ OwnerInactive│
└─────────┘                  └────────┘  expires ───► └──────────────┘
     │                            │                        │
     │ cancelWill                 │                  after INACTIVITY_
     ▼                            │               CONFIRMATION_DELAY
┌───────────┐                     │                        │
│ Cancelled │                     │                        ▼
└───────────┘                     │               ┌──────────────┐
                                  │               │ GracePeriod  │
                                  │               └──────────────┘
                                  │                        │
                                  │              after GRACE_PERIOD_
                                  │                   DURATION
                                  │                        ▼
                                  │               ┌────────────────┐
                                  │               │PendingHeirProof│
                                  │               └────────────────┘
                                  │                        │
                                  │               all heirs submit
                                  │                  ZKP age proof
                                  │                        ▼
                                  │               ┌────────────────┐
                                  │               │ReadyToExecute  │
                                  │               └────────────────┘
                                  │                        │
                                  │              executeInheritanceBatch
                                  │                        ▼
                                  │               ┌───────────┐
                                  │               │ Executing │
                                  │               └───────────┘
                                  │                        │
                                  │               all assets distributed
                                  │                        ▼
                                  │               ┌──────────┐
                                  └──────────────►│ Executed  │
                                                  └──────────┘
```

**Key transitions:**
- **Created → Active**: Owner calls `activateWill()` after adding heirs (shares must total 100%) and depositing assets
- **Active → OwnerInactive**: Anyone calls `detectInactivity()` after `lastHeartbeat + heartbeatInterval` has passed
- **OwnerInactive → GracePeriod**: Anyone calls `startGracePeriod()` after `INACTIVITY_CONFIRMATION_DELAY` (30 days)
- **GracePeriod → PendingHeirProof**: A registered heir calls `finalizeGracePeriod()` after `GRACE_PERIOD_DURATION` (90 days)
- **PendingHeirProof → ReadyToExecute**: All heirs submit valid Groth16 age proofs via `verifyHeirAge()`
- **ReadyToExecute → Executing → Executed**: Anyone calls `executeInheritanceBatch()` to distribute assets

---

## Mathematical Formulas & Timing

### Inactivity Detection

```
isInactive(owner, willId) = (block.timestamp > lastHeartbeat + heartbeatInterval)
```

| Constant | Default Value | Description |
|----------|--------------|-------------|
| `DEFAULT_HEARTBEAT_INTERVAL` | 180 days | Time before owner is considered inactive |
| `INACTIVITY_CONFIRMATION_DELAY` | 30 days | Buffer after inactivity detection |
| `GRACE_PERIOD_DURATION` | 90 days | Final window for owner to recover |
| `HEIR_PROOF_DEADLINE` | 180 days | Time for heirs to submit age proofs |
| `DISPUTE_PERIOD` | 30 days | Window to raise disputes |
| `DISPUTE_BOND` | 0.1 ETH | Required deposit to raise a dispute |
| `UNCLAIMED_ASSET_DEADLINE` | 365 days | After which unclaimed assets can be swept |

**Total time from last heartbeat to execution:**
```
T_total = heartbeatInterval + INACTIVITY_CONFIRMATION_DELAY + GRACE_PERIOD_DURATION + heir_proof_time
        = 180 + 30 + 90 + (up to 180)
        = 300 to 480 days minimum
```

### Asset Distribution Formula

For divisible assets (ETH, ERC-20, fungible ERC-1155):

```
heir_amount = (asset.amount * heir.sharePercentage) / 10000
```

Where `sharePercentage` is in **basis points** (1% = 100 bps, 100% = 10000 bps).

Example: If a will has 2 ETH and an heir has 5000 bps (50%):
```
heir_amount = (2 ETH * 5000) / 10000 = 1 ETH
```

For indivisible assets (ERC-721 NFTs): assigned to a `specificHeir` at deposit time.

### Distribution Strategy: Auto-Push with Pull Fallback

```
for each heir:
    try:
        directTransfer(heir, amount)     // Auto-push (saves gas for heir)
    catch:
        pendingBalance[heir] += amount   // Pull-based fallback
        emit AutoPushAttempted(heir, willId, false)
```

This ensures assets are never stuck if a recipient contract rejects transfers.

---

## Zero-Knowledge Proof Systems

The system uses two independent Groth16 ZKP circuits on the BN128 curve.

### 1. Age Verification ZKP (Groth16 — 4 signals)

**Circuit**: `age-verification-zkp/circuits/ageVerification.circom`

**Purpose**: Prove an heir meets the minimum age requirement without revealing their birth year.

**Private inputs** (known only to the heir):
| Input | Description |
|-------|-------------|
| `birthYear` | Heir's year of birth (e.g., 2000) |
| `salt` | Random 256-bit secret shared privately by the will owner |

**Public inputs** (visible on-chain):
| Signal | Description |
|--------|-------------|
| `willId` | The will being claimed |
| `minimumAge` | Required age set by owner (e.g., 18) |
| `currentYear` | Current calendar year (e.g., 2025) |
| `commitment` | `birthYear + salt + willId` — stored on-chain when adding heir |

**Circuit constraints:**
```
1. commitment === birthYear + salt + willId        // Commitment verification
2. age = currentYear - birthYear                   // Age computation
3. ageDiff = age - minimumAge >= 0                 // Age check (via Num2Bits)
4. birthYear >= 1900                               // Sanity: valid birth year
5. currentYear >= birthYear                        // Sanity: not born in future
```

**How to generate a proof:**

**Step 1 — Owner creates commitment** (when adding heir):
```bash
cd age-verification-zkp
# Edit input/heir_data.json:
# { "heirName": "Bob", "birthYear": 2000, "willId": 0, "minimumAge": 18 }
node scripts/generate_commitment.js
```
This outputs the `commitment` value to store in `addHeir()` and a `salt` to share privately with the heir.

**Step 2 — Heir generates proof** (when claiming):
```bash
cd age-verification-zkp
# The heir needs: birthYear, salt (from owner), willId, minimumAge, currentYear
npx snarkjs groth16 fullprove input.json build/ageVerification_js/ageVerification.wasm build/circuit_final.zkey proof.json public.json
```

**Step 3 — Submit to web app:**
From the generated `proof.json` and `public.json`:
- `pA` = `[proof.pi_a[0], proof.pi_a[1]]`
- `pB` = `[[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]]`
- `pC` = `[proof.pi_c[0], proof.pi_c[1]]`
- `pubSignals` = `[willId, minimumAge, currentYear, commitment]` from `public.json`

**Example values** (from `proof.json` and `public.json` in this repo):
```
pA: ["8887550305944791569609117721674170190489743469566173293412753564986762741306",
     "19748736924275928554651697435388713683297811180451614505594996421450728500601"]

pB: [["10216270992264601418163177268597954039852711356895109953461312772108666494042",
      "11606176017576377872517733797435321551481640704542878276655539065760976665100"],
     ["19028924012671378012035331825748636864676831654437159336642728526630439996290",
      "7085680636399188750386084991801548779403120405075926243251753981692521729231"]]

pC: ["21598111523972276222723216592844054688134917828117945618557825238783089139784",
     "17001214953921436234432925333703016817183640998324586206492027043272489933079"]

pubSignals: ["0", "18", "2025", "123456789012345678901234569890"]
             willId  minAge  year    commitment
```

### 2. DID Liveness Proof (Groth16 — 5 signals)

**Circuit**: `proof-of-life/circuits/liveness.circom`

**Purpose**: Prove the will owner is alive using an iden3/Privado DID credential with face-liveness verification, without revealing the credential contents.

**Private inputs:**
| Input | Description |
|-------|-------------|
| `livenessTimestamp` | Timestamp when face verification was performed |
| `signature` | Credential signature from the issuer |

**Public inputs (5 signals):**
| Signal | Index | Description |
|--------|-------|-------------|
| `isValid` | 0 | 1 if proof is valid, 0 otherwise |
| `didHash` | 1 | SHA-256 hash of the DID string, reduced mod BN128 field |
| `expirationDate` | 2 | Unix timestamp when the credential expires |
| `revocationNonce` | 3 | Nonce for credential revocation checking |
| `currentTimestamp` | 4 | Unix timestamp at proof generation time |

**Circuit constraints:**
```
1. currentTimestamp < expirationDate               // Credential not expired
2. livenessTimestamp * didHash * expirationDate     // All fields non-zero
   * revocationNonce != 0
3. isValid = (currentTimestamp < expirationDate)    // Output signal
```

**How to generate a proof from a Privado ID credential:**

**Step 1 — Get a liveness credential:**
Use the [Privado ID app](https://www.privado.id/) to perform face-liveness verification. This produces a JSON credential file.

**Step 2 — Generate ZKP:**
```bash
cd proof-of-life
# Place your credential at input/credential.json
node scripts/parse_and_generate.js
```

The script automatically:
1. Extracts `livenessTimestamp`, `expirationDate`, `revocationNonce` from the credential JSON
2. Computes `didHash = SHA256(did_string) mod BN128_FIELD_PRIME`
   where `BN128_FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617`
3. Generates the Groth16 proof using snarkjs
4. Outputs `proof.json`, `public.json`, and `remix_data.json`

**Step 3 — Submit to web app** (DID Liveness Heartbeat):

From `output/remix_data.json`, copy the hex values:
```json
{
  "proof": {
    "a": ["0x2c596681...", "0x2bc4ea89..."],
    "b": [["0x294afd35...", "0x164c5ceb..."], ["0x01480b45...", "0x19fdbea2..."]],
    "c": ["0x2004c9df...", "0x19874373..."]
  },
  "publicSignals": {
    "isValid": "0x...01",
    "didHash": "0x2a9e3db5...",
    "expirationDate": "0x...69a5726b",
    "revocationNonce": "0x...16b9e7c0",
    "currentTimestamp": "0x...69748f6a"
  }
}
```

For the **DID Liveness Heartbeat** form in the web app:
- **Proof A**: `["pi_a[0]", "pi_a[1]"]` as JSON
- **Proof B**: `[["pi_b[0][0]", "pi_b[0][1]"], ["pi_b[1][0]", "pi_b[1][1]"]]` as JSON
- **Proof C**: `["pi_c[0]", "pi_c[1]"]` as JSON
- **Public Signals**: `[isValid, didHash, expirationDate, revocationNonce, currentTimestamp]` as JSON

> **DID Hash for registration**: When creating a will, the `ownerDidHash` parameter should be the decimal value of `SHA256(your_DID_string) mod BN128_FIELD_PRIME`. The `parse_and_generate.js` script outputs this value.

---

## Deployment Guide (Remix IDE)

### Prerequisites
- MetaMask wallet with Sepolia ETH (use a [Sepolia faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
- [Remix IDE](https://remix.ethereum.org)

### Step 1: Deploy Groth16 Verifiers

1. Open Remix IDE, create `AgeVerifier.sol` and `Verifier.sol` from the `Solidity-code/ZKProofs/` folder
2. Compile with Solidity **0.8.20+**, optimizer enabled (200 runs)
3. Deploy `AgeVerifier` → copy the deployed address
4. Deploy `Verifier` (the 5-signal liveness verifier) → copy the deployed address

> **For testing**: Deploy `MockVerifier.sol` from `TestTokens/` instead — it accepts any proof.

### Step 2: Deploy UnifiedWillManager

1. Upload all Solidity files from `Solidity-code/` to Remix (maintain the inheritance chain)
2. Compile `WillManager.sol` with optimizer enabled (200 runs)
3. Deploy with constructor arguments: `(ageVerifierAddress, livenessVerifierAddress)`
4. **Important**: Set gas limit to **30,000,000** in Remix (default 3M is insufficient)
5. Copy the deployed UnifiedWillManager address

> **Note**: If you hit EIP-3860 initcode size limits on Remix VM, use a pre-Shanghai VM (Merge/London) or deploy to Sepolia directly.

### Step 3: Deploy Test Tokens (Optional)

1. Deploy `TestUSDC.sol` → ERC-20 faucet (1000 tokens per mint)
2. Deploy `CryptoArtNFT.sol` → ERC-721 with metadata URI
3. Deploy `GameAssetsNFT.sol` → ERC-1155 fungible game items

### Step 4: Connect Web App

Paste the UnifiedWillManager address into the web app's setup screen.

---

## Web Application

The web app is a standalone **React.js** frontend + **Node.js/Express** backend that interacts with the deployed smart contracts via MetaMask.

### 1. Setup & Contract Connection

![Setup - Enter Contract Address](screenshots/01-setup-enter-contract.png)

After connecting MetaMask, paste the deployed **UnifiedWillManager** contract address. The app validates the Ethereum address format (`0x` + 40 hex characters) and persists it in `localStorage`.

**Parameters:**
| Field | Value | Description |
|-------|-------|-------------|
| Contract Address | `0x...` (40 hex chars) | The deployed UnifiedWillManager address from Remix |

---

### 2. Dashboard

![Dashboard](screenshots/02-dashboard-empty.png)

Displays all wills owned by the connected wallet address. For each will, shows:
- **State**: Current state in the state machine (color-coded badge)
- **Asset count**: Number of deposited assets
- **Heir count**: Number of registered heirs
- **Last heartbeat**: Timestamp of the most recent heartbeat
- **Heartbeat interval**: Custom or default (180 days)

The dashboard calls `willCount(address)` to get the total, then iterates `getWill()` and `getWillDetails()` for each.

---

### 3. Create Will (4-Step Wizard)

![Create Will - Step 1](screenshots/03-create-will-step1.png)

A guided 4-step process with a visual progress indicator:

#### Step 1: Create Will
Calls `createWill(ownerDidHash, fallbackBeneficiary)`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `ownerDidHash` | `uint256` | SHA-256 hash of your iden3 DID (mod BN128 field). Enter `0` to skip DID registration. |
| `fallbackBeneficiary` | `address` | Address for unclaimed assets after deadline. Defaults to `address(0)` = will owner. |

#### Step 2: Add Heirs
Calls `addHeir(willId, heirAddress, sharePercentage, birthdateCommitment, minimumAge, vestingPeriod)` for each heir.

| Parameter | Type | Description |
|-----------|------|-------------|
| `heirAddress` | `address` | Heir's wallet address |
| `sharePercentage` | `%` (converted to bps) | Enter as percentage (e.g., `50` for 50%). Converted to basis points internally: `50% → 5000 bps`. **All heirs must total exactly 100%.** |
| `birthdateCommitment` | `uint256` | `birthYear + salt + willId` — generated by `generate_commitment.js`. Enter `0` to skip age verification. |
| `minimumAge` | `uint8` | Required age for inheritance (e.g., `18`). Heir must submit ZKP proving `currentYear - birthYear >= minimumAge`. |
| `vestingPeriod` | `uint256` | Lock period in seconds after execution. `0` = immediate release. |

#### Step 3: Deposit Assets
Supports 4 asset types:

| Asset Type | Contract Function | Approval Required |
|------------|------------------|-------------------|
| **ETH** | `addETHAsset(willId)` with `msg.value` | None |
| **ERC-20** | `addERC20Asset(willId, tokenAddr, amount)` | `approve(willContract, amount)` auto-called |
| **ERC-721** | `addERC721Asset(willId, tokenAddr, tokenId, specificHeir)` | `approve(willContract, tokenId)` auto-called |
| **ERC-1155** | `addERC1155AssetFungible/NFT(...)` | `setApprovalForAll(willContract, true)` auto-called |

#### Step 4: Activate
Calls `activateWill(willId)`. Requires:
- At least 1 heir added
- Heir shares total exactly 10000 bps (100%)
- The heartbeat timer starts immediately upon activation

---

### 4. Manage Will

![Manage Will - Top](screenshots/04-manage-will-top.png)
![Manage Will - Bottom](screenshots/05-manage-will-bottom.png)

Eight management operations:

| Card | Function | Parameters | Description |
|------|----------|------------|-------------|
| **Cancel Will** | `cancelWill(willId)` | `willId` | Reclaim all deposited assets. Works in Created, Active, OwnerInactive, or GracePeriod states. |
| **Recover Will** | `recoverWill(willId)` | `willId` | Owner recovers from OwnerInactive/GracePeriod back to Active. |
| **Set Fallback** | `setFallbackBeneficiary(willId, addr)` | `willId`, `beneficiary address` | Update the address that receives unclaimed assets after the deadline. |
| **Set Heartbeat Interval** | `setHeartbeatInterval(willId, interval)` | `willId`, `interval (seconds)` | Custom heartbeat interval. Default is 180 days = `15552000` seconds. |
| **Register DID** | `registerDID(willId, didHash)` | `willId`, `DID hash (uint256)` | Register your iden3/Privado DID hash for ZKP-based liveness heartbeats. Use `SHA256(did_string) mod BN128_FIELD` as the hash. |
| **Raise Dispute** | `disputeExecution(owner, willId, reason)` | `owner`, `willId`, `reason`, `0.1 ETH bond` | Challenge an execution. Requires `DISPUTE_BOND` (0.1 ETH) as deposit. |
| **Resolve Dispute (Owner)** | `resolveDisputeAsOwner(willId, disputeId)` | `willId`, `disputeId` | Owner proves liveness to resolve the dispute. |
| **Resolve Expired** | `resolveExpiredDispute(owner, willId, disputeId)` | `owner`, `willId`, `disputeId` | Resolve after `DISPUTE_PERIOD` (30 days) expires. |

#### Rotate Heir Address (EIP-712)

![Rotate Heir Address](screenshots/06-manage-will-rotate-heir.png)

Calls `rotateHeirAddress(owner, willId, heirIndex, newAddress, deadline, signature)`.

This allows an heir to update their receiving address using an **EIP-712 typed signature**. The current heir signs a message authorizing the rotation, and anyone can submit the transaction.

| Parameter | Type | Description |
|-----------|------|-------------|
| `Will Owner` | `address` | The will owner's address |
| `Will ID` | `uint256` | Target will |
| `Heir Index` | `uint256` | Position of the heir (0-indexed) |
| `New Address` | `address` | New wallet address for the heir |
| `Deadline` | `uint256` | Unix timestamp after which the signature expires |
| `Heir Signature` | `bytes` | EIP-712 signature from the current heir authorizing the rotation |

---

### 5. Heartbeat & Liveness

![Heartbeat - Top](screenshots/07-heartbeat-top.png)
![Heartbeat - Bottom](screenshots/08-heartbeat-bottom.png)

The heartbeat system is the core liveness detection mechanism. Eight operations across two categories:

#### Liveness Proofs (Top Row)

| Card | Function | Parameters | Description |
|------|----------|------------|-------------|
| **Record Heartbeat** | `recordHeartbeat(willId)` | `willId` | Simple on-chain transaction proving the owner is alive. Resets the inactivity timer: `lastHeartbeat = block.timestamp`. |
| **Set Delegate** | `setHeartbeatDelegate(delegate)` | `delegate address` | Allow a trusted person (family member, attorney) to record heartbeats on your behalf. |
| **Delegate Heartbeat** | `recordHeartbeatByDelegate(owner, willId)` | `owner address`, `willId` | Called by an authorized delegate. Must be pre-authorized via `setHeartbeatDelegate()`. |
| **DID Liveness Heartbeat (ZKP)** | `recordHeartbeatWithDIDProof(willId, pA, pB, pC, pubSignals)` | `willId`, Groth16 proof components, 5 public signals | Submit a ZKP from iden3/Privado face-liveness verification. See [DID Liveness Proof](#2-did-liveness-proof-groth16--5-signals) for how to generate the proof values. |

**DID Liveness Heartbeat parameters in detail:**

| Field | Format | Source |
|-------|--------|--------|
| `Proof A` | `["<pi_a[0]>", "<pi_a[1]>"]` | From `output/proof.json` → `pi_a` (skip index 2 which is always "1") |
| `Proof B` | `[["<pi_b[0][0]>","<pi_b[0][1]>"],["<pi_b[1][0]>","<pi_b[1][1]>"]]` | From `output/proof.json` → `pi_b` (skip the `["1","0"]` row) |
| `Proof C` | `["<pi_c[0]>", "<pi_c[1]>"]` | From `output/proof.json` → `pi_c` (skip index 2) |
| `Public Signals` | `["isValid","didHash","expDate","nonce","timestamp"]` | From `output/public.json` — 5 values in order |

#### Death Confirmation Flow (Bottom Row)

| Card | Function | Who Can Call | When |
|------|----------|-------------|------|
| **Detect Inactivity** | `detectInactivity(owner, willId)` | Anyone | After `lastHeartbeat + heartbeatInterval` has passed |
| **Start Grace Period** | `startGracePeriod(owner, willId)` | Anyone | After `INACTIVITY_CONFIRMATION_DELAY` (30 days) from detection |
| **Finalize Grace Period** | `finalizeGracePeriod(owner, willId)` | Registered heirs only | After `GRACE_PERIOD_DURATION` (90 days) from grace start |
| **Check Inactivity Status** | `isOwnerInactive(owner, willId)` | Anyone (read-only) | Anytime — returns `true` if heartbeat has expired |

**Timeline formula:**
```
detectInactivity:    block.timestamp > lastHeartbeat + heartbeatInterval
startGracePeriod:    block.timestamp > inactivityDetectedAt + INACTIVITY_CONFIRMATION_DELAY
finalizeGracePeriod: block.timestamp > gracePeriodStartedAt + GRACE_PERIOD_DURATION
```

---

### 6. Inheritance Execution

![Inheritance - Top](screenshots/09-inheritance-top.png)
![Inheritance - Scrolled](screenshots/10-inheritance-scrolled.png)

After grace period finalization, the will enters **PendingHeirProof** state. Four operations:

| Card | Function | Parameters | Description |
|------|----------|------------|-------------|
| **Verify Heir Age (ZKP)** | `verifyHeirAge(owner, willId, heirIndex, pA, pB, pC, pubSignals)` | owner, willId, heirIndex, Groth16 proof (4 public signals) | Each heir submits their own age proof. See [Age Verification ZKP](#1-age-verification-zkp-groth16--4-signals). |
| **Execute Inheritance (Batch)** | `executeInheritanceBatch(owner, willId, batchSize)` | owner, willId, batchSize (max 10) | Distribute assets to verified heirs. Uses auto-push with pull fallback. Call multiple times if >10 assets. |
| **Reset Expired Heir Proof** | `resetExpiredHeirProof(owner, willId)` | owner, willId | If heirs fail to submit proofs within `HEIR_PROOF_DEADLINE` (180 days), reset back to GracePeriod. |
| **Rescue Stuck NFT** | `rescueStuckNFT(owner, willId, assetIndex, receiver)` | owner, willId, assetIndex, receiver address | If an NFT transfer failed during execution (recipient rejected it), the designated heir can retry to a different address. |

**Age verification proof parameters:**

| Field | Format | Source |
|-------|--------|--------|
| `Proof A` | `["<pi_a[0]>", "<pi_a[1]>"]` | From `age-verification-zkp/proof.json` |
| `Proof B` | `[["<pi_b[0][0]>","<pi_b[0][1]>"],["<pi_b[1][0]>","<pi_b[1][1]>"]]` | From `age-verification-zkp/proof.json` |
| `Proof C` | `["<pi_c[0]>", "<pi_c[1]>"]` | From `age-verification-zkp/proof.json` |
| `Public Signals` | `["willId", "minimumAge", "currentYear", "commitment"]` | From `age-verification-zkp/public.json` — 4 values |

---

### 7. Claims (Pull-Based)

![Claims - Top](screenshots/11-claims-top.png)
![Claims - Bottom](screenshots/12-claims-bottom%20.png)

When auto-push fails during execution, assets are stored in pending balances. Heirs claim them manually.

**Your Pending Claims** section shows:
- `pendingETH(address)` — unclaimed ETH balance
- `pendingERC20(address, tokenAddress)` — unclaimed ERC-20 balance

| Card | Function | Parameters | Description |
|------|----------|------------|-------------|
| **Claim ETH** | `claimETH()` | None | Withdraw all pending ETH to your wallet |
| **Claim ERC-20** | `claimERC20(tokenAddress)` | ERC-20 contract address | Withdraw pending ERC-20 tokens |
| **Claim ERC-1155** | `claimERC1155(tokenAddress, tokenId)` | ERC-1155 contract address, token ID | Withdraw pending ERC-1155 tokens |
| **Sweep Unclaimed ETH** | `sweepUnclaimedETH(owner, willId)` | owner, willId | Fallback beneficiary sweeps unclaimed ETH after `UNCLAIMED_ASSET_DEADLINE` (365 days) |

![Claims - Sweep](screenshots/13-claims-sweep.png)

| Card | Function | Parameters | Description |
|------|----------|------------|-------------|
| **Sweep ERC-20** | `sweepUnclaimedERC20(owner, willId, token)` | owner, willId, token address | Sweep unclaimed ERC-20 after deadline |
| **Sweep ERC-1155** | `sweepUnclaimedERC1155(owner, willId, token, tokenId)` | owner, willId, token address, token ID | Sweep unclaimed ERC-1155 after deadline |

---

### 8. Test Tokens

![Test Tokens](screenshots/14-test-tokens.png)

Deploy test tokens from `Solidity-code/TestTokens/` on Sepolia, then enter their addresses in the **Save Addresses** section. Three faucets:

| Card | Standard | Function | Description |
|------|----------|----------|-------------|
| **TestUSDC** | ERC-20 | `faucet()` / `balanceOf(address)` | Mint 1000 USDC. Check balance. |
| **CryptoArtNFT** | ERC-721 | `mintNFT(metadataURI)` | Mint an NFT with a metadata URI (e.g., IPFS link). |
| **GameAssetsNFT** | ERC-1155 | `faucet()` / `balanceOf(address, tokenId)` | Mint game items (token IDs 1-3). Check per-token balance. |

---

## Backend API

The Node.js/Express backend provides read-only blockchain queries at `http://localhost:3001`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/wills/:contract/:owner` | GET | List all wills for an owner |
| `/api/wills/:contract/:owner/:willId` | GET | Get will details with assets and heirs |
| `/api/claims/:contract/:address` | GET | Check pending ETH/ERC-20 balances |
| `/api/constants/:contract` | GET | Get system timing constants |
| `/api/inactivity/:contract/:owner/:willId` | GET | Check if owner is inactive |
| `/api/events/:contract` | GET | Query recent contract events (last 1000 blocks) |

All endpoints accept an optional `?rpc=<URL>` query parameter to specify a custom RPC endpoint. Defaults to `http://127.0.0.1:8545`.

---

## Running Locally

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Deployed contracts on Sepolia (or Remix VM)

### Install & Start

```bash
# Clone the repository
git clone https://github.com/Sanjoy-Chattopadhay/will-on-chain.git
cd will-on-chain/will-app

# Install all dependencies (frontend + backend)
npm run install:all

# Start both servers
npm start
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

### ZKP Setup (Optional)

```bash
# Age Verification circuit
cd age-verification-zkp
npm install
node scripts/generate_commitment.js    # Generate commitment for addHeir()

# DID Liveness circuit
cd proof-of-life
npm install
node scripts/parse_and_generate.js     # Generate proof from Privado credential
```

---

## Project Structure

```
will-on-chain/
├── Solidity-code/                    # Smart contracts
│   ├── WillTypes.sol                 # Enums, structs, constants
│   ├── WillStorage.sol               # State variables and mappings
│   ├── HeartbeatManager.sol          # Heartbeat and DID liveness
│   ├── AssetManager.sol              # Multi-asset deposit logic
│   ├── ExecutionManager.sol          # Batch execution and claims
│   ├── WillManager.sol               # Will lifecycle and disputes (= UnifiedWillManager)
│   ├── ILivenessVerifier.sol         # Liveness verifier interface
│   ├── ERC721FractionalWrapper.sol   # NFT fractionalization
│   ├── NFTGovernanceWrapper.sol      # t-of-n multisig for shared NFTs
│   ├── timestamp.sol                 # Timestamp utilities
│   ├── ZKProofs/                     # Groth16 verifier contracts
│   │   ├── AgeVerifier.sol           # 4-signal age verifier
│   │   ├── Verifier.sol              # 5-signal liveness verifier
│   │   ├── AgeVerificationSystem.sol # Age verification wrapper
│   │   └── LivenessRegistry.sol      # On-chain DID record storage
│   └── TestTokens/                   # Test token contracts
│       ├── TestUSDC.sol              # ERC-20 faucet
│       ├── CryptoArtNFT.sol          # ERC-721 mintable
│       ├── GameAssetsNFT.sol         # ERC-1155 faucet
│       └── MockVerifier.sol          # Always-true verifier for testing
│
├── age-verification-zkp/             # Heir age verification ZKP
│   ├── circuits/
│   │   └── ageVerification.circom    # Circom circuit (6 signals)
│   ├── build/
│   │   ├── ageVerification.wasm      # Compiled circuit
│   │   ├── circuit_final.zkey        # Proving key
│   │   ├── verification_key.json     # Verification key
│   │   └── AgeVerifier.sol           # Generated Solidity verifier
│   ├── input/
│   │   └── heir_data.json            # Heir birth data for commitment
│   ├── scripts/
│   │   └── generate_commitment.js    # Commitment generator for will owners
│   ├── proof.json                    # Example generated proof
│   └── public.json                   # Example public signals
│
├── proof-of-life/                    # DID liveness verification ZKP
│   ├── circuits/
│   │   └── liveness.circom           # Circom circuit (6 inputs, 5 public)
│   ├── build/
│   │   ├── liveness_js/liveness.wasm # Compiled circuit
│   │   ├── liveness_final.zkey       # Proving key
│   │   └── verification_key.json     # Verification key
│   ├── contracts/
│   │   ├── Verifier.sol              # Generated Solidity verifier
│   │   └── LivenessRegistry.sol      # On-chain registry
│   ├── input/
│   │   └── credential.json           # Example Privado ID credential
│   ├── output/
│   │   ├── proof.json                # Generated proof
│   │   ├── public.json               # Public signals [isValid, didHash, expDate, nonce, timestamp]
│   │   └── remix_data.json           # Formatted for Remix IDE / web app
│   └── scripts/
│       └── parse_and_generate.js     # Credential parser + proof generator
│
├── will-app/                         # Web application
│   ├── package.json                  # Root scripts (install:all, start)
│   ├── backend/
│   │   ├── server.js                 # Express API (read-only blockchain queries)
│   │   └── package.json
│   └── frontend/
│       ├── public/index.html
│       └── src/
│           ├── App.js                # Main app (wallet connection, tabs, routing)
│           ├── index.js              # React entry point
│           ├── index.css             # Dark theme CSS
│           ├── contracts/abis.js     # All contract ABIs + constants
│           ├── utils/web3.js         # ethers.js v6 helpers + formatters
│           └── pages/
│               ├── Dashboard.js      # Will listing + details
│               ├── CreateWill.js     # 4-step creation wizard
│               ├── ManageWill.js     # Cancel, recover, disputes, EIP-712 rotation
│               ├── HeartbeatPage.js  # Heartbeat, delegation, DID ZKP, inactivity
│               ├── InheritancePage.js # Age ZKP verification, batch execution
│               ├── ClaimsPage.js     # Pull-based claims + sweep
│               └── TestTokens.js     # Test token faucets
│
└── screenshots/                      # Application screenshots
```

---

## License

This project is part of academic research. See the accompanying paper for citation details.
