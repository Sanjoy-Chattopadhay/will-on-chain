import React, { useState, useEffect, useCallback } from "react";
import { getWillContract, formatTimestamp, formatDuration, formatEther } from "../utils/web3";
import { WILL_STATES, ASSET_TYPES, WILL_STATE_COLORS } from "../contracts/abis";

export default function Dashboard({ wallet, contractAddress }) {
  const [wills, setWills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWill, setSelectedWill] = useState(null);
  const [willDetails, setWillDetails] = useState(null);
  const [assets, setAssets] = useState([]);
  const [heirs, setHeirs] = useState([]);
  const [constants, setConstants] = useState({});

  const loadWills = useCallback(async () => {
    try {
      setLoading(true);
      const contract = getWillContract(contractAddress, wallet.signer);
      const count = await contract.willCount(wallet.account);
      const willList = [];
      for (let i = 0; i < Number(count); i++) {
        try {
          const w = await contract.getWill(wallet.account, i);
          willList.push({
            id: i,
            owner: w[0],
            assetCount: Number(w[1]),
            heirCount: Number(w[2]),
            state: Number(w[3]),
            lastHeartbeat: w[4],
            heartbeatInterval: w[5],
          });
        } catch { /* skip invalid */ }
      }
      setWills(willList);

      // Load constants
      try {
        const [hbi, icd, gpd, dp, db, hpd, uad] = await Promise.all([
          contract.DEFAULT_HEARTBEAT_INTERVAL(),
          contract.INACTIVITY_CONFIRMATION_DELAY(),
          contract.GRACE_PERIOD_DURATION(),
          contract.DISPUTE_PERIOD(),
          contract.DISPUTE_BOND(),
          contract.HEIR_PROOF_DEADLINE(),
          contract.UNCLAIMED_ASSET_DEADLINE(),
        ]);
        setConstants({
          heartbeatInterval: hbi,
          confirmationDelay: icd,
          gracePeriod: gpd,
          disputePeriod: dp,
          disputeBond: db,
          heirProofDeadline: hpd,
          unclaimedDeadline: uad,
        });
      } catch {}
    } catch (err) {
      console.error("Load wills error:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet, contractAddress]);

  useEffect(() => { loadWills(); }, [loadWills]);

  const loadWillDetails = useCallback(async (willId) => {
    try {
      const contract = getWillContract(contractAddress, wallet.signer);
      const [details, willInfo] = await Promise.all([
        contract.getWillDetails(wallet.account, willId),
        contract.getWill(wallet.account, willId),
      ]);

      setWillDetails({
        ownerDidHash: details[0],
        inactivityDetectedAt: details[1],
        gracePeriodStartedAt: details[2],
        fallbackBeneficiary: details[3],
        heirProofDeadline: details[4],
        verifiedHeirsCount: Number(details[5]),
      });

      // Load assets
      const assetCount = Number(willInfo[1]);
      const assetList = [];
      for (let i = 0; i < assetCount; i++) {
        try {
          const a = await contract.getAsset(wallet.account, willId, i);
          assetList.push({
            index: i,
            assetType: Number(a.assetType),
            tokenContract: a.tokenContract,
            tokenId: a.tokenId,
            amount: a.amount,
            specificHeir: a.specificHeir,
          });
        } catch {}
      }
      setAssets(assetList);

      // Load heirs
      const heirCount = Number(willInfo[2]);
      const heirList = [];
      for (let i = 0; i < heirCount; i++) {
        try {
          const h = await contract.getHeir(wallet.account, willId, i);
          heirList.push({
            index: i,
            heirAddress: h.heirAddress,
            sharePercentage: Number(h.sharePercentage),
            birthdateCommitment: h.birthdateCommitment,
            minimumAge: Number(h.minimumAge),
            ageVerified: h.ageVerified,
            vestingPeriod: h.vestingPeriod,
            vestingUnlock: h.vestingUnlock,
          });
        } catch {}
      }
      setHeirs(heirList);
    } catch (err) {
      console.error("Load will details error:", err);
    }
  }, [wallet, contractAddress]);

  useEffect(() => {
    if (selectedWill !== null) loadWillDetails(selectedWill);
  }, [selectedWill, loadWillDetails]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Loading your wills...</span>
      </div>
    );
  }

  return (
    <div>
      {/* System Constants */}
      {Object.keys(constants).length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <span className="card-title">System Constants</span>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Heartbeat Interval</div>
              <div className="info-value">{formatDuration(constants.heartbeatInterval)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Confirmation Delay</div>
              <div className="info-value">{formatDuration(constants.confirmationDelay)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Grace Period</div>
              <div className="info-value">{formatDuration(constants.gracePeriod)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Dispute Period</div>
              <div className="info-value">{formatDuration(constants.disputePeriod)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Dispute Bond</div>
              <div className="info-value">{formatEther(constants.disputeBond)} ETH</div>
            </div>
            <div className="info-item">
              <div className="info-label">Heir Proof Deadline</div>
              <div className="info-value">{formatDuration(constants.heirProofDeadline)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Will List */}
      <div className="page-section">
        <h2>
          Your Wills
          <button className="btn btn-outline btn-sm" onClick={loadWills}>Refresh</button>
        </h2>

        {wills.length === 0 ? (
          <div className="empty-state">
            <h3>No Wills Found</h3>
            <p>Create your first will using the "Create Will" tab.</p>
          </div>
        ) : (
          <div className="card-grid">
            {wills.map((w) => (
              <div
                key={w.id}
                className={`card will-card ${selectedWill === w.id ? "active" : ""}`}
                style={{ borderLeft: `4px solid ${WILL_STATE_COLORS[w.state]}` }}
                onClick={() => setSelectedWill(selectedWill === w.id ? null : w.id)}
              >
                <div className="card-header">
                  <span className="card-title">Will #{w.id}</span>
                  <span
                    className="badge badge-state"
                    style={{
                      background: `${WILL_STATE_COLORS[w.state]}20`,
                      color: WILL_STATE_COLORS[w.state],
                      border: `1px solid ${WILL_STATE_COLORS[w.state]}40`,
                    }}
                  >
                    {WILL_STATES[w.state]}
                  </span>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Assets</div>
                    <div className="info-value">{w.assetCount}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Heirs</div>
                    <div className="info-value">{w.heirCount}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Last Heartbeat</div>
                    <div className="info-value text-sm">{formatTimestamp(w.lastHeartbeat)}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Interval</div>
                    <div className="info-value">{formatDuration(w.heartbeatInterval)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Will Details */}
      {selectedWill !== null && willDetails && (
        <div className="page-section">
          <h2>Will #{selectedWill} Details</h2>

          {/* State Flow */}
          <div className="card">
            <div className="card-title mb-3">State Machine</div>
            <div className="state-flow">
              {WILL_STATES.map((state, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="state-arrow">→</span>}
                  <span
                    className={`state-node ${wills.find(w => w.id === selectedWill)?.state === idx ? "current" : ""}`}
                    style={{
                      background: `${WILL_STATE_COLORS[idx]}20`,
                      color: WILL_STATE_COLORS[idx],
                      borderColor: wills.find(w => w.id === selectedWill)?.state === idx
                        ? WILL_STATE_COLORS[idx]
                        : "transparent",
                    }}
                  >
                    {state}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Extended Details */}
          <div className="card">
            <div className="card-title mb-3">Extended Information</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">DID Hash</div>
                <div className="info-value text-sm">
                  {willDetails.ownerDidHash.toString() === "0" ? "None" : willDetails.ownerDidHash.toString()}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Fallback Beneficiary</div>
                <div className="info-value text-sm">{willDetails.fallbackBeneficiary}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Inactivity Detected</div>
                <div className="info-value text-sm">{formatTimestamp(willDetails.inactivityDetectedAt)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Grace Period Started</div>
                <div className="info-value text-sm">{formatTimestamp(willDetails.gracePeriodStartedAt)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Heir Proof Deadline</div>
                <div className="info-value text-sm">{formatTimestamp(willDetails.heirProofDeadline)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Verified Heirs</div>
                <div className="info-value">{willDetails.verifiedHeirsCount} / {heirs.length}</div>
              </div>
            </div>
          </div>

          {/* Assets Table */}
          <div className="card">
            <div className="card-title mb-3">Assets ({assets.length})</div>
            {assets.length === 0 ? (
              <div className="text-muted text-sm">No assets deposited</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Contract</th>
                    <th>Token ID</th>
                    <th>Amount</th>
                    <th>Specific Heir</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.index}>
                      <td>{a.index}</td>
                      <td>
                        <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
                          {ASSET_TYPES[a.assetType]}
                        </span>
                      </td>
                      <td>{a.assetType === 0 ? "Native ETH" : `${a.tokenContract.slice(0,8)}...${a.tokenContract.slice(-4)}`}</td>
                      <td>{a.assetType >= 2 ? a.tokenId.toString() : "-"}</td>
                      <td>{a.assetType === 0 ? `${formatEther(a.amount)} ETH` : a.amount.toString()}</td>
                      <td>{a.specificHeir === "0x0000000000000000000000000000000000000000" ? "Divisible" : `${a.specificHeir.slice(0,8)}...`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Heirs Table */}
          <div className="card">
            <div className="card-title mb-3">Heirs ({heirs.length})</div>
            {heirs.length === 0 ? (
              <div className="text-muted text-sm">No heirs added</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>Share %</th>
                    <th>Min Age</th>
                    <th>Age Verified</th>
                    <th>Vesting</th>
                  </tr>
                </thead>
                <tbody>
                  {heirs.map((h) => (
                    <tr key={h.index}>
                      <td>{h.index}</td>
                      <td>{`${h.heirAddress.slice(0,8)}...${h.heirAddress.slice(-4)}`}</td>
                      <td>{(h.sharePercentage / 100).toFixed(2)}%</td>
                      <td>{h.minimumAge}</td>
                      <td>
                        <span style={{ color: h.ageVerified ? "#22c55e" : "#f59e0b" }}>
                          {h.ageVerified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td>{formatDuration(h.vestingPeriod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
