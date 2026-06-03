// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Credential
/// @notice Soulbound (ERC-5192) credential minted by VerdictumJudge only when a
///         submission earns a PASS verdict. Non-transferable by design: a credential
///         that could be sold or moved would lose all meaning. Only the judge can mint.
contract Credential is ERC721 {
    /// @dev The only address allowed to mint (the VerdictumJudge that deployed this).
    address public immutable JUDGE;
    uint256 public nextId;

    struct Meta {
        string challenge; // which skin/challenge (e.g. "SIDANG")
        uint64 issuedAt; // block timestamp at issuance
        uint8 strictness; // strictness level in force when judged (0..100)
        address holder; // original (and only) holder
    }

    mapping(uint256 => Meta) public credentialOf;

    /// @dev ERC-5192: emitted when a token becomes permanently locked.
    event Locked(uint256 tokenId);

    error OnlyJudge();
    error Soulbound();

    constructor(address judge) ERC721("Verdictum Credential", "VERDICT") {
        JUDGE = judge;
    }

    /// @notice Mint a soulbound credential. Callable only by the judge.
    function mint(address to, string calldata challenge, uint8 strictness) external returns (uint256 id) {
        if (msg.sender != JUDGE) revert OnlyJudge();
        id = ++nextId;
        // _mint (not _safeMint): a soulbound credential can never be transferred out, so the
        // ERC721Receiver acceptance hook adds zero safety here. And because mint() runs inside
        // VerdictumJudge.handleResponse (the platform's async callback), a reverting
        // onERC721Received on a contract petitioner would kill the entire callback and lose the
        // verdict. _mint makes no external call, keeping the callback as bulletproof as the
        // proven Chapter-3 path (which minted nothing and could not revert on PASS).
        _mint(to, id);
        credentialOf[id] = Meta(challenge, uint64(block.timestamp), strictness, to);
        emit Locked(id);
    }

    /// @notice ERC-5192: every credential is permanently locked (soulbound).
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId); // reverts if token doesn't exist
        return true;
    }

    /// @dev Block all transfers; allow only mint (from==0) and burn (to==0).
    /// OZ v5 routes every ownership change through _update.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        // 0xb45a3c0e = ERC-5192 (soulbound) interface id
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
