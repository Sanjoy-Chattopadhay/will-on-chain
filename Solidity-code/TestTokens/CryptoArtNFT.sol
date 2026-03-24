// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CryptoArtNFT
 * @notice Demo NFT collection for testing inheritance
 */
contract CryptoArtNFT is ERC721 {
    using Strings for uint256;
    
    uint256 private _tokenIdCounter;
    mapping(uint256 => string) private _tokenURIs;
    
    constructor() ERC721("Crypto Art Collection", "CART") {}
    
    /**
     * @notice Mint NFT to caller with custom metadata
     */
    function mint(string memory _uri) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(msg.sender, tokenId);
        _tokenURIs[tokenId] = _uri;
        return tokenId;
    }
    
    /**
     * @notice Batch mint multiple NFTs
     */
    function batchMint(uint256 quantity) external returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _mint(msg.sender, tokenId);
            _tokenURIs[tokenId] = string(abi.encodePacked(
                "https://api.cryptoart.com/metadata/",
                tokenId.toString()
            ));
            tokenIds[i] = tokenId;
        }
        
        return tokenIds;
    }
    
    /**
     * @notice Get token metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
