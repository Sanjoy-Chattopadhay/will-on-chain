// ═══════════════════════════════════════════════════════════════
// Contract ABIs extracted from Solidity source code
// Deploy contracts via Remix IDE, then paste addresses in the app
// ═══════════════════════════════════════════════════════════════

export const UNIFIED_WILL_MANAGER_ABI = [
  // ─── Constructor ───
  "constructor(address _heirAgeVerifier, address _livenessVerifier)",

  // ─── Will Creation ───
  "function createWill(uint256 _ownerDidHash, address _fallbackBeneficiary) external returns (uint256 willId)",
  "function addHeir(uint256 _willId, address _heirAddress, uint256 _sharePercentage, uint256 _birthdateCommitment, uint8 _minimumAge, uint256 _vestingPeriod) external",
  "function activateWill(uint256 _willId) external",
  "function cancelWill(uint256 _willId) external",
  "function setFallbackBeneficiary(uint256 _willId, address _beneficiary) external",

  // ─── Asset Deposits ───
  "function addETHAsset(uint256 _willId) external payable",
  "function addERC20Asset(uint256 _willId, address _tokenContract, uint256 _amount) external",
  "function addERC721Asset(uint256 _willId, address _tokenContract, uint256 _tokenId, address _specificHeir) external",
  "function addERC1155AssetFungible(uint256 _willId, address _tokenContract, uint256 _tokenId, uint256 _amount) external",
  "function addERC1155AssetNFT(uint256 _willId, address _tokenContract, uint256 _tokenId, address _specificHeir) external",
  "function addERC721SharedAsset(uint256 _willId, address _wrapperContract, uint256 _wrapId, uint256 _amount) external",

  // ─── Heartbeat & Liveness ───
  "function recordHeartbeat(uint256 _willId) external",
  "function recordHeartbeatByDelegate(address _owner, uint256 _willId) external",
  "function setHeartbeatDelegate(address _delegate) external",
  "function setHeartbeatInterval(uint256 _willId, uint256 _interval) external",
  "function registerDID(uint256 _willId, uint256 _didHash) external",
  "function recordHeartbeatWithDIDProof(uint256 _willId, uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[5] pubSignals) external",

  // ─── Death Confirmation Flow ───
  "function detectInactivity(address _owner, uint256 _willId) external",
  "function startGracePeriod(address _owner, uint256 _willId) external",
  "function finalizeGracePeriod(address _owner, uint256 _willId) external",
  "function recoverWill(uint256 _willId) external",

  // ─── Heir Verification & Execution ───
  "function verifyHeirAge(address _owner, uint256 _willId, uint256 _heirIndex, uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[4] pubSignals) external",
  "function executeInheritanceBatch(address _owner, uint256 _willId, uint256 _batchSize) external",

  // ─── Disputes ───
  "function disputeExecution(address _owner, uint256 _willId, string _reason) external payable",
  "function resolveDisputeAsOwner(uint256 _willId, uint256 _disputeId) external",
  "function resolveExpiredDispute(address _owner, uint256 _willId, uint256 _disputeId) external",
  "function resetExpiredHeirProof(address _owner, uint256 _willId) external",

  // ─── Claims (Pull-based) ───
  "function claimETH() external",
  "function claimERC20(address token) external",
  "function claimERC1155(address token, uint256 tokenId) external",
  "function rescueStuckNFT(address _owner, uint256 _willId, uint256 _assetIndex, address _receiver) external",

  // ─── Sweep Unclaimed ───
  "function sweepUnclaimedETH(address _owner, uint256 _willId) external",
  "function sweepUnclaimedERC20(address _owner, uint256 _willId, address _token) external",
  "function sweepUnclaimedERC1155(address _owner, uint256 _willId, address _token, uint256 _tokenId) external",

  // ─── Heir Address Rotation ───
  "function rotateHeirAddress(address _owner, uint256 _willId, uint256 _heirIndex, address _newAddress, uint256 _deadline, bytes _signature) external",

  // ─── View Functions ───
  "function getWill(address _owner, uint256 _willId) external view returns (address owner, uint256 assetCount, uint256 heirCount, uint8 state, uint256 lastHeartbeat, uint256 heartbeatInterval)",
  "function getWillDetails(address _owner, uint256 _willId) external view returns (uint256 ownerDidHash, uint256 inactivityDetectedAt, uint256 gracePeriodStartedAt, address fallbackBeneficiary, uint256 heirProofDeadline, uint256 verifiedHeirsCount)",
  "function getAsset(address _owner, uint256 _willId, uint256 _assetIndex) external view returns (tuple(uint8 assetType, address tokenContract, uint256 tokenId, uint256 amount, address specificHeir))",
  "function getHeir(address _owner, uint256 _willId, uint256 _heirIndex) external view returns (tuple(address heirAddress, uint256 sharePercentage, uint256 birthdateCommitment, uint8 minimumAge, bool ageVerified, uint256 vestingPeriod, uint256 vestingUnlock))",
  "function getDIDRecord(uint256 _didHash) external view returns (address ownerAddress, uint256 lastLivenessTimestamp, uint256 lastExpirationDate, bool isRegistered)",
  "function willCount(address) external view returns (uint256)",
  "function isOwnerInactive(address _owner, uint256 _willId) external view returns (bool)",
  "function pendingETH(address) external view returns (uint256)",
  "function pendingERC20(address, address) external view returns (uint256)",
  "function pendingERC1155(address, address, uint256) external view returns (uint256)",

  // ─── Constants ───
  "function DEFAULT_HEARTBEAT_INTERVAL() external view returns (uint256)",
  "function INACTIVITY_CONFIRMATION_DELAY() external view returns (uint256)",
  "function GRACE_PERIOD_DURATION() external view returns (uint256)",
  "function DISPUTE_PERIOD() external view returns (uint256)",
  "function DISPUTE_BOND() external view returns (uint256)",
  "function HEIR_PROOF_DEADLINE() external view returns (uint256)",
  "function UNCLAIMED_ASSET_DEADLINE() external view returns (uint256)",

  // ─── Events ───
  "event WillCreated(address indexed owner, uint256 indexed willId)",
  "event AssetAdded(address indexed owner, uint256 indexed willId, uint8 assetType)",
  "event HeirAdded(address indexed owner, uint256 indexed willId, address indexed heir)",
  "event WillStateChanged(address indexed owner, uint256 indexed willId, uint8 newState)",
  "event HeartbeatRecorded(address indexed owner, uint256 timestamp, bool withProof)",
  "event InactivityDetected(address indexed owner, uint256 indexed willId, address indexed detector)",
  "event GracePeriodStarted(address indexed owner, uint256 indexed willId, address indexed initiator)",
  "event GracePeriodFinalized(address indexed owner, uint256 indexed willId, address indexed initiator)",
  "event OwnerRecovered(address indexed owner, uint256 indexed willId)",
  "event HeirAgeVerified(address indexed heir, uint256 indexed willId)",
  "event InheritanceExecuted(address indexed heir, uint256 indexed willId, uint256 assetIndex)",
  "event DisputeRaised(uint256 indexed disputeId, address indexed challenger, uint256 indexed willId)",
  "event DisputeResolved(uint256 indexed disputeId, address indexed resolver)",
  "event ETHClaimed(address indexed beneficiary, uint256 amount)",
  "event ERC20Claimed(address indexed beneficiary, address indexed token, uint256 amount)",
  "event AutoPushAttempted(address indexed heir, uint256 indexed willId, bool success)",
  "event HeirAddressRotated(address indexed willOwner, uint256 indexed willId, uint256 heirIndex, address oldAddress, address newAddress)",
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function faucet() external",
];

export const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function mint(string _uri) external returns (uint256)",
  "function batchMint(uint256 quantity) external returns (uint256[])",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

export const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function mint(address to, uint256 tokenId, uint256 amount) external",
  "function faucet() external",
  "function getTokenName(uint256 tokenId) view returns (string)",
  "function totalSupply(uint256 tokenId) view returns (uint256)",
];

export const FRACTIONAL_WRAPPER_ABI = [
  "function wrap(address nftContract, uint256 tokenId, address[] recipients, uint256[] shares) external returns (uint256 wrapId)",
  "function unwrap(uint256 wrapId, address recipient) external",
  "function wrappedInfo(uint256 wrapId) view returns (address originalContract, uint256 originalTokenId, address wrapperCreator, bool unwrapped)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function BASIS() view returns (uint256)",
];

export const NFT_GOVERNANCE_ABI = [
  "function deposit(address _nftContract, uint256 _tokenId) external",
  "function propose(address _to) external returns (uint256 proposalId)",
  "function approve(uint256 _proposalId) external",
  "function execute(uint256 _proposalId) external",
  "function getInfo() view returns (address nft, uint256 id, bool deposited, uint256 signerCount, uint256 requiredThreshold, uint256 totalProposals)",
  "function isSigner(address) view returns (bool)",
  "function threshold() view returns (uint256)",
];

// Will state enum mapping
export const WILL_STATES = [
  "Created",
  "Active",
  "Owner Inactive",
  "Grace Period",
  "Pending Heir Proof",
  "Disputed",
  "Ready To Execute",
  "Executing",
  "Executed",
  "Cancelled",
];

export const ASSET_TYPES = ["ETH", "ERC-20", "ERC-721", "ERC-1155"];

export const WILL_STATE_COLORS = {
  0: "#6b7280", // Created - gray
  1: "#22c55e", // Active - green
  2: "#f59e0b", // OwnerInactive - amber
  3: "#f97316", // GracePeriod - orange
  4: "#8b5cf6", // PendingHeirProof - purple
  5: "#ef4444", // Disputed - red
  6: "#3b82f6", // ReadyToExecute - blue
  7: "#06b6d4", // Executing - cyan
  8: "#10b981", // Executed - emerald
  9: "#64748b", // Cancelled - slate
};
