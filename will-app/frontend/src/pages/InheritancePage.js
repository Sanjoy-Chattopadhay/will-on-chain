import React, { useState } from "react";
import { getWillContract } from "../utils/web3";

export default function InheritancePage({ wallet, contractAddress, setError }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Verify Heir Age
  const [verifyOwner, setVerifyOwner] = useState("");
  const [verifyWillId, setVerifyWillId] = useState("");
  const [verifyHeirIndex, setVerifyHeirIndex] = useState("");
  const [verifyPA, setVerifyPA] = useState("");
  const [verifyPB, setVerifyPB] = useState("");
  const [verifyPC, setVerifyPC] = useState("");
  const [verifyPubSignals, setVerifyPubSignals] = useState("");

  // Execute Batch
  const [execOwner, setExecOwner] = useState("");
  const [execWillId, setExecWillId] = useState("");
  const [execBatchSize, setExecBatchSize] = useState("10");

  // Reset Expired Heir Proof
  const [resetOwner, setResetOwner] = useState("");
  const [resetWillId, setResetWillId] = useState("");

  // Rescue Stuck NFT
  const [rescueOwner, setRescueOwner] = useState("");
  const [rescueWillId, setRescueWillId] = useState("");
  const [rescueAssetIdx, setRescueAssetIdx] = useState("");
  const [rescueReceiver, setRescueReceiver] = useState("");

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

      <div className="alert alert-info mb-3">
        <span>ℹ️</span>
        <span>
          <strong>Inheritance Flow:</strong> After grace period finalization, the will enters PendingHeirProof state.
          Each heir must submit a ZKP age proof. Once all heirs are verified, the will becomes ReadyToExecute.
          Then anyone can call batch execution to distribute assets.
        </span>
      </div>

      <div className="card-grid">
        {/* Verify Heir Age */}
        <div className="card">
          <h3 className="card-title mb-3">Verify Heir Age (ZKP)</h3>
          <p className="text-sm text-muted mb-3">
            Submit Groth16 proof to verify heir's age. Only the heir themselves can call this.
            Public signals: [willId, minimumAge, currentYear, commitment]
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner Address</label>
              <input value={verifyOwner} onChange={(e) => setVerifyOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={verifyWillId} onChange={(e) => setVerifyWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Heir Index</label>
            <input type="number" value={verifyHeirIndex} onChange={(e) => setVerifyHeirIndex(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Proof A (JSON array)</label>
            <input value={verifyPA} onChange={(e) => setVerifyPA(e.target.value)} placeholder='["0","0"]' />
          </div>
          <div className="form-group">
            <label>Proof B (JSON nested array)</label>
            <input value={verifyPB} onChange={(e) => setVerifyPB(e.target.value)} placeholder='[["0","0"],["0","0"]]' />
          </div>
          <div className="form-group">
            <label>Proof C (JSON array)</label>
            <input value={verifyPC} onChange={(e) => setVerifyPC(e.target.value)} placeholder='["0","0"]' />
          </div>
          <div className="form-group">
            <label>Public Signals (JSON: [willId, minAge, year, commitment])</label>
            <input value={verifyPubSignals} onChange={(e) => setVerifyPubSignals(e.target.value)} placeholder='["0","18","2026","12345"]' />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => {
            try {
              const pA = JSON.parse(verifyPA);
              const pB = JSON.parse(verifyPB);
              const pC = JSON.parse(verifyPC);
              const pub = JSON.parse(verifyPubSignals);
              exec("Age verification", (c) => c.verifyHeirAge(verifyOwner, verifyWillId, verifyHeirIndex, pA, pB, pC, pub));
            } catch (err) {
              setError("Invalid JSON in proof fields: " + err.message);
            }
          }}>
            {loading ? <><div className="spinner" /> Verifying...</> : "Submit Age Proof"}
          </button>
        </div>

        {/* Execute Inheritance Batch */}
        <div className="card">
          <h3 className="card-title mb-3">Execute Inheritance (Batch)</h3>
          <p className="text-sm text-muted mb-3">
            Execute inheritance distribution in batches of up to 10 heirs.
            First batch allocates divisible assets via auto-push.
            Subsequent batches transfer indivisible NFTs.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner Address</label>
              <input value={execOwner} onChange={(e) => setExecOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={execWillId} onChange={(e) => setExecWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Batch Size (max 10)</label>
            <input type="number" value={execBatchSize} onChange={(e) => setExecBatchSize(e.target.value)} placeholder="10" min="1" max="10" />
          </div>
          <button className="btn btn-success btn-block btn-lg" disabled={loading} onClick={() =>
            exec("Inheritance execution", (c) => c.executeInheritanceBatch(execOwner, execWillId, execBatchSize))
          }>
            {loading ? <><div className="spinner" /> Executing...</> : "Execute Inheritance"}
          </button>
        </div>

        {/* Reset Expired Heir Proof */}
        <div className="card">
          <h3 className="card-title mb-3">Reset Expired Heir Proof</h3>
          <p className="text-sm text-muted mb-3">
            If heirs fail to submit age proofs within the deadline (180 days),
            reset the will back to GracePeriod. Anyone can call this.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={resetOwner} onChange={(e) => setResetOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={resetWillId} onChange={(e) => setResetWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-warning btn-block" disabled={loading} onClick={() =>
            exec("Reset heir proof", (c) => c.resetExpiredHeirProof(resetOwner, resetWillId))
          }>
            {loading ? <div className="spinner" /> : "Reset Expired Proof"}
          </button>
        </div>

        {/* Rescue Stuck NFT */}
        <div className="card">
          <h3 className="card-title mb-3">Rescue Stuck NFT</h3>
          <p className="text-sm text-muted mb-3">
            If an NFT transfer failed during execution (heir address rejected it),
            the designated heir can retry to a different receiver.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={rescueOwner} onChange={(e) => setRescueOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={rescueWillId} onChange={(e) => setRescueWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Asset Index</label>
              <input type="number" value={rescueAssetIdx} onChange={(e) => setRescueAssetIdx(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>New Receiver Address</label>
              <input value={rescueReceiver} onChange={(e) => setRescueReceiver(e.target.value)} placeholder="0x..." />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() =>
            exec("Rescue NFT", (c) => c.rescueStuckNFT(rescueOwner, rescueWillId, rescueAssetIdx, rescueReceiver))
          }>
            {loading ? <div className="spinner" /> : "Rescue NFT"}
          </button>
        </div>
      </div>
    </div>
  );
}
