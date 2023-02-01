// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {ERC4626, ERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Staker} from "./Staker.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract MainSyther is ERC4626 {
    address public stakerContract;

    constructor(
        address _token,
        string memory _name,
        string memory _symbol,
        address _stakerContract
    ) ERC4626(IERC20Metadata(_token)) ERC20(_name, _symbol) {
        // Mint 1 Share to address dEaD to prevent the state of 0 Shares
        // _mint(address(0x000000000000000000000000000000000000dEaD), 1);
        require(_stakerContract != address(0), "MainSyther: stakerContract cannot be 0x0");
        stakerContract = _stakerContract;

        // Approve stakerContract to spend all tokens
        IERC20Metadata token = IERC20Metadata(_token);
        SafeERC20.safeApprove(token, _stakerContract, type(uint256).max);
    }

    //
    // ERC4626 overrides
    //

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        console.log("MainSyther._deposit() called");

        // Transfer assets from caller to this contract
        IERC20Metadata token = IERC20Metadata(super.asset());
        SafeERC20.safeTransferFrom(token, caller, address(this), assets);

        // Mint shares to receiver
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    //
    // Admin functions
    //

    // TODO: Guard with onlyOwner
    function setStakerContract(address _stakerContract) external {
        // Revoke approval of old stakerContract
        IERC20Metadata token = IERC20Metadata(super.asset());
        SafeERC20.safeApprove(token, stakerContract, 0);

        require(_stakerContract != address(0), "MainSyther: stakerContract cannot be 0x0");
        stakerContract = _stakerContract;

        // Approve new stakerContract to spend all tokens
        SafeERC20.safeApprove(token, _stakerContract, type(uint256).max);
    }

    function stakeMax() external {
        Staker(stakerContract).stakeMax();
    }

    function burnMax() external {
        Staker(stakerContract).burnMax();
    }
}
