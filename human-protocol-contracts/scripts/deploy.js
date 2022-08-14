// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  const MyToken = await hre.ethers.getContractFactory("MyToken");
  const myTokenContract = await MyToken.deploy();

  await myTokenContract.deployed();

  const MyStakingToken = await hre.ethers.getContractFactory("MyToken");
  const myStakingTokenContract = await MyStakingToken.deploy();

  await myStakingTokenContract.deployed();

  const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
  const escrowFactoryContract = await EscrowFactory.deploy(myTokenContract.address);

  await escrowFactoryContract.deployed();

  const StakingRewardsPool = await hre.ethers.getContractFactory("StakingRewardsPool");
  const stakingRewardsPoolContract = await StakingRewardsPool.deploy(myStakingTokenContract.address, myTokenContract.address);

  await stakingRewardsPoolContract.deployed();


  const HumanProtocolStaking = await hre.ethers.getContractFactory("HumanProtocolStaking");
  const humanProtocolStakingContract = await HumanProtocolStaking.deploy(myTokenContract.address, escrowFactoryContract.address, stakingRewardsPoolContract.address);

  await humanProtocolStakingContract.deployed();
  console.log(`

  *** OTHER DEPLOYED CONTRACTS ***
  - MyStakingToken => ${myStakingTokenContract.address}
  - EscrowFactory => ${escrowFactoryContract.address}
  - StakingRewardsPool => ${stakingRewardsPoolContract.address}

  *** RELEVANT CONTRACTS ***
  - MyToken => ${myTokenContract.address}
  - HumanProtocolStaking => ${humanProtocolStakingContract.address}
  `)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
