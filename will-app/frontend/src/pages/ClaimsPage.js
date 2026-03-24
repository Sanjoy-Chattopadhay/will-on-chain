import React, { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { getWillContract, formatEther } from "../utils/web3";

export default function ClaimsPage({ wallet, contractAddress, setError }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pending balances
  const [pendingEth, setPendingEth] = useState("0");
  const [erc20CheckToken, setErc20CheckToken] = useState("");
  const [pendingErc20, setPendingErc20] = useState(null);
  const [erc1155CheckToken, setErc1155CheckToken] = useState("");
  const [erc1155CheckId, setErc1155CheckId] = useState("");
  const [pendingErc1155, setPendingErc1155] = useState(null);

  // Claim ERC20
  const [claimErc20Token, setClaimErc20Token] = useState("");

  // Claim ERC1155
  const [claimErc1155Token, setClaimErc1155Token] = useState("");
  const [claimErc1155Id, setClaimErc1155Id] = useState("");

  // Sweep
  const [sweepOwner, setSweepOwner] = useState("");
  const [sweepWillId, setSweepWillId] = useState("");
  const [sweepErc20Token, setSweepErc20Token] = useState("");
  const [sweepErc1155Token, setSweepErc1155Token] = useState("");
  const [sweepErc1155Id, setSweepErc1155Id] = useState("");

  const loadPendingETH = useCallback(async () => {
    try {
      const contract = getWillContract(contractAddress, wallet.signer);
      const amount = await contract.pendingETH(wallet.account);
      setPendingEth(amount.toString());
    } catch {}
  }, [wallet, contractAddress]);

  useEffect(() => { loadPendingETH(); }, [loadPendingETH]);

  const exec = async (label, fn) => {
    try {
      setSuccessMsg("");
      setTxHash("");
      setLoading(true);
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const tx = await fn(contract);
      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg(`${label} successful!`);
      loadPendingETH();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingERC20 = async () => {
    try {
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const amount = await contract.pendingERC20(wallet.account, erc20CheckToken);
      setPendingErc20(amount.toString());
    } catch (err) {
      setError(err.reason || err.message);
    }
  };

  const checkPendingERC1155 = async () => {
    try {
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const amount = await contract.pendingERC1155(wallet.account, erc1155CheckToken, erc1155CheckId);
      setPendingErc1155(amount.toString());
    } catch (err) {
      setError(err.reason || err.message);
    }
  };

  return (
    <div>
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {txHash && <div className="alert alert-info tx-hash">TX: {txHash}</div>}

      {/* Pending Balances Overview */}
      <div className="card mb-3">
        <div className="card-header">
          <span className="card-title">Your Pending Claims</span>
          <button className="btn btn-outline btn-sm" onClick={loadPendingETH}>Refresh</button>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Pending ETH</div>
            <div className="info-value highlight">{formatEther(pendingEth)} ETH</div>
          </div>
        </div>
      </div>

      <div className="card-grid">
        {/* Claim ETH */}
        <div className="card">
          <h3 className="card-title mb-3">Claim ETH</h3>
          <p className="text-sm text-muted mb-3">Withdraw ETH allocated to you (if auto-push failed during execution).</p>
          <div className="info-item mb-3">
            <div className="info-label">Available</div>
            <div className="info-value highlight">{formatEther(pendingEth)} ETH</div>
          </div>
          <button className="btn btn-success btn-block" disabled={loading || pendingEth === "0"} onClick={() => exec("Claim ETH", (c) => c.claimETH())}>
            {loading ? <div className="spinner" /> : "Claim ETH"}
          </button>
        </div>

        {/* Claim ERC20 */}
        <div className="card">
          <h3 className="card-title mb-3">Claim ERC-20 Tokens</h3>
          <p className="text-sm text-muted mb-3">Check and claim ERC-20 tokens allocated to you.</p>
          <div className="form-group">
            <label>Token Contract Address</label>
            <input value={erc20CheckToken} onChange={(e) => setErc20CheckToken(e.target.value)} placeholder="0x..." />
          </div>
          <button className="btn btn-outline btn-block mb-2" onClick={checkPendingERC20} disabled={!erc20CheckToken}>
            Check Balance
          </button>
          {pendingErc20 !== null && (
            <div className="alert alert-info">
              Pending: {pendingErc20} tokens (raw units)
            </div>
          )}
          <div className="form-group mt-3">
            <label>Token to Claim</label>
            <input value={claimErc20Token} onChange={(e) => setClaimErc20Token(e.target.value)} placeholder="0x..." />
          </div>
          <button className="btn btn-success btn-block" disabled={loading || !claimErc20Token} onClick={() => exec("Claim ERC20", (c) => c.claimERC20(claimErc20Token))}>
            {loading ? <div className="spinner" /> : "Claim ERC-20"}
          </button>
        </div>

        {/* Claim ERC1155 */}
        <div className="card">
          <h3 className="card-title mb-3">Claim ERC-1155 Tokens</h3>
          <p className="text-sm text-muted mb-3">Check and claim ERC-1155 tokens allocated to you.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Token Contract</label>
              <input value={erc1155CheckToken} onChange={(e) => setErc1155CheckToken(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Token ID</label>
              <input type="number" value={erc1155CheckId} onChange={(e) => setErc1155CheckId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-outline btn-block mb-2" onClick={checkPendingERC1155} disabled={!erc1155CheckToken}>
            Check Balance
          </button>
          {pendingErc1155 !== null && (
            <div className="alert alert-info">
              Pending: {pendingErc1155} tokens
            </div>
          )}
          <div className="form-row mt-3">
            <div className="form-group">
              <label>Token to Claim</label>
              <input value={claimErc1155Token} onChange={(e) => setClaimErc1155Token(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Token ID</label>
              <input type="number" value={claimErc1155Id} onChange={(e) => setClaimErc1155Id(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-success btn-block" disabled={loading || !claimErc1155Token} onClick={() =>
            exec("Claim ERC1155", (c) => c.claimERC1155(claimErc1155Token, claimErc1155Id))
          }>
            {loading ? <div className="spinner" /> : "Claim ERC-1155"}
          </button>
        </div>

        {/* Sweep Unclaimed ETH */}
        <div className="card">
          <h3 className="card-title mb-3">Sweep Unclaimed ETH</h3>
          <p className="text-sm text-muted mb-3">After 365 days from execution, sweep unclaimed ETH to fallback beneficiary. Anyone can call.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={sweepOwner} onChange={(e) => setSweepOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={sweepWillId} onChange={(e) => setSweepWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() =>
            exec("Sweep ETH", (c) => c.sweepUnclaimedETH(sweepOwner, sweepWillId))
          }>
            {loading ? <div className="spinner" /> : "Sweep ETH"}
          </button>
        </div>

        {/* Sweep Unclaimed ERC20 */}
        <div className="card">
          <h3 className="card-title mb-3">Sweep Unclaimed ERC-20</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={sweepOwner} onChange={(e) => setSweepOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={sweepWillId} onChange={(e) => setSweepWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Token Contract</label>
            <input value={sweepErc20Token} onChange={(e) => setSweepErc20Token(e.target.value)} placeholder="0x..." />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() =>
            exec("Sweep ERC20", (c) => c.sweepUnclaimedERC20(sweepOwner, sweepWillId, sweepErc20Token))
          }>
            {loading ? <div className="spinner" /> : "Sweep ERC-20"}
          </button>
        </div>

        {/* Sweep Unclaimed ERC1155 */}
        <div className="card">
          <h3 className="card-title mb-3">Sweep Unclaimed ERC-1155</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={sweepOwner} onChange={(e) => setSweepOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={sweepWillId} onChange={(e) => setSweepWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Token Contract</label>
              <input value={sweepErc1155Token} onChange={(e) => setSweepErc1155Token(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Token ID</label>
              <input type="number" value={sweepErc1155Id} onChange={(e) => setSweepErc1155Id(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() =>
            exec("Sweep ERC1155", (c) => c.sweepUnclaimedERC1155(sweepOwner, sweepWillId, sweepErc1155Token, sweepErc1155Id))
          }>
            {loading ? <div className="spinner" /> : "Sweep ERC-1155"}
          </button>
        </div>
      </div>
    </div>
  );
}
