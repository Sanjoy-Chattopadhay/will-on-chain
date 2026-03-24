import React, { useState } from "react";
import { ethers } from "ethers";
import { getWillContract, getERC20Contract, getERC721Contract, getERC1155Contract, formatEther } from "../utils/web3";

export default function CreateWill({ wallet, contractAddress, setError }) {
  const [step, setStep] = useState(1); // 1=create, 2=add heirs, 3=add assets, 4=activate
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [willId, setWillId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1: Create Will
  const [didHash, setDidHash] = useState("0");
  const [fallbackBeneficiary, setFallbackBeneficiary] = useState("");

  // Step 2: Add Heirs
  const [heirAddress, setHeirAddress] = useState("");
  const [sharePercentage, setSharePercentage] = useState("");
  const [birthdateCommitment, setBirthdateCommitment] = useState("0");
  const [minimumAge, setMinimumAge] = useState("18");
  const [vestingPeriod, setVestingPeriod] = useState("0");
  const [addedHeirs, setAddedHeirs] = useState([]);

  // Step 3: Add Assets
  const [assetType, setAssetType] = useState("ETH");
  const [ethAmount, setEthAmount] = useState("");
  const [tokenContract, setTokenContract] = useState("");
  const [erc20Amount, setErc20Amount] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [specificHeir, setSpecificHeir] = useState("");
  const [erc1155Amount, setErc1155Amount] = useState("");
  const [addedAssets, setAddedAssets] = useState([]);

  const resetSuccess = () => { setSuccessMsg(""); setTxHash(""); };

  // ── Step 1: Create Will ──
  const handleCreateWill = async () => {
    try {
      resetSuccess();
      setLoading(true);
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const fb = fallbackBeneficiary || ethers.ZeroAddress;
      const tx = await contract.createWill(didHash || "0", fb);
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      // Parse WillCreated event
      const log = receipt.logs.find(l => {
        try { return contract.interface.parseLog(l)?.name === "WillCreated"; } catch { return false; }
      });
      const parsed = contract.interface.parseLog(log);
      const newWillId = Number(parsed.args[1]);
      setWillId(newWillId);
      setSuccessMsg(`Will #${newWillId} created successfully!`);
      setStep(2);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Add Heir ──
  const handleAddHeir = async () => {
    try {
      resetSuccess();
      setLoading(true);
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const shareBps = Math.round(parseFloat(sharePercentage) * 100); // convert % to basis points
      const tx = await contract.addHeir(
        willId,
        heirAddress,
        shareBps,
        birthdateCommitment || "0",
        parseInt(minimumAge) || 18,
        vestingPeriod || "0"
      );
      setTxHash(tx.hash);
      await tx.wait();

      const newHeir = {
        address: heirAddress,
        share: sharePercentage,
        minAge: minimumAge,
      };
      setAddedHeirs([...addedHeirs, newHeir]);
      setSuccessMsg(`Heir ${heirAddress.slice(0, 8)}... added with ${sharePercentage}% share!`);
      setHeirAddress("");
      setSharePercentage("");
      setBirthdateCommitment("0");
      setMinimumAge("18");
      setVestingPeriod("0");
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Add Asset ──
  const handleAddAsset = async () => {
    try {
      resetSuccess();
      setLoading(true);
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      let tx;

      if (assetType === "ETH") {
        const value = ethers.parseEther(ethAmount);
        tx = await contract.addETHAsset(willId, { value });
        setAddedAssets([...addedAssets, { type: "ETH", amount: ethAmount }]);
      }
      else if (assetType === "ERC20") {
        // Approve first
        const erc20 = getERC20Contract(tokenContract, wallet.signer);
        const decimals = await erc20.decimals();
        const amount = ethers.parseUnits(erc20Amount, decimals);
        const approveTx = await erc20.approve(contractAddress, amount);
        await approveTx.wait();
        tx = await contract.addERC20Asset(willId, tokenContract, amount);
        setAddedAssets([...addedAssets, { type: "ERC20", contract: tokenContract, amount: erc20Amount }]);
      }
      else if (assetType === "ERC721") {
        // Approve first
        const erc721 = getERC721Contract(tokenContract, wallet.signer);
        const approveTx = await erc721.approve(contractAddress, tokenId);
        await approveTx.wait();
        tx = await contract.addERC721Asset(willId, tokenContract, tokenId, specificHeir);
        setAddedAssets([...addedAssets, { type: "ERC721", contract: tokenContract, tokenId }]);
      }
      else if (assetType === "ERC1155") {
        // Set approval
        const erc1155 = getERC1155Contract(tokenContract, wallet.signer);
        const isApproved = await erc1155.isApprovedForAll(wallet.account, contractAddress);
        if (!isApproved) {
          const approveTx = await erc1155.setApprovalForAll(contractAddress, true);
          await approveTx.wait();
        }
        const amt = parseInt(erc1155Amount);
        if (amt > 1) {
          tx = await contract.addERC1155AssetFungible(willId, tokenContract, tokenId, amt);
        } else {
          tx = await contract.addERC1155AssetNFT(willId, tokenContract, tokenId, specificHeir);
        }
        setAddedAssets([...addedAssets, { type: "ERC1155", contract: tokenContract, tokenId, amount: erc1155Amount }]);
      }

      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg(`${assetType} asset added successfully!`);
      setEthAmount("");
      setTokenContract("");
      setErc20Amount("");
      setTokenId("");
      setSpecificHeir("");
      setErc1155Amount("");
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Activate Will ──
  const handleActivateWill = async () => {
    try {
      resetSuccess();
      setLoading(true);
      setError("");
      const contract = getWillContract(contractAddress, wallet.signer);
      const tx = await contract.activateWill(willId);
      setTxHash(tx.hash);
      await tx.wait();
      setSuccessMsg(`Will #${willId} activated! Heartbeat timer started.`);
    } catch (err) {
      setError(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalShares = addedHeirs.reduce((sum, h) => sum + parseFloat(h.share || 0), 0);

  return (
    <div>
      {/* Progress Steps */}
      <div className="card mb-3">
        <div className="flex items-center gap-4" style={{ justifyContent: "center" }}>
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              {s > 1 && <div style={{ width: 40, height: 2, background: s <= step ? "var(--accent-blue)" : "var(--border)" }} />}
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: s === step ? "var(--accent-blue)" : s < step ? "var(--accent-green)" : "var(--border)",
                  color: "white", fontWeight: 700, fontSize: "0.85rem", cursor: s <= step ? "pointer" : "default",
                }}
                onClick={() => s <= step && setStep(s)}
              >
                {s < step ? "✓" : s}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2" style={{ justifyContent: "center" }}>
          <span className="text-xs text-muted">Create</span>
          <span style={{ width: 40 }} />
          <span className="text-xs text-muted">Add Heirs</span>
          <span style={{ width: 40 }} />
          <span className="text-xs text-muted">Add Assets</span>
          <span style={{ width: 40 }} />
          <span className="text-xs text-muted">Activate</span>
        </div>
      </div>

      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {txHash && <div className="alert alert-info tx-hash">TX: {txHash}</div>}

      {/* Step 1: Create Will */}
      {step === 1 && (
        <div className="card">
          <h2 className="card-title mb-3">Step 1: Create New Will</h2>
          <div className="form-group">
            <label>Owner DID Hash (optional, 0 to skip)</label>
            <input value={didHash} onChange={(e) => setDidHash(e.target.value)} placeholder="0" />
            <div className="form-hint">SHA-256 hash of your iden3/Privado DID (mod BN128 field). Enter 0 to skip DID registration.</div>
          </div>
          <div className="form-group">
            <label>Fallback Beneficiary (optional)</label>
            <input value={fallbackBeneficiary} onChange={(e) => setFallbackBeneficiary(e.target.value)} placeholder="0x... (leave empty = defaults to you)" />
            <div className="form-hint">Address for unclaimed assets after the deadline. Defaults to your address.</div>
          </div>
          <button className="btn btn-primary btn-block" onClick={handleCreateWill} disabled={loading}>
            {loading ? <><div className="spinner" /> Creating...</> : "Create Will"}
          </button>
        </div>
      )}

      {/* Step 2: Add Heirs */}
      {step === 2 && (
        <div className="card">
          <h2 className="card-title mb-3">Step 2: Add Heirs to Will #{willId}</h2>

          {addedHeirs.length > 0 && (
            <div className="mb-3">
              <table className="data-table">
                <thead>
                  <tr><th>Address</th><th>Share</th><th>Min Age</th></tr>
                </thead>
                <tbody>
                  {addedHeirs.map((h, i) => (
                    <tr key={i}>
                      <td>{h.address.slice(0, 10)}...{h.address.slice(-4)}</td>
                      <td>{h.share}%</td>
                      <td>{h.minAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-sm" style={{ color: totalShares === 100 ? "var(--accent-green)" : "var(--accent-amber)" }}>
                Total shares: {totalShares}% {totalShares === 100 ? "✓" : "(must equal 100%)"}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Heir Address</label>
            <input value={heirAddress} onChange={(e) => setHeirAddress(e.target.value)} placeholder="0x..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Share Percentage (%)</label>
              <input type="number" value={sharePercentage} onChange={(e) => setSharePercentage(e.target.value)} placeholder="50" min="0.01" max="100" step="0.01" />
              <div className="form-hint">All heirs must total 100%</div>
            </div>
            <div className="form-group">
              <label>Minimum Age</label>
              <input type="number" value={minimumAge} onChange={(e) => setMinimumAge(e.target.value)} placeholder="18" min="0" max="100" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Birthdate Commitment (Poseidon hash)</label>
              <input value={birthdateCommitment} onChange={(e) => setBirthdateCommitment(e.target.value)} placeholder="0" />
              <div className="form-hint">ZKP commitment for age verification</div>
            </div>
            <div className="form-group">
              <label>Vesting Period (seconds)</label>
              <input type="number" value={vestingPeriod} onChange={(e) => setVestingPeriod(e.target.value)} placeholder="0" />
              <div className="form-hint">0 = no vesting (immediate)</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={handleAddHeir} disabled={loading || !heirAddress || !sharePercentage}>
              {loading ? <><div className="spinner" /> Adding...</> : "Add Heir"}
            </button>
            {addedHeirs.length > 0 && (
              <button className="btn btn-success" onClick={() => { resetSuccess(); setStep(3); }}>
                Continue to Assets →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Add Assets */}
      {step === 3 && (
        <div className="card">
          <h2 className="card-title mb-3">Step 3: Deposit Assets into Will #{willId}</h2>

          {addedAssets.length > 0 && (
            <div className="mb-3">
              <table className="data-table">
                <thead><tr><th>Type</th><th>Details</th></tr></thead>
                <tbody>
                  {addedAssets.map((a, i) => (
                    <tr key={i}>
                      <td><span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>{a.type}</span></td>
                      <td>{a.type === "ETH" ? `${a.amount} ETH` : `${a.contract?.slice(0,10)}... ${a.amount || `Token #${a.tokenId}`}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="form-group">
            <label>Asset Type</label>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              <option value="ETH">Native ETH</option>
              <option value="ERC20">ERC-20 Token</option>
              <option value="ERC721">ERC-721 NFT</option>
              <option value="ERC1155">ERC-1155</option>
            </select>
          </div>

          {assetType === "ETH" && (
            <div className="form-group">
              <label>ETH Amount</label>
              <input type="text" value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} placeholder="0.1" />
              <div className="form-hint">Divisible among heirs by percentage</div>
            </div>
          )}

          {assetType === "ERC20" && (
            <>
              <div className="form-group">
                <label>Token Contract Address</label>
                <input value={tokenContract} onChange={(e) => setTokenContract(e.target.value)} placeholder="0x..." />
              </div>
              <div className="form-group">
                <label>Amount (in token units)</label>
                <input type="text" value={erc20Amount} onChange={(e) => setErc20Amount(e.target.value)} placeholder="1000" />
                <div className="form-hint">Will auto-approve then deposit. Divisible by heir percentage.</div>
              </div>
            </>
          )}

          {assetType === "ERC721" && (
            <>
              <div className="form-group">
                <label>NFT Contract Address</label>
                <input value={tokenContract} onChange={(e) => setTokenContract(e.target.value)} placeholder="0x..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Token ID</label>
                  <input type="text" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Specific Heir Address</label>
                  <input value={specificHeir} onChange={(e) => setSpecificHeir(e.target.value)} placeholder="0x... (required for NFTs)" />
                </div>
              </div>
            </>
          )}

          {assetType === "ERC1155" && (
            <>
              <div className="form-group">
                <label>Token Contract Address</label>
                <input value={tokenContract} onChange={(e) => setTokenContract(e.target.value)} placeholder="0x..." />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Token ID</label>
                  <input type="text" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input type="text" value={erc1155Amount} onChange={(e) => setErc1155Amount(e.target.value)} placeholder="10" />
                  <div className="form-hint">{'>'} 1 = fungible, 1 = NFT</div>
                </div>
                <div className="form-group">
                  <label>Specific Heir (if amount=1)</label>
                  <input value={specificHeir} onChange={(e) => setSpecificHeir(e.target.value)} placeholder="0x..." />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={handleAddAsset} disabled={loading}>
              {loading ? <><div className="spinner" /> Depositing...</> : `Deposit ${assetType}`}
            </button>
            {addedAssets.length > 0 && (
              <button className="btn btn-success" onClick={() => { resetSuccess(); setStep(4); }}>
                Continue to Activate →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Activate */}
      {step === 4 && (
        <div className="card text-center">
          <h2 className="card-title mb-3">Step 4: Activate Will #{willId}</h2>
          <div className="info-grid mb-3">
            <div className="info-item">
              <div className="info-label">Heirs Added</div>
              <div className="info-value">{addedHeirs.length}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Total Shares</div>
              <div className="info-value" style={{ color: totalShares === 100 ? "var(--accent-green)" : "var(--accent-red)" }}>
                {totalShares}%
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Assets Deposited</div>
              <div className="info-value">{addedAssets.length}</div>
            </div>
          </div>
          <div className="alert alert-warning">
            ⚠️ Activation locks the will. After activation, heirs and assets cannot be modified.
            The heartbeat timer will start immediately.
          </div>
          <button className="btn btn-success btn-lg btn-block mt-3" onClick={handleActivateWill} disabled={loading || totalShares !== 100}>
            {loading ? <><div className="spinner" /> Activating...</> : "Activate Will"}
          </button>
          {totalShares !== 100 && (
            <div className="text-sm mt-2" style={{ color: "var(--accent-red)" }}>
              Shares must total exactly 100% to activate. Currently: {totalShares}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
