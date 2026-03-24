// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[5] calldata input
    ) external view returns (bool);
}

contract LivenessRegistry {
    IVerifier public verifier;
    
    struct LivenessRecord {
        uint256 lastAliveTimestamp;
        uint256 lastExpirationDate;
        bool isRegistered;
    }
    
    // DID hash => Liveness record
    mapping(uint256 => LivenessRecord) public records;
    
    // DID hash => Owner address
    mapping(uint256 => address) public didOwners;
    
    // Used nonces to prevent replay
    mapping(uint256 => bool) public usedNonces;
    
    event DIDRegistered(uint256 indexed didHash, address indexed owner);
    event LivenessUpdated(uint256 indexed didHash, uint256 timestamp, uint256 expirationDate);
    event MarkedDead(uint256 indexed didHash, uint256 timestamp);
    
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }
    
    // TEST FUNCTION - Call verifier directly to see what happens
    function testVerifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[5] calldata publicSignals
    ) external view returns (bool) {
        return verifier.verifyProof(a, b, c, publicSignals);
    }
    
    // Register DID to Ethereum address (one-time)
    function registerDID(uint256 didHash) external {
        require(didOwners[didHash] == address(0), "DID already registered");
        didOwners[didHash] = msg.sender;
        records[didHash].isRegistered = true;
        emit DIDRegistered(didHash, msg.sender);
    }
    
// Update liveness with ZK proof
    function updateLiveness(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint256 didHash,
        uint256 expirationDate,
        uint256 revocationNonce,
        uint256 currentTimestamp
    ) external {
        require(records[didHash].isRegistered, "DID not registered");
        require(didOwners[didHash] == msg.sender, "Not DID owner");
        require(!usedNonces[revocationNonce], "Nonce already used");
        
        // Verify the ZK proof - pass in the EXACT order from circuit output
        // Order: [isValid(output), didHash, expirationDate, revocationNonce, currentTimestamp]
        uint[5] memory publicSignals = [
            1,  // Expected isValid value
            didHash, 
            expirationDate, 
            revocationNonce, 
            currentTimestamp
        ];
        
        require(verifier.verifyProof(a, b, c, publicSignals), "Invalid proof");
        
        // Additional check: ensure not expired (redundant but safe)
        require(block.timestamp < expirationDate, "Credential expired");
        
        // Update record
        records[didHash].lastAliveTimestamp = block.timestamp;
        records[didHash].lastExpirationDate = expirationDate;
        usedNonces[revocationNonce] = true;
        
        emit LivenessUpdated(didHash, block.timestamp, expirationDate);
    }
    
    // Check if DID is alive
    function isAlive(uint256 didHash) external view returns (bool) {
        if (!records[didHash].isRegistered) return false;
        return block.timestamp < records[didHash].lastExpirationDate;
    }
    
    // Get full status
    function getStatus(uint256 didHash) external view returns (
        uint256 lastAlive,
        uint256 expiration,
        bool alive,
        address owner
    ) {
        LivenessRecord memory record = records[didHash];
        return (
            record.lastAliveTimestamp,
            record.lastExpirationDate,
            block.timestamp < record.lastExpirationDate,
            didOwners[didHash]
        );
    }
}