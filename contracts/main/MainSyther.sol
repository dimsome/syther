// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {ERC4626, ERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ICoreProxy} from "../interfaces/ICoreProxy.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

address constant token = 0xC011A72400E58ecD99Ee497CF89E3775d4bd732F; // SNX
string constant name = "MainSyther";
string constant symbol = "sySNX";

contract MainSyther is ERC4626, Ownable {
    uint128 public immutable accountId;
    ICoreProxy public coreProxy;

    constructor(address _synthetixProxy, uint128 _accountId) ERC4626(IERC20Metadata(token)) ERC20(name(), symbol()) {
        // Create Account
        coreProxy = ICoreProxy(_synthetixProxy);
        coreProxy.createAccount(_accountId);

        // Set Immutable Variables
        accountId = _accountId;
    }

    function stake() external onlyOwner {
        // Get balance of this contract
        uint256 balance = IERC20Metadata(token).balanceOf(address(this));
        require(balance > 0, "MainSyther: No balance to mint");

        // Approve coreProxy to spend tokens
        SafeERC20.safeApprove(IERC20Metadata(token), address(coreProxy), balance);

        coreProxy.deposit(accountId, token, balance);
    }

    // //
    // // ERC4626 overrides
    // //

    // function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
    //     console.log("MainSyther._deposit() called");

    //     // Transfer assets from caller to this contract
    //     IERC20Metadata token = IERC20Metadata(super.asset());
    //     SafeERC20.safeTransferFrom(token, caller, address(this), assets);

    //     // Mint shares to receiver
    //     _mint(receiver, shares);

    //     emit Deposit(caller, receiver, assets, shares);
    // }

    // //
    // // Admin functions
    // //

    // // TODO: Guard with onlyOwner
    // function setStakerContract(address _stakerContract) external onlyOwner {
    //     // Revoke approval of old stakerContract
    //     IERC20Metadata token = IERC20Metadata(super.asset());
    //     SafeERC20.safeApprove(token, stakerContract, 0);

    //     require(_stakerContract != address(0), "MainSyther: stakerContract cannot be 0x0");
    //     stakerContract = _stakerContract;

    //     // Approve new stakerContract to spend all tokens
    //     SafeERC20.safeApprove(token, _stakerContract, type(uint256).max);
    // }

    // function stakeMax() external onlyOwner {
    //     Staker(stakerContract).stakeMax();
    // }

    // function burnMax() external onlyOwner {
    //     Staker(stakerContract).burnMax();
    // }
}
