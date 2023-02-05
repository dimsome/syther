import { expect } from "chai";
import { Signer, Contract, BigNumberish } from "ethers";
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

const fromWei = (amount: BigNumberish) => ethers.utils.formatEther(amount.toString());

context("Tests cannon", async () => {
    let signer: Signer;
    let coreProxy: Contract;
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
            log("Balance: ", fromWei(balance));
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
            log("Collateral Address: ", collateralTypes[0].tokenAddress);
        });
        it("Should mint some collateralTokens for signer", async () => {
            const mintAmount = ethers.utils.parseEther("100");

            // Balance of signer before minting
            const balanceBefore = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            log("Balance before minting: ", fromWei(balanceBefore));
            expect(balanceBefore).eq(0);

            const tx = await collateralToken.connect(signer).mint(mintAmount, await signer.getAddress());
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(collateralToken, "Transfer")
                .withArgs(ethers.constants.AddressZero, await signer.getAddress(), mintAmount);

            // Balance of signer after minting
            const balanceAfter = await collateralToken.connect(signer).balanceOf(await signer.getAddress());
            log("Balance after minting: ", fromWei(balanceAfter));
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
            log("Balance before mint: ", fromWei(balanceBefore));
            expect(balanceBefore).eq(0);

            // Add the collateralToken to the account
            await collateralToken.connect(signer).mint(mintAmount, mainSyther.address);

            // Check if the collateralToken is added to the account
            const balanceAfter = await collateralToken.connect(signer).balanceOf(mainSyther.address);
            log("Balance after mint: ", fromWei(balanceAfter));
            expect(balanceAfter).eq(mintAmount);

            // No debt token before staking
            const debtTokenBalanceBefore = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance before staking: ", fromWei(debtTokenBalanceBefore));
            expect(debtTokenBalanceBefore).eq(0);

            // Check the preferedPool
            const preferedPool = await coreProxy.connect(signer).getPreferredPool();
            log("Prefered Pool: ", preferedPool);

            // deposit the collateralToken in the staking contract
            const tx = await mainSyther.connect(signer).stakeAndMint();
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(coreProxy, "CollateralDeposited")
                .withArgs(accountIdContract, mainSyther.address, mintAmount)
                .and.to.emit(collateralToken, "Transfer")
                .withArgs(mainSyther.address, COREPROXY.address, mintAmount);

            // Check allowance
            const allowance = await collateralToken.connect(signer).allowance(mainSyther.address, COREPROXY.address);
            log("Allowance: ", fromWei(allowance));
            // Back to 0 if the allowance is used
            expect(allowance).eq(0);

            // Check if the collateralToken is removed from the account
            const balanceAfterStaking = await collateralToken.connect(signer).balanceOf(mainSyther.address);
            log("Balance after staking: ", fromWei(balanceAfterStaking));
            expect(balanceAfterStaking).eq(0);

            // Check if debt token is minted
            const debtTokenBalanceAfter = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance after staking: ", fromWei(debtTokenBalanceAfter));
            expect(debtTokenBalanceAfter).gt(0);
        });
        it("Should burn snxUSD", async () => {
            const debtTokenBalanceBefore = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance before burning: ", fromWei(debtTokenBalanceBefore));
            expect(debtTokenBalanceBefore).gt(0);

            // Burn the debt token
            const tx = await mainSyther.connect(signer)._burnUsd(debtTokenBalanceBefore);
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .and.to.emit(snxusdToken, "Transfer")
                .withArgs(mainSyther.address, ethers.constants.AddressZero, debtTokenBalanceBefore);

            // Check if debt token is burned
            const debtTokenBalanceAfter = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance after unstaking: ", fromWei(debtTokenBalanceAfter));
            expect(debtTokenBalanceAfter).eq(0);
        });
        it("Should retrieve view parameters", async () => {
            // Get collaterization ratio use callStatic
            const collaterizationRatio = await mainSyther.connect(signer).callStatic.getCollateralizationRatio();
            log("Collaterization Ratio: ", fromWei(collaterizationRatio));
            expect(collaterizationRatio).gt(0);

            // Get debt balance
            const debtBalance = await mainSyther.connect(signer).callStatic.getDebtBalance();
            log("Debt Balance: ", fromWei(debtBalance));
            expect(debtBalance).gte(0);

            // Get mintable amount
            const mintableAmount = await mainSyther.connect(signer).callStatic.getMintableAmount();
            log("Mintable Amount: ", fromWei(mintableAmount));
            expect(mintableAmount).gt(0);
        });
        it("Should calculate the correct mintable amount", async () => {
            const mintableAmount = await mainSyther.connect(signer).callStatic.getMintableAmount();
            log("Mintable Amount: ", fromWei(mintableAmount));

            const issuanceRatio = await mainSyther.connect(signer).callStatic.getIssuanceRatio();
            log("Issuance Ratio: ", fromWei(issuanceRatio));

            // Save a snapshot of the current state
            const snapshotId = await ethers.provider.send("evm_snapshot", []);

            // Mint the debt token
            const tx = await mainSyther.connect(signer)._mintUsd(mintableAmount);
            const receipt = await tx.wait();

            expect(receipt.status).equal(1);
            expect(receipt)
                .to.emit(snxusdToken, "Transfer")
                .withArgs("0x0000000000000000000000000000000000000000", mainSyther.address, mintableAmount);

            // Check if the debt token is minted
            const debtTokenBalanceAfter = await snxusdToken.connect(signer).balanceOf(mainSyther.address);
            log("Debt token balance after minting: ", fromWei(debtTokenBalanceAfter));
            expect(debtTokenBalanceAfter).gt(0);

            // Revert to the snapshot and check if tx fails for minting more than mintable amount
            await ethers.provider.send("evm_revert", [snapshotId]);
            log("Reverted to snapshot: ", snapshotId);

            // Mint the debt token
            log("Trying to mint more than mintable amount");
            await expect(mainSyther.connect(signer)._mintUsd(mintableAmount.add(1))).to.be.revertedWithCustomError(
                coreProxy,
                "InsufficientCollateralRatio"
            );
        });
    });
});
