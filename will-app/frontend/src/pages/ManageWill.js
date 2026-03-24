import React, { useState } from "react";
import { ethers } from "ethers";
import { getWillContract } from "../utils/web3";

export default function ManageWill({ wallet, contractAddress, setError }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Cancel Will
  const [cancelWillId, setCancelWillId] = useState("");

  // Set Fallback
  const [fbWillId, setFbWillId] = useState("");
  const [fbAddress, setFbAddress] = useState("");

  // Set Heartbeat Interval
  const [hbWillId, setHbWillId] = useState("");
  const [hbInterval, setHbInterval] = useState("");

  // Register DID
  const [didWillId, setDidWillId] = useState("");
  const [didHash, setDidHash] = useState("");

  // Recover Will
  const [recoverWillId, setRecoverWillId] = useState("");

  // Dispute
  const [disputeOwner, setDisputeOwner] = useState("");
  const [disputeWillId, setDisputeWillId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeBondEth, setDisputeBondEth] = useState("0.1");

  // Resolve Dispute
  const [resolveWillId, setResolveWillId] = useState("");
  const [resolveDisputeId, setResolveDisputeId] = useState("");

  // Resolve Expired Dispute
  const [expOwner, setExpOwner] = useState("");
  const [expWillId, setExpWillId] = useState("");
  const [expDisputeId, setExpDisputeId] = useState("");

  // Heir Rotation
  const [rotOwner, setRotOwner] = useState("");
  const [rotWillId, setRotWillId] = useState("");
  const [rotHeirIndex, setRotHeirIndex] = useState("");
  const [rotNewAddress, setRotNewAddress] = useState("");
  const [rotDeadline, setRotDeadline] = useState("");
  const [rotSignature, setRotSignature] = useState("");

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
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {txHash && <div className="alert alert-info tx-hash">TX: {txHash}</div>}

      <div className="card-grid">
        {/* Cancel Will */}
        <div className="card">
          <h3 className="card-title mb-3">Cancel Will</h3>
          <p className="text-sm text-muted mb-3">Cancel a will and reclaim all deposited assets. Works in Created, Active, OwnerInactive, or GracePeriod states.</p>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={cancelWillId} onChange={(e) => setCancelWillId(e.target.value)} placeholder="0" />
          </div>
          <button className="btn btn-danger btn-block" disabled={loading} onClick={() => exec("Cancel will", (c) => c.cancelWill(cancelWillId))}>
            {loading ? <div className="spinner" /> : "Cancel Will"}
          </button>
        </div>

        {/* Recover Will */}
        <div className="card">
          <h3 className="card-title mb-3">Recover Will</h3>
          <p className="text-sm text-muted mb-3">Owner recovery from OwnerInactive or GracePeriod state. Proves you are alive and resets heartbeat.</p>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={recoverWillId} onChange={(e) => setRecoverWillId(e.target.value)} placeholder="0" />
          </div>
          <button className="btn btn-success btn-block" disabled={loading} onClick={() => exec("Recover will", (c) => c.recoverWill(recoverWillId))}>
            {loading ? <div className="spinner" /> : "Recover Will"}
          </button>
        </div>

        {/* Set Fallback Beneficiary */}
        <div className="card">
          <h3 className="card-title mb-3">Set Fallback Beneficiary</h3>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={fbWillId} onChange={(e) => setFbWillId(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Beneficiary Address</label>
            <input value={fbAddress} onChange={(e) => setFbAddress(e.target.value)} placeholder="0x..." />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Set fallback", (c) => c.setFallbackBeneficiary(fbWillId, fbAddress))}>
            {loading ? <div className="spinner" /> : "Update Fallback"}
          </button>
        </div>

        {/* Set Heartbeat Interval */}
        <div className="card">
          <h3 className="card-title mb-3">Set Heartbeat Interval</h3>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={hbWillId} onChange={(e) => setHbWillId(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Interval (days)</label>
            <input type="number" value={hbInterval} onChange={(e) => setHbInterval(e.target.value)} placeholder="30" min="7" max="365" />
            <div className="form-hint">Min 7 days, Max 365 days</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => {
            const seconds = parseInt(hbInterval) * 86400;
            exec("Set interval", (c) => c.setHeartbeatInterval(hbWillId, seconds));
          }}>
            {loading ? <div className="spinner" /> : "Update Interval"}
          </button>
        </div>

        {/* Register DID */}
        <div className="card">
          <h3 className="card-title mb-3">Register DID</h3>
          <p className="text-sm text-muted mb-3">Link your iden3/Privado DID to a will for ZKP-based liveness proofs.</p>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={didWillId} onChange={(e) => setDidWillId(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>DID Hash</label>
            <input value={didHash} onChange={(e) => setDidHash(e.target.value)} placeholder="SHA-256 hash mod BN128" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Register DID", (c) => c.registerDID(didWillId, didHash))}>
            {loading ? <div className="spinner" /> : "Register DID"}
          </button>
        </div>

        {/* Dispute */}
        <div className="card">
          <h3 className="card-title mb-3">Raise Dispute</h3>
          <p className="text-sm text-muted mb-3">Post a bond to dispute a will execution. Requires 0.1 ETH bond.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner Address</label>
              <input value={disputeOwner} onChange={(e) => setDisputeOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={disputeWillId} onChange={(e) => setDisputeWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Reason</label>
            <input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Reason for dispute..." />
          </div>
          <div className="form-group">
            <label>Bond Amount (ETH)</label>
            <input type="text" value={disputeBondEth} onChange={(e) => setDisputeBondEth(e.target.value)} placeholder="0.1" />
          </div>
          <button className="btn btn-warning btn-block" disabled={loading} onClick={() =>
            exec("Dispute", (c) => c.disputeExecution(disputeOwner, disputeWillId, disputeReason, { value: ethers.parseEther(disputeBondEth) }))
          }>
            {loading ? <div className="spinner" /> : "Submit Dispute"}
          </button>
        </div>

        {/* Resolve Dispute as Owner */}
        <div className="card">
          <h3 className="card-title mb-3">Resolve Dispute (Owner)</h3>
          <p className="text-sm text-muted mb-3">Owner resolves dispute by proving alive. Bond goes to owner.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={resolveWillId} onChange={(e) => setResolveWillId(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Dispute ID</label>
              <input type="number" value={resolveDisputeId} onChange={(e) => setResolveDisputeId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-success btn-block" disabled={loading} onClick={() => exec("Resolve dispute", (c) => c.resolveDisputeAsOwner(resolveWillId, resolveDisputeId))}>
            {loading ? <div className="spinner" /> : "Resolve as Owner"}
          </button>
        </div>

        {/* Resolve Expired Dispute */}
        <div className="card">
          <h3 className="card-title mb-3">Resolve Expired Dispute</h3>
          <p className="text-sm text-muted mb-3">If owner fails to respond within deadline, anyone can resolve. Bond returns to challenger.</p>
          <div className="form-row-3">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={expOwner} onChange={(e) => setExpOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={expWillId} onChange={(e) => setExpWillId(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Dispute ID</label>
              <input type="number" value={expDisputeId} onChange={(e) => setExpDisputeId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Resolve expired", (c) => c.resolveExpiredDispute(expOwner, expWillId, expDisputeId))}>
            {loading ? <div className="spinner" /> : "Resolve Expired Dispute"}
          </button>
        </div>

        {/* Heir Address Rotation */}
        <div className="card">
          <h3 className="card-title mb-3">Rotate Heir Address (EIP-712)</h3>
          <p className="text-sm text-muted mb-3">Update an heir's receiving address with their EIP-712 signature.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={rotOwner} onChange={(e) => setRotOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={rotWillId} onChange={(e) => setRotWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>Heir Index</label>
              <input type="number" value={rotHeirIndex} onChange={(e) => setRotHeirIndex(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>New Address</label>
              <input value={rotNewAddress} onChange={(e) => setRotNewAddress(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Deadline (unix timestamp)</label>
              <input type="number" value={rotDeadline} onChange={(e) => setRotDeadline(e.target.value)} placeholder={Math.floor(Date.now()/1000) + 86400} />
            </div>
          </div>
          <div className="form-group">
            <label>Heir Signature (hex)</label>
            <input value={rotSignature} onChange={(e) => setRotSignature(e.target.value)} placeholder="0x..." />
            <div className="form-hint">EIP-712 signature from the current heir authorizing the rotation</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() =>
            exec("Rotate heir", (c) => c.rotateHeirAddress(rotOwner, rotWillId, rotHeirIndex, rotNewAddress, rotDeadline, rotSignature))
          }>
            {loading ? <div className="spinner" /> : "Rotate Heir Address"}
          </button>
        </div>
      </div>
    </div>
  );
}
