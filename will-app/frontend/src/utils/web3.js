import { ethers } from "ethers";
import {
  UNIFIED_WILL_MANAGER_ABI,
  ERC20_ABI,
  ERC721_ABI,
  ERC1155_ABI,
  FRACTIONAL_WRAPPER_ABI,
  NFT_GOVERNANCE_ABI,
} from "../contracts/abis";

// ═══════════════════════════════════════════════════════
// Provider & Signer helpers
// ═══════════════════════════════════════════════════════

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not detected. Please install MetaMask.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  return { provider, signer, account: accounts[0], chainId: Number(network.chainId) };
}

export function getProvider() {
  if (!window.ethereum) throw new Error("MetaMask not detected");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getProvider();
  return provider.getSigner();
}

// ═══════════════════════════════════════════════════════
// Contract Factory helpers
// ═══════════════════════════════════════════════════════

export function getWillContract(address, signerOrProvider) {
  return new ethers.Contract(address, UNIFIED_WILL_MANAGER_ABI, signerOrProvider);
}

export function getERC20Contract(address, signerOrProvider) {
  return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
}

export function getERC721Contract(address, signerOrProvider) {
  return new ethers.Contract(address, ERC721_ABI, signerOrProvider);
}

export function getERC1155Contract(address, signerOrProvider) {
  return new ethers.Contract(address, ERC1155_ABI, signerOrProvider);
}

export function getFractionalWrapperContract(address, signerOrProvider) {
  return new ethers.Contract(address, FRACTIONAL_WRAPPER_ABI, signerOrProvider);
}

export function getNFTGovernanceContract(address, signerOrProvider) {
  return new ethers.Contract(address, NFT_GOVERNANCE_ABI, signerOrProvider);
}

// ═══════════════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════════════

export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatEther(wei) {
  try {
    return ethers.formatEther(wei);
  } catch {
    return "0";
  }
}

export function parseEther(eth) {
  return ethers.parseEther(eth);
}

export function formatTimestamp(ts) {
  if (!ts || ts === 0n || ts === 0) return "N/A";
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString();
}

export function formatDuration(seconds) {
  const s = Number(seconds);
  if (s === 0) return "N/A";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((s % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function bpsToPercent(bps) {
  return (Number(bps) / 100).toFixed(2);
}

// Listen for account/chain changes
export function setupWalletListeners(onAccountChange, onChainChange) {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", (accounts) => {
    onAccountChange(accounts[0] || null);
  });
  window.ethereum.on("chainChanged", () => {
    onChainChange();
  });
}
