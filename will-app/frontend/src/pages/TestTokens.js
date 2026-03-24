import React, { useState } from "react";
import { ethers } from "ethers";
import { getERC20Contract, getERC721Contract, getERC1155Contract, formatEther } from "../utils/web3";

export default function TestTokens({ wallet, contractAddress, setError }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ERC20 (TestUSDC)
  const [usdcAddress, setUsdcAddress] = useState(localStorage.getItem("testUsdcAddress") || "");
  const [usdcBalance, setUsdcBalance] = useState(null);

  // ERC721 (CryptoArtNFT)
  const [nftAddress, setNftAddress] = useState(localStorage.getItem("testNftAddress") || "");
  const [nftBalance, setNftBalance] = useState(null);
  const [mintUri, setMintUri] = useState("https://example.com/metadata/1");

  // ERC1155 (GameAssetsNFT)
  const [gameAddress, setGameAddress] = useState(localStorage.getItem("testGameAddress") || "");
  const [gameBalances, setGameBalances] = useState({});

  const saveAddresses = () => {
    if (usdcAddress) localStorage.setItem("testUsdcAddress", usdcAddress);
    if (nftAddress) localStorage.setItem("testNftAddress", nftAddress);
    if (gameAddress) localStorage.setItem("testGameAddress", gameAddress);
    setSuccessMsg("Addresses saved locally!");
  };

  const exec = async (label, fn) => {
    try {
      setSuccessMsg("");
      setTxHash("");
      setLoading(true);
      setError("");
      const tx = await fn();
      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg(`${label} successful!`);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── TestUSDC Functions ──
  const checkUsdcBalance = async () => {
    try {
      const token = getERC20Contract(usdcAddress, wallet.signer);
      const bal = await token.balanceOf(wallet.account);
      const dec = await token.decimals();
      setUsdcBalance(ethers.formatUnits(bal, dec));
    } catch (err) {
      setError(err.message);
    }
  };

  const faucetUsdc = () => exec("USDC faucet", async () => {
    const token = getERC20Contract(usdcAddress, wallet.signer);
    return token.faucet();
  });

  // ── CryptoArtNFT Functions ──
  const checkNftBalance = async () => {
    try {
      const nft = getERC721Contract(nftAddress, wallet.signer);
      const bal = await nft.balanceOf(wallet.account);
      setNftBalance(bal.toString());
    } catch (err) {
      setError(err.message);
    }
  };

  const mintNft = () => exec("Mint NFT", async () => {
    const nft = getERC721Contract(nftAddress, wallet.signer);
    return nft.mint(mintUri);
  });

  // ── GameAssetsNFT Functions ──
  const checkGameBalances = async () => {
    try {
      const game = getERC1155Contract(gameAddress, wallet.signer);
      const ids = [0, 1, 2, 3, 4];
      const names = ["Legendary Sword", "Epic Shield", "Health Potion", "Mana Crystal", "Rare Artifact"];
      const bals = {};
      for (let i = 0; i < ids.length; i++) {
        const bal = await game.balanceOf(wallet.account, ids[i]);
        bals[names[i]] = bal.toString();
      }
      setGameBalances(bals);
    } catch (err) {
      setError(err.message);
    }
  };

  const faucetGame = () => exec("Game assets faucet", async () => {
    const game = getERC1155Contract(gameAddress, wallet.signer);
    return game.faucet();
  });

  return (
    <div>
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {txHash && <div className="alert alert-info tx-hash">TX: {txHash}</div>}

      <div className="alert alert-info mb-3">
        <span>ℹ️</span>
        <span>
          Deploy the test tokens from Remix IDE first (TestUSDC, CryptoArtNFT, GameAssetsNFT),
          then paste their addresses below. These provide faucets for testing the inheritance system.
        </span>
      </div>

      {/* Save Addresses */}
      <div className="card mb-3">
        <h3 className="card-title mb-3">Test Token Addresses</h3>
        <p className="text-sm text-muted mb-3">Enter the addresses of your deployed test token contracts.</p>
        <div className="form-row-3">
          <div className="form-group">
            <label>TestUSDC (ERC-20)</label>
            <input value={usdcAddress} onChange={(e) => setUsdcAddress(e.target.value)} placeholder="0x..." />
          </div>
          <div className="form-group">
            <label>CryptoArtNFT (ERC-721)</label>
            <input value={nftAddress} onChange={(e) => setNftAddress(e.target.value)} placeholder="0x..." />
          </div>
          <div className="form-group">
            <label>GameAssetsNFT (ERC-1155)</label>
            <input value={gameAddress} onChange={(e) => setGameAddress(e.target.value)} placeholder="0x..." />
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveAddresses}>Save Addresses</button>
      </div>

      <div className="card-grid">
        {/* TestUSDC */}
        <div className="card">
          <h3 className="card-title mb-3">TestUSDC (ERC-20)</h3>
          {usdcBalance !== null && (
            <div className="info-item mb-3">
              <div className="info-label">Your Balance</div>
              <div className="info-value highlight">{usdcBalance} USDC</div>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <button className="btn btn-outline btn-sm" onClick={checkUsdcBalance} disabled={!usdcAddress}>Check Balance</button>
            <button className="btn btn-success btn-sm" onClick={faucetUsdc} disabled={loading || !usdcAddress}>
              {loading ? <div className="spinner" /> : "🚰 Faucet (10,000 USDC)"}
            </button>
          </div>
        </div>

        {/* CryptoArtNFT */}
        <div className="card">
          <h3 className="card-title mb-3">CryptoArtNFT (ERC-721)</h3>
          {nftBalance !== null && (
            <div className="info-item mb-3">
              <div className="info-label">Your NFTs</div>
              <div className="info-value highlight">{nftBalance}</div>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <button className="btn btn-outline btn-sm" onClick={checkNftBalance} disabled={!nftAddress}>Check Balance</button>
          </div>
          <div className="form-group">
            <label>Metadata URI</label>
            <input value={mintUri} onChange={(e) => setMintUri(e.target.value)} placeholder="https://..." />
          </div>
          <button className="btn btn-success btn-block" onClick={mintNft} disabled={loading || !nftAddress}>
            {loading ? <div className="spinner" /> : "Mint NFT"}
          </button>
        </div>

        {/* GameAssetsNFT */}
        <div className="card">
          <h3 className="card-title mb-3">GameAssetsNFT (ERC-1155)</h3>
          {Object.keys(gameBalances).length > 0 && (
            <div className="mb-3">
              {Object.entries(gameBalances).map(([name, bal]) => (
                <div key={name} className="flex justify-between items-center" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm">{name}</span>
                  <span className="mono text-sm" style={{ color: "var(--accent-cyan)" }}>{bal}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm" onClick={checkGameBalances} disabled={!gameAddress}>Check Balances</button>
            <button className="btn btn-success btn-sm" onClick={faucetGame} disabled={loading || !gameAddress}>
              {loading ? <div className="spinner" /> : "🚰 Faucet (Starter Pack)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
