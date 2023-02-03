// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// import "synthetix/contracts/interfaces/IAddressResolver.sol";
// import "synthetix/contracts/interfaces/ISynthetix.sol";

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

abstract contract Staker is Ownable {
    // // IAddressResolver public synthetixResolver;
    // IERC20 public token;
    // address public mainSyther;
    // constructor(IAddressResolver _snxResolver, address _token) {
    //     synthetixResolver = _snxResolver;
    //     token = IERC20(_token);
    // }
    // function init(address _main) external onlyOwner {
    //     require(mainSyther == address(0), "Staker: Already initialized");
    //     mainSyther = _main;
    // }
    // modifier onlyMain() {
    //     require(msg.sender == mainSyther, "Staker: Only MainSyther can call this function");
    //     _;
    // }
    // function stakeMax() external onlyMain {
    //     ISynthetix synthetix = ISynthetix(synthetixResolver.getAddress("Synthetix"));
    //     require(address(synthetix) != address(0), "Synthetix is missing from Synthetix resolver");
    //     // Transfer SNX to this contract
    //     uint256 balance = token.balanceOf(mainSyther);
    //     SafeERC20.safeTransferFrom(token, mainSyther, address(this), balance);
    //     // Issue max sUSD
    //     synthetix.issueMaxSynths();
    // }
    // function burnMax() external onlyMain {
    //     ISynthetix synthetix = ISynthetix(synthetixResolver.getAddress("Synthetix"));
    //     require(address(synthetix) != address(0), "Synthetix is missing from Synthetix resolver");
    //     // Burn max sUSD
    //     uint256 balance = token.balanceOf(mainSyther);
    //     synthetix.burnSynths(balance);
    // }
}
