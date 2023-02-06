// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {ERC4626, ERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ICoreProxy, CollateralConfiguration} from "../interfaces/ICoreProxy.sol";

address constant token = 0x7B05A2baA61dFd56951c14597550c803e92B1C95; // SNX
string constant name = "MainSyther";
string constant symbol = "sySNX";

contract MainSyther is ERC4626, Ownable {
    uint128 public immutable accountId;
    uint128 public immutable poolId;

    uint256 public targetCollateralizationRatio;
    uint256 public collateralizationThreshold;

    ICoreProxy public immutable coreProxy;

    constructor(address _synthetixProxy, uint128 _accountId) ERC4626(IERC20Metadata(token)) ERC20(name(), symbol()) {
        // Create Account
        coreProxy = ICoreProxy(_synthetixProxy);
        coreProxy.createAccount(_accountId);

        // Set Immutable Variables
        accountId = _accountId;
        poolId = uint128(coreProxy.getPreferredPool());

        // Set config variables
        targetCollateralizationRatio = 12e17; // 1.2 or 120%
        // Should check via contract call, for now hardcode
        collateralizationThreshold = 2e18; // 2 or 200%
    }

    function stakeAndMint() external onlyOwner {
        uint256 collateralizationRatio = getCollateralizationRatio();
        uint256 stakeTokenBalance = IERC20(token).balanceOf(address(this));

        // There is probably a better way to do this
        if (collateralizationRatio < targetCollateralizationRatio) {
            // Stake
            _increaseCollateral(stakeTokenBalance);
        } else if (collateralizationRatio < collateralizationThreshold) {
            // Cannot mint, but also not below threshold, so do nothing
            revert("MainSyther: Cannot mint, but also not below threshold, so do nothing");
        } else {
            // Stake and mint more
            _increaseCollateral(stakeTokenBalance);
            uint256 mintableAmount = getMintableAmount();
            _mintUsd(mintableAmount);
        }
    }

    /// view functions need to be called via callStatic

    function getCollateralizationRatio() public returns (uint256) {
        return coreProxy.getPositionCollateralizationRatio(accountId, poolId, token);
    }

    function getDebtBalance() external returns (int256) {
        return coreProxy.getPositionDebt(accountId, poolId, token);
    }

    function getMintableAmount() public returns (uint256) {
        CollateralConfiguration.Data memory collateralConfiguration = coreProxy.getCollateralConfiguration(token);
        // struct Data {
        //     bool depositingEnabled;
        //     uint256 issuanceRatioD18;
        //     uint256 liquidationRatioD18;
        //     uint256 liquidationRewardD18;
        //     bytes32 oracleNodeId;
        //     address tokenAddress;
        //     uint256 minDelegationD18;
        // }
        uint256 issuanceRatioD18 = collateralConfiguration.issuanceRatioD18;
        (, uint256 collateralValue) = coreProxy.getPositionCollateral(accountId, poolId, token);
        int256 debtAmount = coreProxy.getPositionDebt(accountId, poolId, token);

        // Should check debt amount, can be negative, which indicates a credit balance
        return ((collateralValue - uint256(debtAmount)) * 1e18) / issuanceRatioD18;
    }

    function getIssuanceRatio() external view returns (uint256) {
        CollateralConfiguration.Data memory collateralConfiguration = coreProxy.getCollateralConfiguration(token);
        return collateralConfiguration.issuanceRatioD18;
    }

    /// internal functions

    function _mintUsd(uint256 _toMint) public {
        coreProxy.mintUsd(accountId, poolId, token, _toMint);
    }

    function _burnUsd(uint256 _toBurn) public {
        coreProxy.burnUsd(accountId, poolId, token, _toBurn);
    }

    function _increaseCollateral(uint256 _toStake) internal {
        // Approve coreProxy to spend tokens
        SafeERC20.safeApprove(IERC20(token), address(coreProxy), _toStake);
        coreProxy.deposit(accountId, token, _toStake);

        coreProxy.delegateCollateral(accountId, poolId, token, _toStake, 1e18);
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
