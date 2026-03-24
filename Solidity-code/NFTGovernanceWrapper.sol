// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/**
 * @title NFTGovernanceWrapper
 * @notice A minimal multi-sig/threshold governance wrapper that holds an ERC-721 NFT
 *         and requires t-of-n signer approval before releasing or transferring it.
 *
 * DESIGN (per reviewer recommendation):
 *   Instead of modifying ERC-721 semantics, this contract acts as a custody wrapper
 *   (similar to a Gnosis Safe for a single NFT).  The NFT is held by this contract,
 *   and any action (transfer, release) requires threshold signatures from designated
 *   co-owners / signers.
 *
 * NON-STANDARD EXTENSION NOTICE:
 *   This wrapper does NOT implement ERC-721 itself.  Wallets will see the underlying
 *   NFT as owned by this contract address.  A dedicated UI or the getInfo() view
 *   function should be used to display governance status.
 *
 * USE IN INHERITANCE:
 *   The will system assigns this wrapper contract address as the heir for an NFT.
 *   After execution, the NFT sits in this wrapper.  The co-owners (heirs) must then
 *   reach consensus to transfer it out.
 */
contract NFTGovernanceWrapper is ERC721Holder {

    struct Proposal {
        address to;           // recipient of the NFT
        uint256 approvalCount;
        bool    executed;
        mapping(address => bool) approved;
    }

    address public nftContract;
    uint256 public tokenId;
    bool    public isDeposited;

    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event NFTDeposited(address indexed nftContract, uint256 indexed tokenId);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed to);
    event ProposalApproved(uint256 indexed proposalId, address indexed signer);
    event ProposalExecuted(uint256 indexed proposalId, address indexed to);

    /**
     * @param _signers   Co-owners / governance signers
     * @param _threshold Minimum approvals required to execute a transfer
     */
    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length >= _threshold, "Invalid threshold");
        require(_threshold > 0, "Threshold must be > 0");

        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer");
            require(!isSigner[_signers[i]], "Duplicate signer");
            isSigner[_signers[i]] = true;
        }
        signers   = _signers;
        threshold = _threshold;
    }

    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    /**
     * @notice Deposit the ERC-721 NFT into governance custody.
     *         The caller must have approved this contract beforehand.
     */
    function deposit(address _nftContract, uint256 _tokenId) external {
        require(!isDeposited, "Already holding an NFT");
        IERC721(_nftContract).safeTransferFrom(msg.sender, address(this), _tokenId);
        nftContract = _nftContract;
        tokenId     = _tokenId;
        isDeposited = true;
        emit NFTDeposited(_nftContract, _tokenId);
    }

    /**
     * @notice Create a proposal to transfer the NFT to a recipient.
     */
    function propose(address _to) external onlySigner returns (uint256 proposalId) {
        require(isDeposited, "No NFT deposited");
        require(_to != address(0), "Invalid recipient");

        proposalId = proposalCount++;
        Proposal storage p = proposals[proposalId];
        p.to = _to;
        p.executed = false;

        emit ProposalCreated(proposalId, msg.sender, _to);
        return proposalId;
    }

    /**
     * @notice Approve a pending proposal.
     */
    function approve(uint256 _proposalId) external onlySigner {
        Proposal storage p = proposals[_proposalId];
        require(!p.executed, "Already executed");
        require(!p.approved[msg.sender], "Already approved");

        p.approved[msg.sender] = true;
        p.approvalCount++;
        emit ProposalApproved(_proposalId, msg.sender);
    }

    /**
     * @notice Execute a proposal once the threshold is reached.
     */
    function execute(uint256 _proposalId) external onlySigner {
        Proposal storage p = proposals[_proposalId];
        require(!p.executed, "Already executed");
        require(p.approvalCount >= threshold, "Threshold not met");
        require(isDeposited, "No NFT");

        p.executed  = true;
        isDeposited = false;

        IERC721(nftContract).safeTransferFrom(address(this), p.to, tokenId);
        emit ProposalExecuted(_proposalId, p.to);
    }

    /**
     * @notice View helper: returns current governance state.
     */
    function getInfo() external view returns (
        address nft,
        uint256 id,
        bool    deposited,
        uint256 signerCount,
        uint256 requiredThreshold,
        uint256 totalProposals
    ) {
        return (nftContract, tokenId, isDeposited, signers.length, threshold, proposalCount);
    }
}
