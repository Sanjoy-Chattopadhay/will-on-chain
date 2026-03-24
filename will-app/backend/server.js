// ═══════════════════════════════════════════════════════════════
// Crypto Inheritance Will System – Node.js Backend
// Express API for read-only blockchain queries and event indexing
// ═══════════════════════════════════════════════════════════════

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Serve frontend static files in production ──
app.use(express.static(path.join(__dirname, "../frontend/build")));

// ── Minimal ABI for read-only queries ──
const WILL_READ_ABI = [
  "function getWill(address _owner, uint256 _willId) view returns (address, uint256, uint256, uint8, uint256, uint256)",
  "function getWillDetails(address _owner, uint256 _willId) view returns (uint256, uint256, uint256, address, uint256, uint256)",
  "function getAsset(address _owner, uint256 _willId, uint256 _assetIndex) view returns (tuple(uint8 assetType, address tokenContract, uint256 tokenId, uint256 amount, address specificHeir))",
  "function getHeir(address _owner, uint256 _willId, uint256 _heirIndex) view returns (tuple(address heirAddress, uint256 sharePercentage, uint256 birthdateCommitment, uint8 minimumAge, bool ageVerified, uint256 vestingPeriod, uint256 vestingUnlock))",
  "function willCount(address) view returns (uint256)",
  "function isOwnerInactive(address, uint256) view returns (bool)",
  "function pendingETH(address) view returns (uint256)",
  "function pendingERC20(address, address) view returns (uint256)",
  "function DEFAULT_HEARTBEAT_INTERVAL() view returns (uint256)",
  "function INACTIVITY_CONFIRMATION_DELAY() view returns (uint256)",
  "function GRACE_PERIOD_DURATION() view returns (uint256)",
  "function DISPUTE_PERIOD() view returns (uint256)",
  "function DISPUTE_BOND() view returns (uint256)",
  "event WillCreated(address indexed owner, uint256 indexed willId)",
  "event WillStateChanged(address indexed owner, uint256 indexed willId, uint8 newState)",
  "event HeartbeatRecorded(address indexed owner, uint256 timestamp, bool withProof)",
  "event InheritanceExecuted(address indexed heir, uint256 indexed willId, uint256 assetIndex)",
];

const WILL_STATES = [
  "Created", "Active", "OwnerInactive", "GracePeriod",
  "PendingHeirProof", "Disputed", "ReadyToExecute",
  "Executing", "Executed", "Cancelled"
];

// ── Helper: get provider from RPC URL or fallback ──
function getProvider(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl || process.env.RPC_URL || "http://127.0.0.1:8545");
}

function getContract(contractAddress, rpcUrl) {
  const provider = getProvider(rpcUrl);
  return new ethers.Contract(contractAddress, WILL_READ_ABI, provider);
}

// ═══════════════════════════════════════════════════
//                   API ROUTES
// ═══════════════════════════════════════════════════

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get all wills for an owner
app.get("/api/wills/:contractAddress/:ownerAddress", async (req, res) => {
  try {
    const { contractAddress, ownerAddress } = req.params;
    const { rpc } = req.query;
    const contract = getContract(contractAddress, rpc);
    const count = await contract.willCount(ownerAddress);
    const wills = [];

    for (let i = 0; i < Number(count); i++) {
      try {
        const w = await contract.getWill(ownerAddress, i);
        const details = await contract.getWillDetails(ownerAddress, i);
        wills.push({
          id: i,
          owner: w[0],
          assetCount: Number(w[1]),
          heirCount: Number(w[2]),
          state: Number(w[3]),
          stateName: WILL_STATES[Number(w[3])],
          lastHeartbeat: w[4].toString(),
          heartbeatInterval: w[5].toString(),
          ownerDidHash: details[0].toString(),
          inactivityDetectedAt: details[1].toString(),
          gracePeriodStartedAt: details[2].toString(),
          fallbackBeneficiary: details[3],
          heirProofDeadline: details[4].toString(),
          verifiedHeirsCount: Number(details[5]),
        });
      } catch {}
    }

    res.json({ owner: ownerAddress, willCount: Number(count), wills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific will
app.get("/api/wills/:contractAddress/:ownerAddress/:willId", async (req, res) => {
  try {
    const { contractAddress, ownerAddress, willId } = req.params;
    const { rpc } = req.query;
    const contract = getContract(contractAddress, rpc);

    const w = await contract.getWill(ownerAddress, willId);
    const details = await contract.getWillDetails(ownerAddress, willId);
    const isInactive = await contract.isOwnerInactive(ownerAddress, willId);

    // Fetch assets
    const assetCount = Number(w[1]);
    const assets = [];
    for (let i = 0; i < assetCount; i++) {
      try {
        const a = await contract.getAsset(ownerAddress, willId, i);
        assets.push({
          index: i,
          assetType: Number(a.assetType),
          assetTypeName: ["ETH", "ERC20", "ERC721", "ERC1155"][Number(a.assetType)],
          tokenContract: a.tokenContract,
          tokenId: a.tokenId.toString(),
          amount: a.amount.toString(),
          specificHeir: a.specificHeir,
        });
      } catch {}
    }

    // Fetch heirs
    const heirCount = Number(w[2]);
    const heirs = [];
    for (let i = 0; i < heirCount; i++) {
      try {
        const h = await contract.getHeir(ownerAddress, willId, i);
        heirs.push({
          index: i,
          heirAddress: h.heirAddress,
          sharePercentage: Number(h.sharePercentage),
          sharePercent: (Number(h.sharePercentage) / 100).toFixed(2) + "%",
          birthdateCommitment: h.birthdateCommitment.toString(),
          minimumAge: Number(h.minimumAge),
          ageVerified: h.ageVerified,
          vestingPeriod: h.vestingPeriod.toString(),
          vestingUnlock: h.vestingUnlock.toString(),
        });
      } catch {}
    }

    res.json({
      willId: Number(willId),
      owner: w[0],
      state: Number(w[3]),
      stateName: WILL_STATES[Number(w[3])],
      lastHeartbeat: w[4].toString(),
      heartbeatInterval: w[5].toString(),
      isInactive,
      ownerDidHash: details[0].toString(),
      inactivityDetectedAt: details[1].toString(),
      gracePeriodStartedAt: details[2].toString(),
      fallbackBeneficiary: details[3],
      heirProofDeadline: details[4].toString(),
      verifiedHeirsCount: Number(details[5]),
      assets,
      heirs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check pending claims for an address
app.get("/api/claims/:contractAddress/:address", async (req, res) => {
  try {
    const { contractAddress, address } = req.params;
    const { rpc, erc20Token } = req.query;
    const contract = getContract(contractAddress, rpc);

    const pendingETH = await contract.pendingETH(address);
    const result = { address, pendingETH: pendingETH.toString(), pendingETHFormatted: ethers.formatEther(pendingETH) };

    if (erc20Token) {
      const pendingERC20 = await contract.pendingERC20(address, erc20Token);
      result.pendingERC20 = { token: erc20Token, amount: pendingERC20.toString() };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get system constants
app.get("/api/constants/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { rpc } = req.query;
    const contract = getContract(contractAddress, rpc);

    const [hbi, icd, gpd, dp, db] = await Promise.all([
      contract.DEFAULT_HEARTBEAT_INTERVAL(),
      contract.INACTIVITY_CONFIRMATION_DELAY(),
      contract.GRACE_PERIOD_DURATION(),
      contract.DISPUTE_PERIOD(),
      contract.DISPUTE_BOND(),
    ]);

    res.json({
      DEFAULT_HEARTBEAT_INTERVAL: hbi.toString(),
      INACTIVITY_CONFIRMATION_DELAY: icd.toString(),
      GRACE_PERIOD_DURATION: gpd.toString(),
      DISPUTE_PERIOD: dp.toString(),
      DISPUTE_BOND: db.toString(),
      DISPUTE_BOND_ETH: ethers.formatEther(db),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check inactivity
app.get("/api/inactivity/:contractAddress/:ownerAddress/:willId", async (req, res) => {
  try {
    const { contractAddress, ownerAddress, willId } = req.params;
    const { rpc } = req.query;
    const contract = getContract(contractAddress, rpc);
    const isInactive = await contract.isOwnerInactive(ownerAddress, willId);
    res.json({ ownerAddress, willId: Number(willId), isInactive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent events (last N blocks)
app.get("/api/events/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { rpc, blocks = "1000" } = req.query;
    const provider = getProvider(rpc);
    const contract = new ethers.Contract(contractAddress, WILL_READ_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - parseInt(blocks));

    const [willCreated, stateChanged, heartbeats, executions] = await Promise.all([
      contract.queryFilter("WillCreated", fromBlock),
      contract.queryFilter("WillStateChanged", fromBlock),
      contract.queryFilter("HeartbeatRecorded", fromBlock),
      contract.queryFilter("InheritanceExecuted", fromBlock),
    ]);

    const events = [
      ...willCreated.map(e => ({ type: "WillCreated", owner: e.args[0], willId: Number(e.args[1]), block: e.blockNumber, txHash: e.transactionHash })),
      ...stateChanged.map(e => ({ type: "StateChanged", owner: e.args[0], willId: Number(e.args[1]), newState: WILL_STATES[Number(e.args[2])], block: e.blockNumber, txHash: e.transactionHash })),
      ...heartbeats.map(e => ({ type: "Heartbeat", owner: e.args[0], timestamp: e.args[1].toString(), withProof: e.args[2], block: e.blockNumber, txHash: e.transactionHash })),
      ...executions.map(e => ({ type: "InheritanceExecuted", heir: e.args[0], willId: Number(e.args[1]), assetIndex: Number(e.args[2]), block: e.blockNumber, txHash: e.transactionHash })),
    ];

    events.sort((a, b) => b.block - a.block);
    res.json({ fromBlock, toBlock: currentBlock, eventCount: events.length, events: events.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-all: serve frontend in production ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`\n  ╔════════════════════════════════════════════════════╗`);
  console.log(`  ║   Crypto Inheritance Will System – Backend API     ║`);
  console.log(`  ╠════════════════════════════════════════════════════╣`);
  console.log(`  ║   Server running on: http://localhost:${PORT}        ║`);
  console.log(`  ║   API base:          http://localhost:${PORT}/api    ║`);
  console.log(`  ╚════════════════════════════════════════════════════╝\n`);
});

module.exports = app;
