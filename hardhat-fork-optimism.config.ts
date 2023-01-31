import { HardhatUserConfig } from "hardhat/config";
import hardhatConfig from "./hardhat.config"



const config: HardhatUserConfig = {
  ...hardhatConfig,
  networks: {
    hardhat: {
      forking: {
        url: "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_OPTIMISM_API_KEY,
        blockNumber: 71313791,
      },
    },
  },
};

export default config;
