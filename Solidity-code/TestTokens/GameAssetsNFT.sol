// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * @title GameAssetsNFT
 * @notice Demo gaming assets (swords, shields, potions) for testing
 */
contract GameAssetsNFT is ERC1155 {
    // Token IDs
    uint256 public constant LEGENDARY_SWORD = 0;
    uint256 public constant EPIC_SHIELD = 1;
    uint256 public constant HEALTH_POTION = 2;
    uint256 public constant MANA_CRYSTAL = 3;
    uint256 public constant RARE_ARTIFACT = 4;
    
    mapping(uint256 => string) private _tokenNames;
    mapping(uint256 => uint256) private _tokenSupplies;
    
    constructor() ERC1155("https://api.gamefi.com/metadata/{id}.json") {
        // Initialize token names
        _tokenNames[LEGENDARY_SWORD] = "Legendary Sword of Fire";
        _tokenNames[EPIC_SHIELD] = "Epic Shield of Protection";
        _tokenNames[HEALTH_POTION] = "Greater Health Potion";
        _tokenNames[MANA_CRYSTAL] = "Arcane Mana Crystal";
        _tokenNames[RARE_ARTIFACT] = "Ancient Rare Artifact";
        
        // Mint initial supply to deployer
        _mint(msg.sender, LEGENDARY_SWORD, 10, "");
        _mint(msg.sender, EPIC_SHIELD, 20, "");
        _mint(msg.sender, HEALTH_POTION, 100, "");
        _mint(msg.sender, MANA_CRYSTAL, 50, "");
        _mint(msg.sender, RARE_ARTIFACT, 5, "");
        
        _tokenSupplies[LEGENDARY_SWORD] = 10;
        _tokenSupplies[EPIC_SHIELD] = 20;
        _tokenSupplies[HEALTH_POTION] = 100;
        _tokenSupplies[MANA_CRYSTAL] = 50;
        _tokenSupplies[RARE_ARTIFACT] = 5;
    }
    
    /**
     * @notice Mint specific gaming asset
     */
    function mint(address to, uint256 tokenId, uint256 amount) external {
        require(tokenId <= RARE_ARTIFACT, "Invalid token ID");
        _mint(to, tokenId, amount, "");
        _tokenSupplies[tokenId] += amount;
    }
    
    /**
     * @notice Batch mint multiple asset types
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external {
        require(tokenIds.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i] <= RARE_ARTIFACT, "Invalid token ID");
            _tokenSupplies[tokenIds[i]] += amounts[i];
        }
        
        _mintBatch(to, tokenIds, amounts, "");
    }
    
    /**
     * @notice Faucet: Get free gaming assets for testing
     */
    function faucet() external {
        _mint(msg.sender, LEGENDARY_SWORD, 2, "");
        _mint(msg.sender, EPIC_SHIELD, 3, "");
        _mint(msg.sender, HEALTH_POTION, 10, "");
        _mint(msg.sender, MANA_CRYSTAL, 5, "");
        _mint(msg.sender, RARE_ARTIFACT, 1, "");
    }
    
    /**
     * @notice Get token name
     */
    function getTokenName(uint256 tokenId) external view returns (string memory) {
        return _tokenNames[tokenId];
    }
    
    /**
     * @notice Get total supply of token
     */
    function totalSupply(uint256 tokenId) external view returns (uint256) {
        return _tokenSupplies[tokenId];
    }
}
