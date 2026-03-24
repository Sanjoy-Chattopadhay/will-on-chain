// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimeDemo {
    uint public lastTime;

    function getTime() public returns (uint) {
        lastTime = block.timestamp;
        return block.timestamp;
    }
}
