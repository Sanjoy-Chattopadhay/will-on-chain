// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║                  ERC721FractionalWrapper                        ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║  Wrap any ERC-721 token into ERC-1155 fractional shares.       ║
 ║  BASIS = 10 000 (100.00%).  Shares are freely transferable.    ║
 ║  Unwrap requires ownership of ALL 10 000 shares.               ║
 ║                                                                ║
 ║  NON-STANDARD EXTENSION NOTICE:                                ║
 ║  This contract represents fractional NFT ownership using       ║
 ║  ERC-1155 tokens.  Standard wallets and marketplaces that      ║
 ║  only understand vanilla ERC-721 will NOT natively display     ║
 ║  fractional positions.  Integrators must:                      ║
 ║    1. Read wrappedInfo(wrapId) to discover the underlying      ║
 ║       ERC-721 contract and tokenId.                            ║
 ║    2. Treat each wrapId as a share class with totalSupply      ║
 ║       always equal to BASIS (10 000).                          ║
 ║    3. Use the standard ERC-1155 interface (balanceOf, etc.)    ║
 ║       to query fractional ownership.                           ║
 ║                                                                ║
 ║  INTEROPERABILITY:                                             ║
 ║    - OpenSea, Rarible, etc. will show wrapId as a normal       ║
 ║      ERC-1155 token.  Metadata URI should be set to a server   ║
 ║      that resolves the original NFT metadata.                  ║
 ║    - The Will contract adds wrapper shares via                 ║
 ║      addERC721SharedAsset(), treating them as divisible         ║
 ║      ERC-1155 assets distributed by heir percentage.           ║
 ╚══════════════════════════════════════════════════════════════════╝
*/

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721FractionalWrapper is ERC1155, ERC1155Supply, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _wrapIdCounter;
    uint256 public constant BASIS = 10000; // 100%

    struct Wrapped {
        address originalContract;
        uint256 originalTokenId;
        address wrapperCreator;
        bool    unwrapped;
    }

    mapping(uint256 => Wrapped) public wrappedInfo;
    mapping(bytes32 => uint256) public originalToWrapId;

    event WrappedNFT(
        uint256 indexed wrapId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address creator
    );
    event UnwrappedNFT(uint256 indexed wrapId, address indexed recipient);
    event SharesMinted(uint256 indexed wrapId, address indexed to, uint256 amount);

    constructor(string memory uri_, address initialOwner)
        ERC1155(uri_)
        Ownable(initialOwner)
    {}

    function _originalKey(address nft, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nft, id));
    }

    // ════════════════════════════════════════
    //                WRAP
    // ════════════════════════════════════════

    /**
     * @notice Wrap an ERC-721 NFT into fractional ERC-1155 shares.
     * @param nftContract Address of the ERC-721 contract
     * @param tokenId     Token ID to wrap
     * @param recipients  Addresses to receive shares
     * @param shares      Corresponding share amounts (must sum to BASIS = 10 000)
     */
    function wrap(
        address nftContract,
        uint256 tokenId,
        address[] calldata recipients,
        uint256[] calldata shares
    ) external returns (uint256 wrapId) {
        require(recipients.length == shares.length, "Length mismatch");

        bytes32 key = _originalKey(nftContract, tokenId);
        require(originalToWrapId[key] == 0, "Already wrapped");

        uint256 sum = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            sum += shares[i];
        }
        require(sum == BASIS, "Shares must sum to 10000");

        // Transfer NFT into wrapper
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _wrapIdCounter.increment();
        wrapId = _wrapIdCounter.current();

        wrappedInfo[wrapId] = Wrapped({
            originalContract: nftContract,
            originalTokenId:  tokenId,
            wrapperCreator:   msg.sender,
            unwrapped:        false
        });

        originalToWrapId[key] = wrapId;

        // Mint shares
        for (uint256 i = 0; i < recipients.length; i++) {
            if (shares[i] > 0) {
                _mint(recipients[i], wrapId, shares[i], "");
                emit SharesMinted(wrapId, recipients[i], shares[i]);
            }
        }

        emit WrappedNFT(wrapId, nftContract, tokenId, msg.sender);
        return wrapId;
    }

    // ════════════════════════════════════════
    //               UNWRAP
    // ════════════════════════════════════════

    /**
     * @notice Unwrap: caller must own 100% of shares (all BASIS).
     *         Burns the shares and releases the original ERC-721.
     */
    function unwrap(uint256 wrapId, address recipient) external {
        require(recipient != address(0), "Invalid recipient");
        Wrapped storage info = wrappedInfo[wrapId];
        require(info.originalContract != address(0), "Invalid wrap id");
        require(!info.unwrapped, "Already unwrapped");
        require(balanceOf(msg.sender, wrapId) == BASIS, "Need 100% shares");

        _burn(msg.sender, wrapId, BASIS);

        info.unwrapped = true;
        bytes32 key = _originalKey(info.originalContract, info.originalTokenId);
        delete originalToWrapId[key];

        IERC721(info.originalContract).transferFrom(
            address(this), recipient, info.originalTokenId
        );

        emit UnwrappedNFT(wrapId, recipient);
    }

    // ════════════════════════════════════════
    //        REQUIRED OVERRIDES (OZ v5)
    // ════════════════════════════════════════

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, amounts);
    }
}
