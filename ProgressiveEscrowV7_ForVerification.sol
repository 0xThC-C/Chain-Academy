// Sources flattened with hardhat v2.24.2 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

pragma solidity ^0.8.20;


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

pragma solidity ^0.8.20;


// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

pragma solidity ^0.8.20;


/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;


/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.3.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/ProgressiveEscrowV7_RemixOptimized.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;





/**
 * @title ProgressiveEscrowV7 - REMIX OPTIMIZED
 * @dev Ultra-optimized for Remix IDE compilation - eliminates ALL stack too deep errors
 * IMPORTANT: Configure Remix with: viaIR: true, optimizer enabled, runs: 100
 */
contract ProgressiveEscrowV7 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PLATFORM_FEE_PERCENT = 10;
    uint256 public constant HEARTBEAT_INTERVAL = 30;
    uint256 public constant GRACE_PERIOD = 60;
    uint256 public constant AUTO_RELEASE_DELAY = 7 days;
    uint256 public constant SESSION_START_TIMEOUT = 15 minutes;
    address public constant ETH_TOKEN = address(0);

    // State variables
    address public platformWallet;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => ProgressiveSession) public sessions;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => bool) public usedSessionIds;

    enum SessionStatus { Created, Active, Paused, Completed, Cancelled, Expired }

    // REMIX OPTIMIZATION: Reduced struct size to minimize memory footprint
    struct ProgressiveSession {
        bytes32 sessionId;
        address student;
        address mentor;
        address paymentToken;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        uint256 startTime;
        uint256 lastHeartbeat;
        uint256 pausedTime;
        uint256 createdAt;
        SessionStatus status;
        bool isActive;
        bool isPaused;
        bool surveyCompleted;
    }

    // REMIX OPTIMIZATION: Small structs for grouping parameters (max 8 fields each)
    struct CreateParams {
        bytes32 sessionId;
        address mentor;
        address paymentToken;
        uint256 amount;
        uint256 durationMinutes;
        uint256 nonce;
    }

    struct PaymentCalc {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 sessionDuration;
        uint256 elapsedMinutes;
    }

    // Events
    event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 amount, address token);
    event SessionStarted(bytes32 indexed sessionId, uint256 startTime);
    event SessionPaused(bytes32 indexed sessionId, uint256 pausedAt, string reason);
    event SessionResumed(bytes32 indexed sessionId, uint256 resumedAt);
    event SessionCompleted(bytes32 indexed sessionId, uint256 mentorAmount, uint256 platformFee, uint256 completedAt);
    event SessionCancelled(bytes32 indexed sessionId, uint256 refundAmount, uint256 cancelledAt);
    event SessionExpired(bytes32 indexed sessionId, uint256 refundAmount);
    event ProgressivePaymentReleased(bytes32 indexed sessionId, uint256 amount, uint256 totalReleased, uint256 timestamp);
    event HeartbeatReceived(bytes32 indexed sessionId, uint256 timestamp);
    event EmergencyRelease(bytes32 indexed sessionId, uint256 amount, string reason);
    event TokenSupportUpdated(address token, bool supported);

    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        supportedTokens[ETH_TOKEN] = true;
        _autoEnableTokens();
        emit TokenSupportUpdated(ETH_TOKEN, true);
    }

    // REMIX OPTIMIZATION: Minimal function with direct assignments
    function _autoEnableTokens() private {
        uint256 cId = block.chainid;
        
        if (cId == 42161) { // Arbitrum
            supportedTokens[0xaf88d065e77c8cC2239327C5EDb3A432268e5831] = true;
            supportedTokens[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9] = true;
        } else if (cId == 8453) { // Base  
            supportedTokens[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913] = true;
            supportedTokens[0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2] = true;
        } else if (cId == 10) { // Optimism
            supportedTokens[0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85] = true;
            supportedTokens[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58] = true;
        } else if (cId == 137) { // Polygon
            supportedTokens[0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174] = true;
            supportedTokens[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = true;
        }
    }

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit TokenSupportUpdated(token, true);
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenSupportUpdated(token, false);
    }

    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    // REMIX OPTIMIZATION: Single parameter struct to avoid parameter limit
    function createProgressiveSession(
        bytes32 sessionId,
        address mentor,
        address paymentToken,
        uint256 amount,
        uint256 durationMinutes,
        uint256 nonce
    ) external payable nonReentrant whenNotPaused {
        
        // Create struct within function to minimize stack usage
        CreateParams memory p = CreateParams(sessionId, mentor, paymentToken, amount, durationMinutes, nonce);
        
        // All validations in single block
        {
            require(p.mentor != address(0) && p.mentor != msg.sender, "Invalid mentor");
            require(supportedTokens[p.paymentToken], "Unsupported token");
            require(p.amount > 0 && p.durationMinutes > 0, "Invalid amounts");
            require(sessions[p.sessionId].student == address(0), "Session exists");
            require(p.nonce == userNonces[msg.sender], "Invalid nonce");
            require(!usedSessionIds[p.sessionId], "Session ID used");
        }
        
        // Handle payment in separate block
        {
            userNonces[msg.sender]++;
            if (p.paymentToken == ETH_TOKEN) {
                require(msg.value == p.amount, "ETH mismatch");
            } else {
                require(msg.value == 0, "No ETH for ERC20");
                IERC20(p.paymentToken).safeTransferFrom(msg.sender, address(this), p.amount);
            }
        }
        
        // Initialize session
        _initSession(p);
    }

    // REMIX OPTIMIZATION: Separate initialization to reduce main function complexity
    function _initSession(CreateParams memory p) private {
        usedSessionIds[p.sessionId] = true;
        
        ProgressiveSession storage s = sessions[p.sessionId];
        s.sessionId = p.sessionId;
        s.student = msg.sender;
        s.mentor = p.mentor;
        s.paymentToken = p.paymentToken;
        s.totalAmount = p.amount;
        s.sessionDuration = p.durationMinutes;
        s.createdAt = block.timestamp;
        s.status = SessionStatus.Created;
        
        emit SessionCreated(p.sessionId, msg.sender, p.mentor, p.amount, p.paymentToken);
    }

    function startProgressiveSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        require(block.timestamp <= s.createdAt + SESSION_START_TIMEOUT, "Timeout exceeded");

        s.status = SessionStatus.Active;
        s.startTime = block.timestamp;
        s.lastHeartbeat = block.timestamp;
        s.isActive = true;

        emit SessionStarted(sessionId, block.timestamp);
    }

    function checkAndExpireSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(block.timestamp > s.createdAt + SESSION_START_TIMEOUT, "Not expired");

        s.status = SessionStatus.Expired;
        _transfer(s.paymentToken, s.student, s.totalAmount);
        emit SessionExpired(sessionId, s.totalAmount);
    }

    // REMIX OPTIMIZATION: Ultra-simplified payment release
    function releaseProgressivePayment(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active && s.isActive && !s.isPaused, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        uint256 releaseAmount;
        
        // Single scoped block for all calculations
        {
            PaymentCalc memory calc = PaymentCalc(s.totalAmount, s.releasedAmount, s.sessionDuration, _getElapsed(sessionId));
            
            uint256 maxReleasable = (calc.totalAmount * 90) / 100;
            uint256 progressiveMax = (calc.totalAmount * 90 * calc.elapsedMinutes) / (calc.sessionDuration * 100);
            
            if (progressiveMax > maxReleasable) progressiveMax = maxReleasable;
            require(progressiveMax > calc.releasedAmount, "No payment available");
            
            releaseAmount = progressiveMax - calc.releasedAmount;
        }

        s.releasedAmount += releaseAmount;
        _transfer(s.paymentToken, s.mentor, releaseAmount);
        emit ProgressivePaymentReleased(sessionId, releaseAmount, s.releasedAmount, block.timestamp);
    }

    function updateHeartbeat(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active, "Not active");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");
        
        s.lastHeartbeat = block.timestamp;
        
        if (s.isPaused) {
            s.pausedTime += block.timestamp - s.lastHeartbeat;
            s.isPaused = false;
            s.status = SessionStatus.Active;
            emit SessionResumed(sessionId, block.timestamp);
        }
        
        emit HeartbeatReceived(sessionId, block.timestamp);
    }

    function pauseSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active && !s.isPaused, "Cannot pause");
        
        bool isParticipant = (msg.sender == s.student || msg.sender == s.mentor);
        bool isTimeout = block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD;
        
        require(isParticipant || isTimeout, "Unauthorized");

        s.isPaused = true;
        s.status = SessionStatus.Paused;
        
        if (isParticipant && !isTimeout) {
            s.lastHeartbeat = block.timestamp;
        }
        
        emit SessionPaused(sessionId, block.timestamp, isTimeout ? "Heartbeat timeout" : "Manual pause");
    }

    function resumeSession(bytes32 sessionId) public nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Paused, "Not paused");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.pausedTime += block.timestamp - s.lastHeartbeat;
        s.isPaused = false;
        s.status = SessionStatus.Active;
        s.lastHeartbeat = block.timestamp;

        emit SessionResumed(sessionId, block.timestamp);
    }

    function completeSession(bytes32 sessionId, uint256 rating, string calldata) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(msg.sender == s.student, "Only student");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not ready");
        require(rating >= 1 && rating <= 5, "Invalid rating");

        _finalize(sessionId);
    }

    function autoCompleteSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Active || s.status == SessionStatus.Paused, "Not eligible");
        require(block.timestamp >= s.createdAt + AUTO_RELEASE_DELAY, "Too early");

        _finalize(sessionId);
    }

    // REMIX OPTIMIZATION: Minimal finalization function
    function _finalize(bytes32 sessionId) private {
        ProgressiveSession storage s = sessions[sessionId];
        s.status = SessionStatus.Completed;
        s.surveyCompleted = true;
        s.isActive = false;
        
        uint256 remaining = s.totalAmount - s.releasedAmount;
        if (remaining > 0) {
            uint256 fee = (remaining * PLATFORM_FEE_PERCENT) / 100;
            uint256 mentorAmount = remaining - fee;
            
            s.releasedAmount = s.totalAmount;
            
            if (mentorAmount > 0) _transfer(s.paymentToken, s.mentor, mentorAmount);
            if (fee > 0) _transfer(s.paymentToken, platformWallet, fee);
            
            emit SessionCompleted(sessionId, mentorAmount, fee, block.timestamp);
        } else {
            emit SessionCompleted(sessionId, 0, 0, block.timestamp);
        }
    }

    function cancelSession(bytes32 sessionId) external nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(s.status == SessionStatus.Created, "Already started");
        require(msg.sender == s.student || msg.sender == s.mentor, "Not participant");

        s.status = SessionStatus.Cancelled;
        uint256 refund = s.totalAmount - s.releasedAmount;
        s.releasedAmount = s.totalAmount;

        _transfer(s.paymentToken, s.student, refund);
        emit SessionCancelled(sessionId, refund, block.timestamp);
    }

    // REMIX OPTIMIZATION: Simplified transfer function
    function _transfer(address token, address to, uint256 amount) internal {
        if (token == ETH_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // REMIX OPTIMIZATION: Single calculation function with minimal variables
    function _getElapsed(bytes32 sessionId) internal view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        if (s.startTime == 0) return 0;
        
        uint256 total = block.timestamp - s.startTime;
        uint256 paused = s.pausedTime;
        
        if (s.isPaused && s.lastHeartbeat > 0) {
            paused += block.timestamp - s.lastHeartbeat;
        }
        
        return total <= paused ? 0 : (total - paused) / 60;
    }

    // Public/External view functions
    function calculateMaxRelease(uint256 totalAmount, uint256 elapsedMinutes, uint256 durationMinutes) public pure returns (uint256) {
        if (elapsedMinutes == 0 || durationMinutes == 0) return 0;
        uint256 maxRel = (totalAmount * 90 * elapsedMinutes) / (durationMinutes * 100);
        return maxRel > (totalAmount * 90) / 100 ? (totalAmount * 90) / 100 : maxRel;
    }

    function getEffectiveElapsedTime(bytes32 sessionId) public view returns (uint256) {
        return _getElapsed(sessionId);
    }

    function needsHeartbeat(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL);
    }

    function shouldAutoPause(bytes32 sessionId) external view returns (bool) {
        ProgressiveSession storage s = sessions[sessionId];
        return (s.status == SessionStatus.Active && !s.isPaused && s.lastHeartbeat > 0 && block.timestamp > s.lastHeartbeat + HEARTBEAT_INTERVAL + GRACE_PERIOD);
    }

    function getAvailablePayment(bytes32 sessionId) external view returns (uint256) {
        ProgressiveSession storage s = sessions[sessionId];
        
        if (s.status != SessionStatus.Active || s.isPaused || s.startTime == 0) return 0;
        
        uint256 elapsed = _getElapsed(sessionId);
        if (elapsed == 0 || s.sessionDuration == 0) return 0;
        
        uint256 maxRel = (s.totalAmount * 90 * elapsed) / (s.sessionDuration * 100);
        uint256 releasable = (s.totalAmount * 90) / 100;
        
        if (maxRel > releasable) maxRel = releasable;
        return maxRel > s.releasedAmount ? maxRel - s.releasedAmount : 0;
    }

    function getSession(bytes32 sessionId) external view returns (ProgressiveSession memory) {
        return sessions[sessionId];
    }

    // Admin functions
    function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external onlyOwner nonReentrant {
        ProgressiveSession storage s = sessions[sessionId];
        require(s.student != address(0), "Session missing");
        require(recipient != address(0), "Invalid recipient");
        require(amount <= s.totalAmount - s.releasedAmount, "Exceeds available");

        s.releasedAmount += amount;
        _transfer(s.paymentToken, recipient, amount);
        emit EmergencyRelease(sessionId, amount, reason);
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        platformWallet = newWallet;
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function emergencyWithdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0) && amount <= address(this).balance, "Invalid");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Failed");
    }

    function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0) && token != address(0), "Invalid");
        IERC20(token).safeTransfer(to, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
    fallback() external payable { revert("Function not found"); }
}
