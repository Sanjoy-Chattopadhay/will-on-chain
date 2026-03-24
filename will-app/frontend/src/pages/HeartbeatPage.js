import React, { useState, useCallback, useEffect } from "react";
import { getWillContract, formatTimestamp, formatDuration } from "../utils/web3";
import { WILL_STATES, WILL_STATE_COLORS } from "../contracts/abis";

export default function HeartbeatPage({ wallet, contractAddress, setError }) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [wills, setWills] = useState([]);

  // Simple Heartbeat
  const [hbWillId, setHbWillId] = useState("");

  // Delegate
  const [delegateAddr, setDelegateAddr] = useState("");
  const [delegateOwner, setDelegateOwner] = useState("");
  const [delegateWillId, setDelegateWillId] = useState("");

  // DID Heartbeat
  const [didWillId, setDidWillId] = useState("");
  const [didPA, setDidPA] = useState("");
  const [didPB, setDidPB] = useState("");
  const [didPC, setDidPC] = useState("");
  const [didPubSignals, setDidPubSignals] = useState("");

  // Detect Inactivity
  const [detOwner, setDetOwner] = useState("");
  const [detWillId, setDetWillId] = useState("");

  // Start Grace Period
  const [gpOwner, setGpOwner] = useState("");
  const [gpWillId, setGpWillId] = useState("");

  // Finalize Grace Period
  const [fgOwner, setFgOwner] = useState("");
  const [fgWillId, setFgWillId] = useState("");

  // Check Inactivity
  const [checkOwner, setCheckOwner] = useState("");
  const [checkWillId, setCheckWillId] = useState("");
  const [inactiveResult, setInactiveResult] = useState(null);

  const loadWills = useCallback(async () => {
    try {
      const contract = getWillContract(contractAddress, wallet.signer);
      const count = await contract.willCount(wallet.account);
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        try {
          const w = await contract.getWill(wallet.account, i);
          if (Number(w[3]) === 1) { // Active state only
            const now = Math.floor(Date.now() / 1000);
            const lastHb = Number(w[4]);
            const interval = Number(w[5]);
            const timeLeft = (lastHb + interval) - now;
            list.push({ id: i, state: Number(w[3]), lastHeartbeat: w[4], interval: w[5], timeLeft });
          }
        } catch {}
      }
      setWills(list);
    } catch {}
  }, [wallet, contractAddress]);

  useEffect(() => { loadWills(); }, [loadWills]);

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
      loadWills();
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkInactivity = async () => {
    try {
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const result = await contract.isOwnerInactive(checkOwner || wallet.account, checkWillId || "0");
      setInactiveResult(result);
    } catch (err) {
      setError(err.reason || err.message);
    }
  };

  return (
    <div>
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {txHash && <div className="alert alert-info tx-hash">TX: {txHash}</div>}

      {/* Active Wills Heartbeat Status */}
      {wills.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <span className="card-title">Active Wills - Heartbeat Status</span>
            <button className="btn btn-outline btn-sm" onClick={loadWills}>Refresh</button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Will ID</th><th>Last Heartbeat</th><th>Interval</th><th>Time Remaining</th><th>Action</th></tr>
            </thead>
            <tbody>
              {wills.map((w) => (
                <tr key={w.id}>
                  <td>#{w.id}</td>
                  <td>{formatTimestamp(w.lastHeartbeat)}</td>
                  <td>{formatDuration(w.interval)}</td>
                  <td>
                    <span style={{ color: w.timeLeft > 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {w.timeLeft > 0 ? formatDuration(w.timeLeft) : "EXPIRED"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={loading}
                      onClick={() => exec(`Heartbeat Will #${w.id}`, (c) => c.recordHeartbeat(w.id))}
                    >
                      💓 Heartbeat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-grid">
        {/* Simple Heartbeat */}
        <div className="card">
          <h3 className="card-title mb-3">Record Heartbeat</h3>
          <p className="text-sm text-muted mb-3">Simple on-chain heartbeat to prove you are alive.</p>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={hbWillId} onChange={(e) => setHbWillId(e.target.value)} placeholder="0" />
          </div>
          <button className="btn btn-success btn-block" disabled={loading} onClick={() => exec("Heartbeat", (c) => c.recordHeartbeat(hbWillId))}>
            {loading ? <div className="spinner" /> : "💓 Record Heartbeat"}
          </button>
        </div>

        {/* Set Delegate */}
        <div className="card">
          <h3 className="card-title mb-3">Set Heartbeat Delegate</h3>
          <p className="text-sm text-muted mb-3">Allow someone else to record heartbeats on your behalf (e.g., family member).</p>
          <div className="form-group">
            <label>Delegate Address</label>
            <input value={delegateAddr} onChange={(e) => setDelegateAddr(e.target.value)} placeholder="0x..." />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Set delegate", (c) => c.setHeartbeatDelegate(delegateAddr))}>
            {loading ? <div className="spinner" /> : "Set Delegate"}
          </button>
        </div>

        {/* Delegate Heartbeat */}
        <div className="card">
          <h3 className="card-title mb-3">Delegate Heartbeat</h3>
          <p className="text-sm text-muted mb-3">Record heartbeat on behalf of a will owner (must be authorized delegate).</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner Address</label>
              <input value={delegateOwner} onChange={(e) => setDelegateOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={delegateWillId} onChange={(e) => setDelegateWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Delegate heartbeat", (c) => c.recordHeartbeatByDelegate(delegateOwner, delegateWillId))}>
            {loading ? <div className="spinner" /> : "Record as Delegate"}
          </button>
        </div>

        {/* DID-Based Heartbeat */}
        <div className="card">
          <h3 className="card-title mb-3">DID Liveness Heartbeat (ZKP)</h3>
          <p className="text-sm text-muted mb-3">Submit Groth16 proof from iden3/Privado DID credential for stronger liveness verification.</p>
          <div className="form-group">
            <label>Will ID</label>
            <input type="number" value={didWillId} onChange={(e) => setDidWillId(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Proof A (JSON: [a0, a1])</label>
            <input value={didPA} onChange={(e) => setDidPA(e.target.value)} placeholder='["0","0"]' />
          </div>
          <div className="form-group">
            <label>Proof B (JSON: [[b00,b01],[b10,b11]])</label>
            <input value={didPB} onChange={(e) => setDidPB(e.target.value)} placeholder='[["0","0"],["0","0"]]' />
          </div>
          <div className="form-group">
            <label>Proof C (JSON: [c0, c1])</label>
            <input value={didPC} onChange={(e) => setDidPC(e.target.value)} placeholder='["0","0"]' />
          </div>
          <div className="form-group">
            <label>Public Signals (JSON: [isValid, didHash, expDate, nonce, timestamp])</label>
            <input value={didPubSignals} onChange={(e) => setDidPubSignals(e.target.value)} placeholder='["1","123","99999999","1","1234567890"]' />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => {
            try {
              const pA = JSON.parse(didPA);
              const pB = JSON.parse(didPB);
              const pC = JSON.parse(didPC);
              const pub = JSON.parse(didPubSignals);
              exec("DID heartbeat", (c) => c.recordHeartbeatWithDIDProof(didWillId, pA, pB, pC, pub));
            } catch (err) {
              setError("Invalid JSON in proof fields: " + err.message);
            }
          }}>
            {loading ? <div className="spinner" /> : "Submit DID Proof"}
          </button>
        </div>

        {/* Detect Inactivity */}
        <div className="card">
          <h3 className="card-title mb-3">Detect Inactivity</h3>
          <p className="text-sm text-muted mb-3">Trigger OwnerInactive state when heartbeat has expired. Anyone can call this.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={detOwner} onChange={(e) => setDetOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={detWillId} onChange={(e) => setDetWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-warning btn-block" disabled={loading} onClick={() => exec("Detect inactivity", (c) => c.detectInactivity(detOwner, detWillId))}>
            {loading ? <div className="spinner" /> : "Detect Inactivity"}
          </button>
        </div>

        {/* Start Grace Period */}
        <div className="card">
          <h3 className="card-title mb-3">Start Grace Period</h3>
          <p className="text-sm text-muted mb-3">After confirmation delay (30 days from inactivity). Anyone can call.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={gpOwner} onChange={(e) => setGpOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={gpWillId} onChange={(e) => setGpWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-warning btn-block" disabled={loading} onClick={() => exec("Start grace period", (c) => c.startGracePeriod(gpOwner, gpWillId))}>
            {loading ? <div className="spinner" /> : "Start Grace Period"}
          </button>
        </div>

        {/* Finalize Grace Period */}
        <div className="card">
          <h3 className="card-title mb-3">Finalize Grace Period</h3>
          <p className="text-sm text-muted mb-3">After grace period (90 days). Only registered heirs can call.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Will Owner</label>
              <input value={fgOwner} onChange={(e) => setFgOwner(e.target.value)} placeholder="0x..." />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={fgWillId} onChange={(e) => setFgWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} onClick={() => exec("Finalize grace", (c) => c.finalizeGracePeriod(fgOwner, fgWillId))}>
            {loading ? <div className="spinner" /> : "Finalize Grace Period"}
          </button>
        </div>

        {/* Check Inactivity */}
        <div className="card">
          <h3 className="card-title mb-3">Check Inactivity Status</h3>
          <p className="text-sm text-muted mb-3">Read-only check if an owner's heartbeat has expired.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Owner Address</label>
              <input value={checkOwner} onChange={(e) => setCheckOwner(e.target.value)} placeholder={wallet.account} />
            </div>
            <div className="form-group">
              <label>Will ID</label>
              <input type="number" value={checkWillId} onChange={(e) => setCheckWillId(e.target.value)} placeholder="0" />
            </div>
          </div>
          <button className="btn btn-outline btn-block" onClick={checkInactivity}>
            Check Status
          </button>
          {inactiveResult !== null && (
            <div className={`alert mt-3 ${inactiveResult ? "alert-error" : "alert-success"}`}>
              {inactiveResult ? "⚠️ Owner is INACTIVE (heartbeat expired)" : "✅ Owner is ACTIVE"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
