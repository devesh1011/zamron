// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {
    ERC7984ERC20Wrapper,
    ERC7984
} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

contract ConfidentialUSDC is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    address public constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC7984ERC20Wrapper(IERC20(SEPOLIA_USDC)) ERC7984(name_, symbol_, uri_) {}
}
