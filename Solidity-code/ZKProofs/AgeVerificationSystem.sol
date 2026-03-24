// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title AgeVerificationSystem
 * @dev Zero-Knowledge Proof based age verification system for inheritance
 * This contract stores commitments and verifies age proofs without revealing birth dates
 */
contract AgeVerificationSystem {
    
    // Groth16 Verifier Interface
    IGroth16Verifier public verifier;
    
    // Struct to store heir information
    struct HeirCommitment {
        uint256 commitment;      // Hash commitment of (birthYear + salt + willId)
        uint256 willId;          // Associated will ID
        uint256 minimumAge;      // Required minimum age
        uint256 registeredAt;    // Timestamp when registered
        bool verified;           // Whether age has been verified
        uint256 verifiedAt;      // Timestamp when verified
        address heir;            // Heir's address
    }
    
    // Mapping: willId => HeirCommitment
    mapping(uint256 => HeirCommitment) public heirCommitments;
    
    // Mapping: heir address => willId[]
    mapping(address => uint256[]) public heirWills;
    
    // Events
    event CommitmentRegistered(
        uint256 indexed willId,
        address indexed heir,
        uint256 commitment,
        uint256 minimumAge
    );
    
    event AgeVerified(
        uint256 indexed willId,
        address indexed heir,
        uint256 verifiedAt
    );
    
    // Modifiers
    modifier commitmentExists(uint256 _willId) {
        require(heirCommitments[_willId].commitment != 0, "Commitment does not exist");
        _;
    }
    
    modifier notAlreadyVerified(uint256 _willId) {
        require(!heirCommitments[_willId].verified, "Already verified");
        _;
    }
    
    constructor(address _verifierAddress) {
        verifier = IGroth16Verifier(_verifierAddress);
    }
    
    /**
     * @dev Register a commitment for an heir
     * @param _willId Unique identifier for the will
     * @param _commitment Hash commitment (birthYear + salt + willId)
     * @param _minimumAge Required minimum age for inheritance
     * @param _heir Address of the heir
     */
    function registerCommitment(
        uint256 _willId,
        uint256 _commitment,
        uint256 _minimumAge,
        address _heir
    ) external {
        require(_commitment != 0, "Invalid commitment");
        require(_heir != address(0), "Invalid heir address");
        require(heirCommitments[_willId].commitment == 0, "Will ID already registered");
        require(_minimumAge >= 18 && _minimumAge <= 100, "Invalid minimum age");
        
        heirCommitments[_willId] = HeirCommitment({
            commitment: _commitment,
            willId: _willId,
            minimumAge: _minimumAge,
            registeredAt: block.timestamp,
            verified: false,
            verifiedAt: 0,
            heir: _heir
        });
        
        heirWills[_heir].push(_willId);
        
        emit CommitmentRegistered(_willId, _heir, _commitment, _minimumAge);
    }
    
    /**
     * @dev Verify age using zero-knowledge proof
     * @param _pA Proof point A
     * @param _pB Proof point B  
     * @param _pC Proof point C
     * @param _pubSignals Public signals [willId, minimumAge, currentYear, commitment]
     */
    function verifyAge(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external commitmentExists(_pubSignals[0]) notAlreadyVerified(_pubSignals[0]) returns (bool) {
        uint256 willId = _pubSignals[0];
        uint256 minimumAge = _pubSignals[1];
        uint256 currentYear = _pubSignals[2];
        uint256 commitment = _pubSignals[3];
        
        HeirCommitment storage heirData = heirCommitments[willId];
        
        // Verify the caller is the registered heir
        require(msg.sender == heirData.heir, "Not authorized heir");
        
        // Verify public signals match stored commitment
        require(commitment == heirData.commitment, "Commitment mismatch");
        require(minimumAge == heirData.minimumAge, "Minimum age mismatch");
        
        // Verify current year is reasonable
        require(currentYear >= 2024 && currentYear <= 2100, "Invalid current year");
        
        // Verify the zero-knowledge proof
        bool proofValid = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(proofValid, "Invalid proof");
        
        // Mark as verified
        heirData.verified = true;
        heirData.verifiedAt = block.timestamp;
        
        emit AgeVerified(willId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Check if an heir's age has been verified
     * @param _willId Will identifier
     * @return verified Whether age has been verified
     * @return verifiedAt Timestamp of verification (0 if not verified)
     */
    function isAgeVerified(uint256 _willId) external view returns (bool verified, uint256 verifiedAt) {
        HeirCommitment memory heirData = heirCommitments[_willId];
        return (heirData.verified, heirData.verifiedAt);
    }
    
    /**
     * @dev Get commitment details for a will
     * @param _willId Will identifier
     */
    function getCommitment(uint256 _willId) external view returns (
        uint256 commitment,
        uint256 minimumAge,
        uint256 registeredAt,
        bool verified,
        address heir
    ) {
        HeirCommitment memory heirData = heirCommitments[_willId];
        return (
            heirData.commitment,
            heirData.minimumAge,
            heirData.registeredAt,
            heirData.verified,
            heirData.heir
        );
    }
    
    /**
     * @dev Get all will IDs for an heir
     * @param _heir Heir address
     */
    function getHeirWills(address _heir) external view returns (uint256[] memory) {
        return heirWills[_heir];
    }
}

/**
 * @title IGroth16Verifier
 * @dev Interface for the Groth16 verifier contract
 */
interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}
