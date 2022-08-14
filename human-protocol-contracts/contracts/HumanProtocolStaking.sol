// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
import "./EscrowFactory.sol";
import "../interfaces/IStakingRewardsPool.sol";

contract HumanProtocolStaking is Ownable {
    enum UPDATE_ACTION {
        STAKED,
        UNSTAKED
    }
    enum UNSTAKE_STATUS {
        ENABLED,
        DISABLED,
        SLASHED
    }

    uint256 public totalStaked;
    IERC20 public immutable erc20Token;
    EscrowFactory public immutable escrowFactory;
    IStakingRewardsPool public immutable stackingRewardsPool;

    address adminAddress;
    address rewardsPoolAddress;

    mapping(address => uint256) stakedTokens;
    mapping(address => UNSTAKE_STATUS) unstakeStatus;
    mapping(address => int40) participantsRegistry;
    mapping(address => mapping(address => bool)) voteRegistry;

    event Staked(address indexed owner, address indexed token, uint256 amount);
    event Unstaked(
        address indexed from,
        address indexed to,
        uint256 amount,
        address indexed token
    );

    event ChangeAdmin(address indexed admin);
    event CreateEscrow(
        address indexed userAddress,
        address indexed escrowAddress,
        address[] trustedHandlers
    );
    event MarkNonTrustedAddress(address userAddress);

    event Voted(
        address indexed staker,
        address indexed voter,
        bool up,
        int40 votes
    );

    constructor(
        address erc20TokenAddress,
        address escrowFactoryAddress,
        address rewardsPool
    ) {
        erc20Token = IERC20(erc20TokenAddress);
        escrowFactory = EscrowFactory(escrowFactoryAddress);
        stackingRewardsPool = IStakingRewardsPool(rewardsPool);
        adminAddress = msg.sender;
        rewardsPoolAddress = rewardsPool;
    }

    function changeAdmin(address newAdmin)
        public
        onlyOwner
        isValidAddress(newAdmin)
    {
        require(newAdmin != adminAddress, "HPS01 - ADDRESS ALREADY SET");
        adminAddress = newAdmin;

        emit ChangeAdmin(newAdmin);
    }

    function stakeFrom(address owner, uint256 amount) external {
        _stakeFrom(owner, amount);
    }

    function _stakeFrom(address owner, uint256 amount)
        private
        nonZeroAmount(amount)
        onlyAdmin
        onlyTrustedAddress(owner)
    {
        bool transferred = erc20Token.transferFrom(
            owner,
            address(this),
            uint256(amount)
        );
        require(transferred, "HPS02 - TOKEN_FAILED_TRANSFER");

        updateTokenStaker(UPDATE_ACTION.STAKED, owner, amount);
    }

    function unstake(address to, uint256 amount) external {
        _unstake(to, amount);
    }

    function _unstake(address to, uint256 amount)
        private
        nonZeroAmount(amount)
        isStaker(to)
        isValidAddress(to)
        onlyAdmin
        canUnstake(to)
    {
        require(amount <= stakedTokens[to], "HPS03 - NOT_ENOUGH_STAKED");
        require(stakedTokens[to] > 0, "HPS04 - STAKED_BALANCE_ZERO");

        updateTokenStaker(UPDATE_ACTION.UNSTAKED, to, amount);

        bool transferred = erc20Token.transfer(to, amount);
        require(transferred, "HPS05 - TOKEN_FAILED_TRANSFER");
    }

    function updateTokenStaker(
        UPDATE_ACTION _status,
        address stakerAddress,
        uint256 amount
    ) private {
        if (_status == UPDATE_ACTION.STAKED) {
            stakedTokens[stakerAddress] += amount;
            totalStaked += amount;

            unstakeStatus[stakerAddress] = UNSTAKE_STATUS.ENABLED;
            emit Staked(stakerAddress, address(erc20Token), amount);
        } else {
            stakedTokens[stakerAddress] -= amount;
            totalStaked -= amount;

            emit Unstaked(
                stakerAddress,
                address(erc20Token),
                amount,
                address(erc20Token)
            );
        }
    }

    function getBalanceOf(address stakerAddress) public view returns (uint256) {
        return stakedTokens[stakerAddress];
    }

    function createEscrow(
        address stakerAddress,
        address[] memory trustedHandlers
    ) public isStaker(stakerAddress) onlyAdmin {
        address escrowAddress = escrowFactory.createEscrow(trustedHandlers);

        unstakeStatus[stakerAddress] = UNSTAKE_STATUS.DISABLED;

        emit CreateEscrow(stakerAddress, escrowAddress, trustedHandlers);
    }

    function markNonTrustedAddress(address stakerAddress)
        external
        onlyAdmin
        isValidAddress(stakerAddress)
    {
        erc20Token.transferFrom(
            address(this),
            rewardsPoolAddress,
            stakedTokens[stakerAddress]
        );
        stackingRewardsPool.notifyRewardAmount(
            address(stackingRewardsPool).balance
        );
        stakedTokens[stakerAddress] = 0;
        unstakeStatus[stakerAddress] = UNSTAKE_STATUS.SLASHED;

        emit MarkNonTrustedAddress(stakerAddress);
    }

    function finishedEscrow(address stakerAddress)
        external
        onlyAdmin
        isValidAddress(stakerAddress)
    {
        unstakeStatus[stakerAddress] = UNSTAKE_STATUS.ENABLED;
    }

    function voteUp(address staker)
        external
        isStaker(msg.sender)
        isValidAddress(msg.sender)
    {
        address voter = msg.sender;

        require(staker != msg.sender, "HPS06 - you cannot vote for yourself");
        require(
            voteRegistry[voter][staker] == false,
            "HPS15 -Sender already voted in this post"
        );
        participantsRegistry[staker] += 1;

        voteRegistry[voter][staker] = true;

        emit Voted(staker, voter, true, participantsRegistry[staker]);
    }

    function voteDown(address staker)
        external
        isStaker(msg.sender)
        isValidAddress(msg.sender)
    {
        address voter = msg.sender;

        require(staker != msg.sender, "HPS07 - you cannot vote for yourself");
        require(
            voteRegistry[voter][staker] == false,
            "HPS08 - Sender already voted in this post"
        );

        participantsRegistry[staker] >= 1
            ? participantsRegistry[staker] -= 1
            : participantsRegistry[staker] = 0;
        voteRegistry[voter][staker] = true;

        emit Voted(staker, voter, false, participantsRegistry[staker]);
    }

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "HPS09 - NOT AUTHORIZED");
        _;
    }
    modifier isStaker(address userAddress) {
        require(
            stakedTokens[userAddress] > 0,
            "HPS10 - THIS ADDRESS IS NOT AN STAKER"
        );
        _;
    }
    modifier nonZeroAmount(uint256 amount) {
        require(amount > 0, "HPS11 - NOT ALLOW ZERO AMOUNT");
        _;
    }

    modifier isValidAddress(address _address) {
        require(
            _address != address(0),
            "HPS12 - ADDRESS CANNOT BE ZERO_ADDRES"
        );
        _;
    }

    modifier canUnstake(address _address) {
        require(
            unstakeStatus[_address] == UNSTAKE_STATUS.ENABLED,
            "HPS13 - NOT AUTHORIZED"
        );
        _;
    }

    modifier onlyTrustedAddress(address _address) {
        require(
            unstakeStatus[_address] != UNSTAKE_STATUS.SLASHED,
            "HPS14 - NOT AUTHORIZED"
        );
        _;
    }
}
