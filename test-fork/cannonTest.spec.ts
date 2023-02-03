import { expect } from "chai";
import { Signer, Contract } from "ethers";
import { ethers, network } from "hardhat";

// @ts-expect-error
import { log, error } from "mocha-logger";

// Import the ABI and address of the contracts
import COREPROXY from "../deployments/synthetix/CoreProxy.json";
import MINTABLETOKEN from "../deployments/collateralToken/MintableToken.json";
import SNXUSDTOKEN from "../deployments/synthetix/USDProxy.json";

// Import the ABI from typechain
import { MainSyther, MainSyther__factory } from "../types/generated";

// ACCOUNTS
const accountIdEOA = Math.floor(Math.random() * 1000000000);
const accountIdContract = 1337;

let snapshotId: any;

context("Tests cannon", async () => {
    let signer: Signer;
    let coreProxy: Contract;
    let collateralConfigurationModule: Contract;
    let collateralToken: Contract;
    let snxusdToken: Contract;
    let mainSyther: MainSyther;

    const setup = async () => {
        log("Setup");
        try {
            snapshotId = await network.provider.request({
                method: "evm_snapshot",
                params: [],
            });

            log("Snapshot ID: ", snapshotId);
        } catch (e) {
            error("Failed to snapshot network");
        }

        const [owner] = await ethers.getSigners();
        signer = owner;

        coreProxy = new ethers.Contract(COREPROXY.address, COREPROXY.abi, signer);
        collateralToken = new ethers.Contract(MINTABLETOKEN.address, MINTABLETOKEN.abi, signer);
        snxusdToken = new ethers.Contract(SNXUSDTOKEN.address, SNXUSDTOKEN.abi, signer);
    };

    before("Setup", async () => {
        await setup();
    });

    after("Reset Network", async () => {
        log("Resetting network");
        try {
            await network.provider.request({
                method: "evm_revert",
                params: [snapshotId],
            });
        } catch (e) {
            error("Failed to reset network");
            error(e);
        }
    });

    describe("Test Setup", () => {
        it("Should return current block number", async () => {
            const blockNumber = await ethers.provider.getBlockNumber();
            log("Block number: ", blockNumber);
            expect(blockNumber).to.be.greaterThanOrEqual(0);
        });

        // This test to check if the fork is working
        it("Should return the correct balance for default account", async () => {
            const balance = await signer.getBalance();
            log("Balance: ", balance.toString());
            expect(balance.eq(ethers.utils.parseEther("100")));
        });
    });

    describe("Opening Account with Synthetix CoreProxy, from EOA", () => {
        it("Should open an account with Synthetix CoreProxy", async () => {
            const tx = await coreProxy.connect(signer).createAccount(accountIdEOA);
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(coreProxy, "AccountCreated")
                .withArgs(await signer.getAddress(), accountIdEOA);

            log("Account created with id: ", accountIdEOA);
            log("Account created with address: ", await signer.getAddress());
        });
        it("Should retrieve the Collateral Type", async () => {
            // The token should be define already
            expect(collateralToken).to.be.not.null;
            expect(collateralToken.address).to.be.properAddress;

            const collateralTypes = await coreProxy.connect(signer).getCollateralConfigurations(false);
            log("In total found: ", collateralTypes.length);
            expect(collateralTypes.length).to.be.greaterThanOrEqual(0);

            // Verify that is the same address
            expect(collateralTypes[0].tokenAddress).to.be.equal(collateralToken.address);
        });
        it("Should mint some collateralTokens for signer", async () => {
            const mintAmount = ethers.utils.parseEther("100");

            // Balance of signer before minting
            const balanceBefore = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            log("Balance before minting: ", balanceBefore.toString());
            expect(balanceBefore).eq(0);

            const tx = await collateralToken.connect(signer).mint(mintAmount, await signer.getAddress());
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(collateralToken, "Transfer")
                .withArgs("0x0000000000000000000000000000000000000000", await signer.getAddress(), mintAmount);

            // Balance of signer after minting
            const balanceAfter = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            log("Balance after minting: ", balanceAfter.toString());
            expect(balanceAfter).eq(mintAmount);
        });
    });
    describe("MainSyther deployment and functional test", () => {
        it("Should open an account with Synthetix CoreProxy", async () => {
            // Deploy the mainSyther contract
            mainSyther = await new MainSyther__factory(signer).deploy(COREPROXY.address, accountIdContract);
            const receipt = await mainSyther.deployed();

            // Check if the contract is deployed
            expect(mainSyther).to.be.not.null;
            expect(mainSyther.address).to.be.properAddress;
            log("MainSyther deployed at: ", mainSyther.address);

            // Check if the account is created via the event
            expect(receipt).to.emit(coreProxy, "AccountCreated").withArgs(mainSyther.address, accountIdContract);

            // Check if the account is created via the getter function
            const accountOwner = await coreProxy.connect(signer).getAccountOwner(accountIdContract);
            expect(accountOwner).to.be.equal(mainSyther.address);

            log("Account created with id: ", accountIdContract);
        });
        it("Should deposit collateral Token in the staking contract and mint snxUSD", async () => {
            const mintAmount = ethers.utils.parseEther("100");

            const balanceBefore = await collateralToken.connect(signer).balanceOf(mainSyther.address);
            log("Balance before deposit: ", balanceBefore.toString());
            expect(balanceBefore).eq(0);

            // Add the collateralToken to the account
            await collateralToken.connect(signer).mint(mintAmount, mainSyther.address);

            // Check if the collateralToken is added to the account
            const balanceAfter = await collateralToken.connect(signer).balanceOf(mainSyther.address);
            log("Balance after deposit: ", balanceAfter.toString());
            expect(balanceAfter).eq(mintAmount);

            // No debt token before staking
            const debtTokenBalanceBefore = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance before staking: ", debtTokenBalanceBefore.toString());
            expect(debtTokenBalanceBefore).eq(0);

            // deposit the collateralToken in the staking contract
            const tx = await mainSyther.connect(signer).stake();
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(coreProxy, "CollateralDeposited")
                .withArgs(accountIdContract, mainSyther.address, mintAmount);

            // // Check if debt token is minted
            // const debtTokenBalanceAfter = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            // log("Debt token balance after staking: ", debtTokenBalanceAfter.toString());
            // expect(debtTokenBalanceAfter).eq(mintAmount);

            // // Check if the collateralToken is removed from the account
            // const balanceAfterStaking = await collateralToken.connect(signer).balanceOf(mainSyther.address);
            // log("Balance after staking: ", balanceAfterStaking.toString());
            // expect(balanceAfterStaking).eq(0);
        });
    });
});
