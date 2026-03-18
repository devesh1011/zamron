// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";

interface IERC7984ERC20WrapperWithRequester is IERC7984ERC20Wrapper {
    function unwrapRequester(bytes32 unwrapRequestId) external view returns (address);
    // euint64 overload — avoids re-encrypting an already-computed internal handle
    function unwrap(address from, address to, euint64 amount) external returns (bytes32);
}

contract CUSDCUnwrapper is ZamaEthereumConfig {
    IERC7984ERC20WrapperWithRequester public immutable cUSDC;

    event SwapRequested(address indexed user, bytes32 indexed unwrapRequestId);
    event SwapFinalized(address indexed user, bytes32 indexed unwrapRequestId, uint64 cleartextAmount);

    constructor(address cUSDC_) {
        cUSDC = IERC7984ERC20WrapperWithRequester(cUSDC_);
    }

    function swapConfidentialToERC20(
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) external returns (bytes32 unwrapRequestId) {
        euint64 amount = FHE.fromExternal(encryptedInput, inputProof);
        // Grant cUSDC transient access to use the encrypted amount handle in confidentialTransferFrom
        FHE.allowTransient(amount, address(cUSDC));
        euint64 amountTransferred = cUSDC.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Grant cUSDC transient access to use amountTransferred in _unwrap → _burn
        FHE.allowTransient(amountTransferred, address(cUSDC));
        // Use the euint64 overload — passing the internal handle directly avoids
        // the proof-verification path of the externalEuint64 overload (which
        // would revert with an empty inputProof).
        unwrapRequestId = cUSDC.unwrap(
            address(this),
            msg.sender,
            amountTransferred
        );
        emit SwapRequested(msg.sender, unwrapRequestId);
    }

    function finalizeSwap(
        bytes32 unwrapRequestId,
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) external {
        address receiver = cUSDC.unwrapRequester(unwrapRequestId);
        cUSDC.finalizeUnwrap(unwrapRequestId, cleartextAmount, decryptionProof);
        emit SwapFinalized(receiver, unwrapRequestId, cleartextAmount);
    }
}
