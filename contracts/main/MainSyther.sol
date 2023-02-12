// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {ERC4626, ERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ICoreProxy, CollateralConfiguration} from "../interfaces/ICoreProxy.sol";

contract MainSyther is ERC4626, Ownable {
    // Constants
    address constant asset_ = 0x7B05A2baA61dFd56951c14597550c803e92B1C95; // SNX
    string constant name_ = "MainSyther";
    string constant symbol_ = "sySNX";

    // Immutable Variables
    uint128 public immutable accountId;
    uint128 public immutable poolId;

    // Config Variables
    uint256 public targetCollateralizationRatio;
    uint256 public collateralizationThreshold;

    // Synthetix Proxy Contract
    ICoreProxy public immutable coreProxy;

    constructor(address _synthetixProxy, uint128 _accountId) ERC4626(IERC20Metadata(asset_)) ERC20(name_, symbol_) {
        // Create Account
        coreProxy = ICoreProxy(_synthetixProxy);
        coreProxy.createAccount(_accountId);

        // Set Immutable Variables
        accountId = _accountId;
        poolId = uint128(coreProxy.getPreferredPool());

        // Set config variables
        targetCollateralizationRatio = coreProxy.getCollateralConfiguration(asset()).liquidationRatioD18 + 2e17;
        // Should check via contract call, for now hardcode
        collateralizationThreshold = coreProxy.getCollateralConfiguration(asset()).issuanceRatioD18;
    }

    /// view functions some need to be called via callStatic to avoid sending transactions

    function getCollateralizationRatio() public returns (uint256) {
        return coreProxy.getPositionCollateralizationRatio(accountId, poolId, asset());
    }

    function getDebtBalance() external returns (int256) {
        return coreProxy.getPositionDebt(accountId, poolId, asset());
    }

    function getMintableAmount() public returns (uint256) {
        CollateralConfiguration.Data memory collateralConfiguration = coreProxy.getCollateralConfiguration(asset());
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
        (, uint256 collateralValue) = coreProxy.getPositionCollateral(accountId, poolId, asset());
        int256 debtAmount = coreProxy.getPositionDebt(accountId, poolId, asset());

        // Should check debt amount, can be negative, which indicates a credit balance
        return ((collateralValue - uint256(debtAmount)) * 1e18) / issuanceRatioD18;
    }

    function getIssuanceRatio() external view returns (uint256) {
        CollateralConfiguration.Data memory collateralConfiguration = coreProxy.getCollateralConfiguration(asset());
        return collateralConfiguration.issuanceRatioD18;
    }

    /// Internal functions

    function stakeAndMint() public {
        // Check if no collateral is staked
        // TODO: Continue here

        uint256 collateralizationRatio = getCollateralizationRatio();
        uint256 stakeTokenBalance = IERC20(asset()).balanceOf(address(this));

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

    function _mintUsd(uint256 _toMint) public {
        coreProxy.mintUsd(accountId, poolId, asset(), _toMint);
    }

    function _burnUsd(uint256 _toBurn) public {
        coreProxy.burnUsd(accountId, poolId, asset(), _toBurn);
    }

    function _increaseCollateral(uint256 _toStake) internal {
        // Approve coreProxy to spend tokens
        SafeERC20.safeApprove(IERC20(asset()), address(coreProxy), _toStake);
        coreProxy.deposit(accountId, asset(), _toStake);

        coreProxy.delegateCollateral(accountId, poolId, asset(), _toStake, 1e18);
    }

    function _decreaseCollateral(uint256 _toUnstake) internal {
        coreProxy.withdraw(accountId, asset(), _toUnstake);
    }

    /// 4626 overrides
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        SafeERC20.safeTransferFrom(IERC20(asset()), caller, address(this), assets);
        stakeAndMint();
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }
}
