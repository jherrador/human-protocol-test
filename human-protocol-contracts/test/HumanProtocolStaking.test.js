const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("HumanProtocolStaking", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployContracts() {
    const [signer, secondary_account, third_account] = await hre.ethers.getSigners();


    const MyToken = await hre.ethers.getContractFactory("MyToken");
    const myTokenContract = await MyToken.deploy();

    await myTokenContract.deployed();

    const MyStakingToken = await hre.ethers.getContractFactory("MyToken");
    const myStakingTokenContract = await MyStakingToken.deploy();

    await myStakingTokenContract.deployed();

    await myTokenContract.mint(await signer.getAddress(), 1000);
    await myTokenContract.mint(await secondary_account.getAddress(), 1000);
    await myTokenContract.mint(await third_account.getAddress(), 1000);

    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactoryContract = await EscrowFactory.deploy(myTokenContract.address);

    await escrowFactoryContract.deployed();

    const StakingRewardsPool = await hre.ethers.getContractFactory("StakingRewardsPool");
    const stakingRewardsPoolContract = await StakingRewardsPool.deploy(myStakingTokenContract.address, myTokenContract.address);

    await stakingRewardsPoolContract.deployed();

    const HumanProtocolStaking = await hre.ethers.getContractFactory("HumanProtocolStaking");
    const humanProtocolStakingContract = await HumanProtocolStaking.deploy(myTokenContract.address, escrowFactoryContract.address, stakingRewardsPoolContract.address);

    await humanProtocolStakingContract.deployed();

    return { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract };
  }

  async function stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, secondary_account, amount_to_stake) {

    myTokenContract.connect(secondary_account).approve(await humanProtocolStakingContract.address, hre.ethers.constants.MaxUint256);

    return await humanProtocolStakingContract.connect(signer).stakeFrom(await secondary_account.getAddress(), amount_to_stake);
  }


  describe("Staking", function () {
    it("User can stake", async function () {
      const { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract } = await deployContracts();
      const [signer, secondary_account, third_account] = await hre.ethers.getSigners();

      await stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, secondary_account, 10);
      await stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, third_account, 10);

      const staked = await humanProtocolStakingContract.getBalanceOf(await secondary_account.getAddress());
      const totalStaked = await humanProtocolStakingContract.totalStaked();

      expect(staked).to.equal(10);
      expect(totalStaked).to.equal(20);
    });

    it("User cannot stake. Invalid Admin", async function () {
      const { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract } = await deployContracts();
      const [signer, secondary_account, third_account] = await hre.ethers.getSigners();

      myTokenContract.connect(secondary_account).approve(await humanProtocolStakingContract.address, hre.ethers.constants.MaxUint256);
      await expect(humanProtocolStakingContract.connect(secondary_account).stakeFrom(await secondary_account.getAddress(), 10)).to.be.revertedWith('HPS09 - NOT AUTHORIZED');
    });

    it("User can unstake", async function () {
      const { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract } = await deployContracts();
      const [signer, secondary_account, third_account] = await hre.ethers.getSigners();

      await stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, secondary_account, 10);
      await stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, third_account, 20);

      let staked = await humanProtocolStakingContract.getBalanceOf(await secondary_account.getAddress());

      await humanProtocolStakingContract.connect(signer).unstake(await secondary_account.getAddress(), 1);

      staked = await humanProtocolStakingContract.getBalanceOf(await secondary_account.getAddress());
      totalStaked = await humanProtocolStakingContract.totalStaked();

      expect(staked).to.equal(9);
      expect(totalStaked).to.equal(29);

    });

    it("Not staker cannot create any Escrow", async function () {
      const { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract } = await deployContracts();
      const [signer, secondary_account, third_account] = await hre.ethers.getSigners();


      await expect(humanProtocolStakingContract.connect(signer).createEscrow(await secondary_account.getAddress(), [])).to.be.revertedWith('HPS10 - THIS ADDRESS IS NOT AN STAKER');
    });

    it("staker create an Escrow", async function () {
      const { myTokenContract, myStakingTokenContract, escrowFactoryContract, stakingRewardsPoolContract, humanProtocolStakingContract } = await deployContracts();
      const [signer, secondary_account, third_account] = await hre.ethers.getSigners();

      await stakeInHumanProtocol(myTokenContract, humanProtocolStakingContract, signer, secondary_account, 10);
      const tx = await humanProtocolStakingContract.connect(signer).createEscrow(await secondary_account.getAddress(), []);
      const result = await tx.wait();

      expect(await escrowFactoryContract.hasEscrow(result.events[1].args["escrowAddress"])).to.true;
    });
  });
});
