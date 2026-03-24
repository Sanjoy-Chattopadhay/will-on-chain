// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestUSDC
 * @notice Demo stablecoin for testing inheritance
 */
contract TestUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {
        // Mint 1 million USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }
    
    /**
     * @notice Mint tokens to any address (testing only)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @notice Faucet: Get 10,000 USDC for free
     */
    function faucet() external {
        _mint(msg.sender, 10_000 * 10**decimals());
    }
}
