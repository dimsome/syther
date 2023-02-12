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

context("Test MainSyther contract using Cannon", async () => {
    let signer: Signer;
    let user: Signer;
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

        [signer, user] = await ethers.getSigners();

        coreProxy = new ethers.Contract(COREPROXY.address, COREPROXY.abi, signer);
        collateralToken = new ethers.Contract(MINTABLETOKEN.address, MINTABLETOKEN.abi, signer);
        snxusdToken = new ethers.Contract(SNXUSDTOKEN.address, SNXUSDTOKEN.abi, signer);
    };

    const reset = async () => {
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
    };

    before("Setup", async () => {
        await setup();
    });

    after("Reset Network", async () => {
        await reset();
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

    context("MainSyther deployment", async () => {
        let snapshotId: any;

        it("Should deploy MainSyther contract", async () => {
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

            // Save snapshot
            snapshotId = await network.provider.request({
                method: "evm_snapshot",
                params: [],
            });
        });

        describe("Core functional test direct interaction with contract", () => {
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
                const allowance = await collateralToken
                    .connect(signer)
                    .allowance(mainSyther.address, COREPROXY.address);
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

                // Get Account Id
                const accountId = await mainSyther.connect(signer).callStatic.accountId();
                log("Account Id: ", accountId);
                expect(accountId).eq(accountIdContract);

                // Get Pool Id
                const poolId = await mainSyther.connect(signer).callStatic.poolId();
                log("Pool Id: ", poolId);
                expect(poolId).to.not.be.null;

                // Get target collateralization ratio
                const targetCollateralizationRatio = await mainSyther
                    .connect(signer)
                    .callStatic.targetCollateralizationRatio();
                log("Target Collaterization Ratio: ", fromWei(targetCollateralizationRatio));
                expect(targetCollateralizationRatio).gt(0);

                // Get collateralization threshold
                const collateralizationThreshold = await mainSyther
                    .connect(signer)
                    .callStatic.collateralizationThreshold();
                log("Collaterization Threshold: ", fromWei(collateralizationThreshold));
                expect(collateralizationThreshold).gt(0);
            });
            it("Should calculate the correct mintable amount", async () => {
                const mintableAmount = await mainSyther.connect(signer).callStatic.getMintableAmount();
                log("Mintable Amount: ", fromWei(mintableAmount));

                const issuanceRatio = await mainSyther.connect(signer).callStatic.getIssuanceRatio();
                log("Issuance Ratio: ", fromWei(issuanceRatio));

                // Save a snapshot of the current state
                const snapshotId = await ethers.provider.send("evm_snapshot", []);

                // Mint more collateralToken
                const mintAmount = ethers.utils.parseEther("100");
                await collateralToken.connect(signer).mint(mintAmount, mainSyther.address);

                // Check if the collateralToken is added to the account
                const balanceAfter = await collateralToken.connect(signer).balanceOf(mainSyther.address);
                log("Balance after mint: ", fromWei(balanceAfter));
                expect(balanceAfter).eq(mintAmount);

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
            after("Reset back to fresh deployment", async () => {
                // reset back to earlier state
                await network.provider.request({
                    method: "evm_revert",
                    params: [snapshotId],
                });
            });
        });
        describe("Test with external EOA", () => {
            before("Fund user wallet", async () => {
                // Fund user wallet
                const amount = ethers.utils.parseEther("100");
                await collateralToken.connect(signer).mint(amount, user.getAddress());

                // Check if the collateralToken is added to the account
                const balanceAfter = await collateralToken.connect(signer).balanceOf(user.getAddress());
                log("User balance after mint: ", fromWei(balanceAfter));
                expect(balanceAfter).eq(amount);

                // Send ETH to user
                await signer.sendTransaction({
                    to: user.getAddress(),
                    value: ethers.utils.parseEther("1"),
                });

                // Check if User has ETH
                const userEthBalance = await ethers.provider.getBalance(user.getAddress());
                log("User ETH balance: ", fromWei(userEthBalance));
                expect(userEthBalance).gt(0);
            });
            it("Should call 4626 deposit", async () => {
                // Get the user's balance before deposit
                const balanceBefore = await collateralToken.connect(user).balanceOf(user.getAddress());
                log("User balance before deposit: ", fromWei(balanceBefore));
                expect(balanceBefore).gt(0);

                // Get user's sySNX balance before deposit
                const sySNXBalanceBefore = await mainSyther.connect(user).balanceOf(user.getAddress());
                log("User sySNX balance before deposit: ", fromWei(sySNXBalanceBefore));
                expect(sySNXBalanceBefore).eq(0);

                // Get user's allowance
                const allowance = await collateralToken.connect(user).allowance(user.getAddress(), mainSyther.address);
                log("User allowance: ", fromWei(allowance));
                expect(allowance).eq(0);

                // Approve the mainSyther contract to spend user's collateralToken
                const approveTx = await collateralToken.connect(user).approve(mainSyther.address, balanceBefore);
                const approveReceipt = await approveTx.wait();
                expect(approveReceipt.status).equal(1);
                expect(approveReceipt)
                    .to.emit(collateralToken, "Approval")
                    .withArgs(user.getAddress(), mainSyther.address, balanceBefore);

                // Get user's allowance
                const allowanceAfter = await collateralToken
                    .connect(user)
                    .allowance(user.getAddress(), mainSyther.address);
                log("User allowance after approve: ", fromWei(allowanceAfter));
                expect(allowanceAfter).eq(balanceBefore);

                // Deposit collateralToken
                const depositTx = await mainSyther.connect(user).deposit(balanceBefore, user.getAddress());
                const depositReceipt = await depositTx.wait();
                expect(depositReceipt.status).equal(1);
                expect(depositReceipt).to.emit(mainSyther, "Deposit");

                // Get user's sySNX balance after deposit
                const sySNXBalanceAfter = await mainSyther.connect(user).balanceOf(user.getAddress());
                log("User sySNX balance after deposit: ", fromWei(sySNXBalanceAfter));
                expect(sySNXBalanceAfter).gt(0);

                // Get the user's balance after deposit
                const balanceAfter = await collateralToken.connect(user).balanceOf(user.getAddress());
                log("User balance after deposit: ", fromWei(balanceAfter));
                expect(balanceAfter).eq(0);

                // The mainSyther contract should have staked collateralToken and minted snxUSD
                const mainSytherBalance = await collateralToken.connect(user).balanceOf(mainSyther.address);
                log("Main syther balance: ", fromWei(mainSytherBalance));
                expect(mainSytherBalance).eq(0);

                const snxusdTokenBalance = await snxusdToken.connect(user).balanceOf(mainSyther.address);
                log("Main syther snxUSD balance: ", fromWei(snxusdTokenBalance));
                expect(snxusdTokenBalance).gt(0);
            });
        });
    });
});
