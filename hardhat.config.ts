import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-cannon";
import "@typechain/hardhat";

const hardhatConfig: HardhatUserConfig = {
    defaultNetwork: "cannon",
    solidity: {
        compilers: [
            {
                version: "0.8.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    typechain: {
        outDir: "types/generated",
        target: "ethers-v5",
    },
};

export default hardhatConfig;
