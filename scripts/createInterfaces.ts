import { generateSolidity } from "abi-to-sol";
import fs from "fs";

// List of contracts to generate interfaces for
const contracts = ["CollateralConfigurationModule", "AccountModule", "CoreProxy"];

const baseDir = "./contracts/interfaces";
fs.mkdirSync(baseDir, { recursive: true });

// Generate interfaces for each contract
contracts.forEach((contract) => {
    let abi;
    let solidityInterface;

    try {
        abi = require(`../deployments/synthetix/${contract}.json`).abi;
        solidityInterface = generateSolidity({
            abi,
            name: "I" + contract,
            solidityVersion: ">=0.8.4 <0.9.0",
            outputSource: true,
            prettifyOutput: true,
        });

        fs.writeFileSync(`${baseDir}/I${contract}.sol`, solidityInterface);
    } catch (e) {
        console.log(`Failed to generate interface for ${contract}`);
        console.log(e);
    }
});
