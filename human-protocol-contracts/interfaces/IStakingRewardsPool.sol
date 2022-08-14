// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IStakingRewardsPool {
    function notifyRewardAmount(uint256 _amount) external;
}
