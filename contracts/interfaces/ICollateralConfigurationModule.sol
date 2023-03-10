// SPDX-License-Identifier: UNLICENSED
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.6.6. SEE SOURCE BELOW. !!
pragma solidity >=0.8.4 <0.9.0;

interface ICollateralConfigurationModule {
    error InvalidParameter(string parameter, string reason);
    error OverflowInt256ToUint256();
    error PositionOutOfBounds();
    error Unauthorized(address addr);
    error ValueAlreadyInSet();
    event CollateralConfigured(
        address indexed collateralType,
        CollateralConfiguration.Data config
    );

    function configureCollateral(
        CollateralConfiguration.Data memory config
    ) external;

    function getCollateralConfiguration(
        address collateralType
    ) external view returns (CollateralConfiguration.Data memory);

    function getCollateralConfigurations(
        bool hideDisabled
    ) external view returns (CollateralConfiguration.Data[] memory);

    function getCollateralPrice(
        address collateralType
    ) external view returns (uint256);
}

interface CollateralConfiguration {
    struct Data {
        bool depositingEnabled;
        uint256 issuanceRatioD18;
        uint256 liquidationRatioD18;
        uint256 liquidationRewardD18;
        bytes32 oracleNodeId;
        address tokenAddress;
        uint256 minDelegationD18;
    }
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[{"internalType":"string","name":"parameter","type":"string"},{"internalType":"string","name":"reason","type":"string"}],"name":"InvalidParameter","type":"error"},{"inputs":[],"name":"OverflowInt256ToUint256","type":"error"},{"inputs":[],"name":"PositionOutOfBounds","type":"error"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"Unauthorized","type":"error"},{"inputs":[],"name":"ValueAlreadyInSet","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"collateralType","type":"address"},{"components":[{"internalType":"bool","name":"depositingEnabled","type":"bool"},{"internalType":"uint256","name":"issuanceRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRewardD18","type":"uint256"},{"internalType":"bytes32","name":"oracleNodeId","type":"bytes32"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"minDelegationD18","type":"uint256"}],"indexed":false,"internalType":"struct CollateralConfiguration.Data","name":"config","type":"tuple"}],"name":"CollateralConfigured","type":"event"},{"inputs":[{"components":[{"internalType":"bool","name":"depositingEnabled","type":"bool"},{"internalType":"uint256","name":"issuanceRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRewardD18","type":"uint256"},{"internalType":"bytes32","name":"oracleNodeId","type":"bytes32"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"minDelegationD18","type":"uint256"}],"internalType":"struct CollateralConfiguration.Data","name":"config","type":"tuple"}],"name":"configureCollateral","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"collateralType","type":"address"}],"name":"getCollateralConfiguration","outputs":[{"components":[{"internalType":"bool","name":"depositingEnabled","type":"bool"},{"internalType":"uint256","name":"issuanceRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRewardD18","type":"uint256"},{"internalType":"bytes32","name":"oracleNodeId","type":"bytes32"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"minDelegationD18","type":"uint256"}],"internalType":"struct CollateralConfiguration.Data","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"hideDisabled","type":"bool"}],"name":"getCollateralConfigurations","outputs":[{"components":[{"internalType":"bool","name":"depositingEnabled","type":"bool"},{"internalType":"uint256","name":"issuanceRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRatioD18","type":"uint256"},{"internalType":"uint256","name":"liquidationRewardD18","type":"uint256"},{"internalType":"bytes32","name":"oracleNodeId","type":"bytes32"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"minDelegationD18","type":"uint256"}],"internalType":"struct CollateralConfiguration.Data[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"collateralType","type":"address"}],"name":"getCollateralPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/
