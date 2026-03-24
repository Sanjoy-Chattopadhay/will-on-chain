import React, { useState, useEffect, useCallback } from "react";
import { connectWallet, setupWalletListeners, shortenAddress } from "./utils/web3";
import Dashboard from "./pages/Dashboard";
import CreateWill from "./pages/CreateWill";
import ManageWill from "./pages/ManageWill";
import HeartbeatPage from "./pages/HeartbeatPage";
import InheritancePage from "./pages/InheritancePage";
import ClaimsPage from "./pages/ClaimsPage";
import TestTokens from "./pages/TestTokens";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "create", label: "Create Will" },
  { id: "manage", label: "Manage Will" },
  { id: "heartbeat", label: "Heartbeat" },
  { id: "inheritance", label: "Inheritance" },
  { id: "claims", label: "Claims" },
  { id: "tokens", label: "Test Tokens" },
];

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [contractAddress, setContractAddress] = useState(localStorage.getItem("willContractAddress") || "");
  const [addressInput, setAddressInput] = useState(contractAddress);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [error, setError] = useState("");

  const handleConnect = useCallback(async () => {
    try {
      setError("");
      const w = await connectWallet();
      setWallet(w);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    setupWalletListeners(
      (account) => {
        if (!account) setWallet(null);
        else handleConnect();
      },
      () => window.location.reload()
    );
    // Auto-connect if previously connected
    if (window.ethereum?.selectedAddress) handleConnect();
  }, [handleConnect]);

  const handleSetContract = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addressInput)) {
      setError("Invalid contract address. Must be a valid Ethereum address.");
      return;
    }
    setContractAddress(addressInput);
    localStorage.setItem("willContractAddress", addressInput);
    setError("");
  };

  // ── Not connected screen ──
  if (!wallet) {
    return (
      <div className="connect-screen">
        <h1>Crypto Inheritance System</h1>
        <p>
          A fully decentralized blockchain-based will and inheritance system.
          Connect your MetaMask wallet to manage wills, assets, heirs, and
          inheritance execution.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Create Wills</h3>
            <p>Multi-asset, multi-heir support</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💓</div>
            <h3>Heartbeat System</h3>
            <p>Time-based liveness verification</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>ZKP Verification</h3>
            <p>Privacy-preserving age proofs</p>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary btn-lg" onClick={handleConnect}>
          Connect MetaMask
        </button>
      </div>
    );
  }

  // ── No contract address set ──
  if (!contractAddress) {
    return (
      <>
        <header className="header">
          <div className="header-inner">
            <div>
              <div className="header-title">Crypto Inheritance System</div>
              <div className="header-subtitle">Decentralized Will Management</div>
            </div>
            <div className="wallet-info">
              <span className="chain-badge">Chain {wallet.chainId}</span>
              <span className="wallet-address">{shortenAddress(wallet.account)}</span>
            </div>
          </div>
        </header>
        <div className="app-container">
          <div className="setup-panel">
            <h2>Setup: Enter Contract Address</h2>
            <p>
              Deploy <strong>UnifiedWillManager</strong> from Remix IDE with the
              age verifier and liveness verifier addresses, then paste the
              deployed contract address below.
            </p>
            <div className="form-group">
              <label>UnifiedWillManager Contract Address</label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="0x..."
              />
              <div className="form-hint">
                Deploy via Remix: UnifiedWillManager(ageVerifierAddr, livenessVerifierAddr)
              </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-block" onClick={handleSetContract}>
              Save & Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Main Application ──
  const pageProps = {
    wallet,
    contractAddress,
    setError,
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div>
            <div className="header-title">Crypto Inheritance System</div>
            <div className="header-subtitle">
              Contract: {shortenAddress(contractAddress)}
            </div>
          </div>
          <div className="wallet-info">
            <span className="chain-badge">Chain {wallet.chainId}</span>
            <span className="wallet-address">{shortenAddress(wallet.account)}</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setContractAddress("");
                localStorage.removeItem("willContractAddress");
              }}
            >
              Change Contract
            </button>
          </div>
        </div>
      </header>

      <div className="app-container">
        <nav className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
              onClick={() => setError("")}
            >
              ✕
            </button>
          </div>
        )}

        {activeTab === "dashboard" && <Dashboard {...pageProps} />}
        {activeTab === "create" && <CreateWill {...pageProps} />}
        {activeTab === "manage" && <ManageWill {...pageProps} />}
        {activeTab === "heartbeat" && <HeartbeatPage {...pageProps} />}
        {activeTab === "inheritance" && <InheritancePage {...pageProps} />}
        {activeTab === "claims" && <ClaimsPage {...pageProps} />}
        {activeTab === "tokens" && <TestTokens {...pageProps} />}
      </div>
    </>
  );
}
