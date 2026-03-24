// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVerifier4
 * @notice Mock Groth16 verifier that always returns true (4 public signals).
 *         Used for Remix IDE testing of the age verification flow.
 *         In production, deploy the real Groth16Verifier from AgeVerifier.sol.
 *
 *         Public signals: [willId, minimumAge, currentYear, commitment]
 */
contract MockVerifier4 {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[4] calldata
    ) external pure returns (bool) {
        return true;
    }
}

/**
 * @title MockLivenessVerifier5
 * @notice Mock Groth16 verifier that always returns true (5 public signals).
 *         Used for Remix IDE testing of the DID-based liveness verification flow
 *         in the main will system (HeartbeatManager.recordHeartbeatWithDIDProof).
 *
 *         In production, deploy the real Groth16Verifier from Verifier.sol.
 *
 *         Public signals: [isValid, didHash, expirationDate, revocationNonce, currentTimestamp]
 *
 * @dev This replaces the old MockLivenessVerifier (4-signal) which was for the
 *      previous trustee-based system. The new ILivenessVerifier interface uses
 *      5 signals matching the DID liveness circuit (liveness.circom).
 */
contract MockLivenessVerifier5 {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[5] calldata
    ) external pure returns (bool) {
        return true;
    }
}
