import { expect } from "chai";
import { Signer, Contract, providers } from "ethers";
import { ethers } from "hardhat";

// Import the ABI and address of the contracts
import COREPROXY from "../deployments/synthetix/CoreProxy.json";
import MINTABLETOKEN from "../deployments/collateralToken/MintableToken.json";

// ACCOUNTS
const accountId = Math.floor(Math.random() * 1000000000);

context("Tests cannon", () => {
    let signer: Signer;
    let coreProxy: Contract;
    let collateralConfigurationModule: Contract;
    let collateralToken: Contract;

    before(async () => {
        // Reset Network
        await ethers.provider.send("hardhat_reset", []);

        coreProxy = new ethers.Contract(COREPROXY.address, COREPROXY.abi, signer);
        collateralToken = new ethers.Contract(MINTABLETOKEN.address, MINTABLETOKEN.abi, signer);
    });

    describe("Test forking setup", () => {
        it("Should return current block number", async () => {
            const blockNumber = await ethers.provider.getBlockNumber();
            console.log("Block number: ", blockNumber);
            expect(blockNumber).to.be.greaterThanOrEqual(0);
        });

        // This test to check if the fork is working
        it("Should return the correct balance for default account", async () => {
            const [owner] = await ethers.getSigners();
            const balance = await owner.getBalance();
            console.log("Balance: ", balance.toString());
            expect(balance.eq(ethers.utils.parseEther("100")));

            signer = owner;
        });
    });
    describe("Opening Account with Synthetix CoreProxy, random accountId", () => {
        it("Should open an account with Synthetix CoreProxy", async () => {
            const tx = await coreProxy.connect(signer).createAccount(accountId);
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(coreProxy, "AccountCreated")
                .withArgs(await signer.getAddress(), accountId);

            console.log("Account created with id: ", accountId);
            console.log("Account created with address: ", await signer.getAddress());
        });
        it("Should retrieve the Collateral Type", async () => {
            // The token should be define already
            expect(collateralToken).to.be.not.null;
            expect(collateralToken.address).to.be.properAddress;

            const collateralTypes = await coreProxy.connect(signer).getCollateralConfigurations(false);
            console.log("In total found: ", collateralTypes.length);
            expect(collateralTypes.length).to.be.greaterThanOrEqual(0);

            // Verify that is the same address
            expect(collateralTypes[0].tokenAddress).to.be.equal(collateralToken.address);
        });
        it("Should mint some collateralTokens for signer", async () => {
            const mintAmount = ethers.utils.parseEther("100");

            // Balance of signer before minting
            const balanceBefore = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            console.log("Balance before minting: ", balanceBefore.toString());
            expect(balanceBefore).eq(0);

            const tx = await collateralToken.connect(signer).mint(mintAmount, await signer.getAddress());
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(collateralToken, "Transfer")
                .withArgs("0x0000000000000000000000000000000000000000", await signer.getAddress(), mintAmount);

            // Balance of signer after minting
            const balanceAfter = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            console.log("Balance after minting: ", balanceAfter.toString());
            expect(balanceAfter).eq(mintAmount);
        });
    });
});
