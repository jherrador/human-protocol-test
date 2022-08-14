const { ethers } = require("ethers");
const ERC20_ABI = require("../ABI/erc20.abi");
const HPS_ABI = require("../ABI/HPS.abi");

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const AMOUNT_TO_STAKE = 1000;
const humanProtocolStakingContract = new ethers.Contract(process.env.STAKING_CONTRACT_ADDRESS, HPS_ABI, provider);
const myTokenContract = new ethers.Contract(process.env.ERC20_TOKEN_ADDRESS, ERC20_ABI, provider);

class ApiService {
    async stake() {
        const signer = await provider.getSigner(0);
        const secondary_account = await provider.getSigner(1);
        const secondaryAccountAddress = await secondary_account.getAddress();
        const tokenBalance = await myTokenContract.balanceOf(secondaryAccountAddress);

        if (tokenBalance.toNumber() < AMOUNT_TO_STAKE) {
            await myTokenContract.connect(secondary_account).mint(secondaryAccountAddress, AMOUNT_TO_STAKE);
        }


        await myTokenContract.connect(secondary_account).approve(humanProtocolStakingContract.address, ethers.constants.MaxUint256);

        const txHash = await humanProtocolStakingContract.connect(signer).stakeFrom(secondaryAccountAddress, AMOUNT_TO_STAKE);

        const staked = await humanProtocolStakingContract.getBalanceOf(secondaryAccountAddress);

        return [staked.toNumber(), secondaryAccountAddress, txHash.hash];
    }

    async escrow() {
        const signer = await provider.getSigner(0);
        const secondary_account = await provider.getSigner(1);
        const secondaryAccountAddress = await secondary_account.getAddress();

        const tx = await humanProtocolStakingContract.connect(signer).createEscrow(secondaryAccountAddress, []);
        return tx.hash
    }
}
module.exports = ApiService
