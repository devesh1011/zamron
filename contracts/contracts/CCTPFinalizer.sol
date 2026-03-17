// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ConfidentialUSDC} from "./ConfidentialUSDC.sol";

interface IMessageTransmitterV2 {
    function receiveMessage(bytes calldata message, bytes calldata attestation) external returns (bool success);
}


contract CCTPFinalizer is Ownable {
    using SafeERC20 for IERC20;

    address public constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address public constant SEPOLIA_TOKEN_MESSENGER_V2 = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    uint32 public constant SEPOLIA_DOMAIN = 0;

    IMessageTransmitterV2 public immutable messageTransmitter;
    IERC20 public immutable usdc;
    ConfidentialUSDC public immutable cUSDC;

    mapping(uint32 => bytes32) public remoteTokenMessengers;

    event RemoteTokenMessengerSet(uint32 indexed domain, bytes32 messenger);
    event MessageFinalizedAndWrapped(
        bytes32 indexed messageHash,
        uint32 indexed sourceDomain,
        address indexed user,
        uint256 usdcAmount
    );

    error InvalidRecipient();
    error InvalidDestinationDomain(uint32 destinationDomain);
    error InvalidDestinationCaller();
    error InvalidMintRecipient();
    error InvalidHookData();
    error InvalidRemoteMessenger(uint32 sourceDomain, bytes32 sender);
    error MessageReceiveFailed();
    error NoUSDCReceived();

    constructor(address messageTransmitter_, address cUSDC_) Ownable(msg.sender) {
        messageTransmitter = IMessageTransmitterV2(messageTransmitter_);
        usdc = IERC20(SEPOLIA_USDC);
        cUSDC = ConfidentialUSDC(cUSDC_);
    }

    function setRemoteTokenMessenger(uint32 domain, address messenger) external onlyOwner {
        bytes32 messengerBytes32 = _addressToBytes32(messenger);
        remoteTokenMessengers[domain] = messengerBytes32;
        emit RemoteTokenMessengerSet(domain, messengerBytes32);
    }

    function finalizeAndWrap(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (address user, uint256 wrappedAmount) {
        ParsedMessage memory parsed = _parseMessage(message);

        if (parsed.destinationDomain != SEPOLIA_DOMAIN) {
            revert InvalidDestinationDomain(parsed.destinationDomain);
        }
        if (_bytes32ToAddress(parsed.recipient) != SEPOLIA_TOKEN_MESSENGER_V2) {
            revert InvalidRecipient();
        }
        if (_bytes32ToAddress(parsed.destinationCaller) != address(this)) {
            revert InvalidDestinationCaller();
        }
        if (_bytes32ToAddress(parsed.sender) != _bytes32ToAddress(remoteTokenMessengers[parsed.sourceDomain])) {
            revert InvalidRemoteMessenger(parsed.sourceDomain, parsed.sender);
        }
        if (_bytes32ToAddress(parsed.mintRecipient) != address(this)) {
            revert InvalidMintRecipient();
        }
        if (parsed.hookData.length != 32) {
            revert InvalidHookData();
        }

        user = abi.decode(parsed.hookData, (address));
        if (user == address(0)) revert InvalidHookData();

        uint256 balanceBefore = usdc.balanceOf(address(this));
        bool success = messageTransmitter.receiveMessage(message, attestation);
        if (!success) revert MessageReceiveFailed();
        uint256 balanceAfter = usdc.balanceOf(address(this));

        wrappedAmount = balanceAfter - balanceBefore;
        if (wrappedAmount == 0) revert NoUSDCReceived();

        usdc.forceApprove(address(cUSDC), wrappedAmount);
        cUSDC.wrap(user, wrappedAmount);

        emit MessageFinalizedAndWrapped(keccak256(message), parsed.sourceDomain, user, wrappedAmount);
    }

    function rescueUSDC(address to, uint256 amount) external onlyOwner {
        usdc.safeTransfer(to, amount);
    }

    struct ParsedMessage {
        uint32 sourceDomain;
        uint32 destinationDomain;
        bytes32 sender;
        bytes32 recipient;
        bytes32 destinationCaller;
        bytes32 mintRecipient;
        bytes hookData;
    }

    function _parseMessage(bytes calldata message) internal pure returns (ParsedMessage memory parsed) {
        parsed.sourceDomain = _readUint32(message, 4);
        parsed.destinationDomain = _readUint32(message, 8);
        parsed.sender = _readBytes32(message, 44);
        parsed.recipient = _readBytes32(message, 76);
        parsed.destinationCaller = _readBytes32(message, 108);
        parsed.mintRecipient = _readBytes32(message, 184);
        parsed.hookData = message[376:];
    }

    function _readUint32(bytes calldata data, uint256 start) private pure returns (uint32 value) {
        assembly {
            value := shr(224, calldataload(add(data.offset, start)))
        }
    }

    function _readBytes32(bytes calldata data, uint256 start) private pure returns (bytes32 value) {
        assembly {
            value := calldataload(add(data.offset, start))
        }
    }

    function _bytes32ToAddress(bytes32 value) private pure returns (address) {
        return address(uint160(uint256(value)));
    }

    function _addressToBytes32(address value) private pure returns (bytes32) {
        return bytes32(uint256(uint160(value)));
    }
}
