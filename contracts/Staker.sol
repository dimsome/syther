// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "synthetix/contracts/interfaces/IAddressResolver.sol";
import "synthetix/contracts/interfaces/ISynthetix.sol";

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Staker {
    IAddressResolver public synthetixResolver;
    IERC20 public token;

    constructor(IAddressResolver _snxResolver, address _token) {
        synthetixResolver = _snxResolver;
        token = IERC20(_token);
    }

    function stakeMax(address _main) external {
        ISynthetix synthetix = ISynthetix(synthetixResolver.getAddress("Synthetix"));
        require(address(synthetix) != address(0), "Synthetix is missing from Synthetix resolver");

        // Transfer SNX to this contract
        uint256 balance = token.balanceOf(_main);
        SafeERC20.safeTransferFrom(token, _main, address(this), balance);

        synthetix.issueMaxSynths();
    }
}
