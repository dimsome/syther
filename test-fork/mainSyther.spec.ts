import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { IERC20, IERC20__factory, MainSyther, MainSyther__factory, Staker, Staker__factory } from "../types/generated";

// CONFIG

const NAME = "mainSyther";
const SYMBOL = "sySNX";
const ADDRESS_DEAD = "0x000000000000000000000000000000000000dEaD";

// CONTRACTS
const SNX_ADDRESS = "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4";
const SNX_WHALE_ADDRESS = "0xacd03d601e5bb1b275bb94076ff46ed9d753435a";
const SNX_RESOLVER_ADDRESS = "0x95A6a3f44a70172E7d50a9e28c85Dfd712756B8C";
const sUSD_ADDRESS = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";

let SNX_Contract: IERC20;
let sUSD_Contract: IERC20;
let stakerContract: Staker;
let mainSytherContract: MainSyther;
let SNX_WhaleImpersonated: Signer;

let signer: Signer;

context("Tests for mainSyther contract", () => {
    SNX_Contract = IERC20__factory.connect(SNX_ADDRESS, ethers.provider);
    sUSD_Contract = IERC20__factory.connect(sUSD_ADDRESS, ethers.provider);

    describe("Test forking setup", () => {
        it("Should return current block number", async function () {
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

        it("Should return the correct balance for SNX whale", async () => {
            const balance = await SNX_Contract.balanceOf(SNX_WHALE_ADDRESS);
            console.log("Balance: ", balance.toString());
            expect(balance.gt(0));
        });

        it("Should impersonate SNX_WHALE_ADDRESS", async () => {
            SNX_WhaleImpersonated = await ethers.getImpersonatedSigner(SNX_WHALE_ADDRESS);
            expect(SNX_WhaleImpersonated).to.be.not.null;

            // Test if SNX_WHALE_ADDRESS is impersonated by sending a transaction
            const balanceBefore = await SNX_Contract.connect(SNX_WhaleImpersonated).balanceOf(SNX_WHALE_ADDRESS);
            console.log("Balance Before: ", balanceBefore.toString());

            const tx = await SNX_Contract.connect(SNX_WhaleImpersonated).transfer(ADDRESS_DEAD, 1);
            await tx.wait();

            const balanceAfter = await SNX_Contract.connect(SNX_WhaleImpersonated).balanceOf(SNX_WHALE_ADDRESS);
            console.log("Balance After: ", balanceAfter.toString());

            expect(balanceAfter).lt(balanceBefore);
        });
    });

    describe("Deploy contracts", () => {
        it("Should deploy Staker contract", async () => {
            // Deploy Staker contract
            stakerContract = await new Staker__factory(ethers.provider.getSigner(0)).deploy(
                SNX_RESOLVER_ADDRESS,
                SNX_ADDRESS
            );
            await stakerContract.deployed();

            // Check if Staker contract is deployed
            expect(stakerContract.address).to.be.properAddress;
            console.log("Deployed Staker contract address: ", stakerContract.address);

            // Check if Staker contract has the correct resolver address
            expect(await stakerContract.synthetixResolver()).equal(SNX_RESOLVER_ADDRESS);
        });
        it("Should deploy mainSyther contract", async () => {
            // Deploy mainSyther contract
            mainSytherContract = await new MainSyther__factory(ethers.provider.getSigner(0)).deploy(
                SNX_ADDRESS,
                NAME,
                SYMBOL,
                stakerContract.address
            );
            await mainSytherContract.deployed();

            // Check if mainSyther contract is deployed
            expect(mainSytherContract.address).to.be.properAddress;
            console.log("Deployed mainSyther contract address: ", mainSytherContract.address);

            // Check if mainSyther contract has the correct token address, name and symbol
            expect(await mainSytherContract.asset()).equal(SNX_ADDRESS);
            expect(await mainSytherContract.name()).equal(NAME);
            expect(await mainSytherContract.symbol()).equal(SYMBOL);
            expect(await mainSytherContract.stakerContract()).equal(stakerContract.address);

            // Check if approvals are set correctly
            expect(await SNX_Contract.allowance(mainSytherContract.address, stakerContract.address)).equal(
                ethers.constants.MaxUint256
            );
        });
        it("Should set mainSyther contract as the staker main contract", async () => {
            // Check if is address(0) before setting
            expect(await stakerContract.mainSyther()).equal(ethers.constants.AddressZero);

            // Set mainSyther contract as the staker main contract
            const tx = await stakerContract.init(mainSytherContract.address);

            // Check if mainSyther contract is set correctly
            expect(await stakerContract.mainSyther()).equal(mainSytherContract.address);
        });
        it("Should deposit SNX and mint sySNX", async () => {
            // Check WHALE balances before deposit
            const WHALE_balanceBefore = await SNX_Contract.balanceOf(SNX_WHALE_ADDRESS);
            const WHALE_sySNX_balanceBefore = await mainSytherContract.balanceOf(SNX_WHALE_ADDRESS);

            expect(WHALE_balanceBefore).gt(0);
            expect(WHALE_sySNX_balanceBefore).eq(0);

            console.log("WHALE_balanceBefore: ", WHALE_balanceBefore.toString());
            console.log("WHALE_sySNX_balanceBefore: ", WHALE_sySNX_balanceBefore.toString());

            // Check mainSyther contract balance before deposit
            const mainSytherContract_balanceBefore = await SNX_Contract.balanceOf(mainSytherContract.address);
            const mainSytherContract_totalAssetsBefore = await mainSytherContract.totalAssets();

            console.log("mainSytherContract_balanceBefore: ", mainSytherContract_balanceBefore.toString());
            console.log("mainSytherContract_totalAssetsBefore: ", mainSytherContract_totalAssetsBefore.toString());

            expect(mainSytherContract_balanceBefore).eq(0);
            expect(mainSytherContract_totalAssetsBefore).eq(0);

            // Approve mainSyther contract to spend SNX
            const txApprove = await SNX_Contract.connect(SNX_WhaleImpersonated).approve(
                mainSytherContract.address,
                ethers.utils.parseEther("100")
            );
            await txApprove.wait();

            // Deposit SNX
            const txDeposit = await mainSytherContract
                .connect(SNX_WhaleImpersonated)
                .deposit(ethers.utils.parseEther("100"), SNX_WhaleImpersonated.getAddress());
            await txDeposit.wait();

            // Check WHALE balances after deposit
            const WHALE_balanceAfter = await SNX_Contract.balanceOf(SNX_WHALE_ADDRESS);
            const WHALE_sySNX_balanceAfter = await mainSytherContract.balanceOf(SNX_WHALE_ADDRESS);

            expect(WHALE_balanceAfter).lt(WHALE_balanceBefore);
            expect(WHALE_sySNX_balanceAfter).gt(WHALE_sySNX_balanceBefore);

            console.log("WHALE_balanceAfter: ", WHALE_balanceAfter.toString());
            console.log("WHALE_sySNX_balanceAfter: ", WHALE_sySNX_balanceAfter.toString());

            // Check mainSyther contract balance after deposit
            const mainSytherContract_balanceAfter = await SNX_Contract.balanceOf(mainSytherContract.address);
            const mainSytherContract_totalAssetsAfter = await mainSytherContract.totalAssets();
            const mainSytherContract_totalSupply = await mainSytherContract.totalSupply();

            console.log("mainSytherContract_balanceAfter: ", mainSytherContract_balanceAfter.toString());
            console.log("mainSytherContract_totalAssetsAfter: ", mainSytherContract_totalAssetsAfter.toString());
            console.log("mainSytherContract_totalSupply: ", mainSytherContract_totalSupply.toString());

            expect(mainSytherContract_balanceAfter).gt(mainSytherContract_balanceBefore);
            expect(mainSytherContract_totalAssetsAfter).gt(mainSytherContract_totalAssetsBefore);
            expect(mainSytherContract_totalSupply).equal(mainSytherContract_totalAssetsAfter);

            // Staker contract should not have any SNX at this point
            const stakerContract_balance = await SNX_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_balance).eq(0);
        });
        it.skip("Should withdraw SNX and burn sySNX", async () => {});
        it("Should stake SNX and mint max sUSD", async () => {
            // Make sure mainSyther contract has SNX
            const mainSytherContract_balanceBefore = await SNX_Contract.balanceOf(mainSytherContract.address);
            expect(mainSytherContract_balanceBefore).gt(0);

            console.log("mainSytherContract_balanceBefore: ", mainSytherContract_balanceBefore.toString());

            // Check Staker contract balance before stake
            const stakerContract_balanceBefore = await SNX_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_balanceBefore).eq(0);
            const stakerContract_sUSD_balanceBefore = await sUSD_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_sUSD_balanceBefore).eq(0);

            console.log("stakerContract_balanceBefore: ", stakerContract_balanceBefore.toString());
            console.log("stakerContract_sUSD_balanceBefore: ", stakerContract_sUSD_balanceBefore.toString());

            // Call stakeMax function
            const txStakeMax = await mainSytherContract.connect(signer).stakeMax();
            await txStakeMax.wait();

            // Check Staker contract balance after stake
            const stakerContract_balanceAfter = await SNX_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_balanceAfter).gt(stakerContract_balanceBefore);
            const stakerContract_sUSD_balanceAfter = await sUSD_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_sUSD_balanceAfter).gt(stakerContract_sUSD_balanceBefore);

            console.log("stakerContract_balanceAfter: ", stakerContract_balanceAfter.toString());
            console.log("stakerContract_sUSD_balanceAfter: ", stakerContract_sUSD_balanceAfter.toString());

            // Check mainSyther contract balance after stake
            const mainSytherContract_balanceAfter = await SNX_Contract.balanceOf(mainSytherContract.address);
            expect(mainSytherContract_balanceAfter).eq(0);

            expect(mainSytherContract_balanceAfter).lt(mainSytherContract_balanceBefore);
            console.log("mainSytherContract_balanceAfter: ", mainSytherContract_balanceAfter.toString());
        });
        // This test is not working, need to advance time to 7 days
        // After 7 days, the synth or SNX rate is invalid (Oracle issue?)
        it.skip("Should unstake SNX and burn max sUSD", async () => {
            // Make sure there is sUSD and SNX in Staker contract
            const stakerContract_balanceBefore = await SNX_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_balanceBefore).gt(0);
            const stakerContract_sUSD_balanceBefore = await sUSD_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_sUSD_balanceBefore).gt(0);

            console.log("stakerContract_balanceBefore: ", stakerContract_balanceBefore.toString());
            console.log("stakerContract_sUSD_balanceBefore: ", stakerContract_sUSD_balanceBefore.toString());

            // Call unstakeMax function forward time 7 day
            await time.increase(time.duration.days(7));
            const txUnstakeMax = await mainSytherContract.connect(signer).burnMax();
            await txUnstakeMax.wait();

            // Check Staker contract balance after unstake
            const stakerContract_balanceAfter = await SNX_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_balanceAfter).eq(stakerContract_balanceBefore);
            const stakerContract_sUSD_balanceAfter = await sUSD_Contract.balanceOf(stakerContract.address);
            expect(stakerContract_sUSD_balanceAfter).eq(0);

            console.log("stakerContract_balanceAfter: ", stakerContract_balanceAfter.toString());
            console.log("stakerContract_sUSD_balanceAfter: ", stakerContract_sUSD_balanceAfter.toString());
        });
    });
});
