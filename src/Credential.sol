// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Credential
/// @notice Soulbound (ERC-5192) credential minted by VerdictumJudge only when a submission earns a
///         PASS verdict. Non-transferable by design: a credential that could be sold or moved would
///         lose all meaning. Only the judge can mint.
///
///         Self-describing: tokenURI returns a fully on-chain base64 data-URI (JSON + embedded SVG)
///         so the certificate renders identically inside any wallet or explorer with no server or
///         IPFS — the "unforgeable, self-contained" artifact. tokenURI is view-only, so mint gas is
///         unchanged.
contract Credential is ERC721 {
    /// @dev The only address allowed to mint (the VerdictumJudge that deployed this).
    address public immutable JUDGE;
    uint256 public nextId;

    struct Meta {
        string challenge; // which skin/challenge (e.g. "Job Application Screening")
        uint64 issuedAt; // block timestamp at issuance
        uint8 strictness; // strictness level in force when judged (0..100)
        address holder; // original (and only) holder
        uint32 season; // exam season in force when judged
        string focus; // season focus in force when judged (one of the Governor's curated tokens)
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
    function mint(address to, string calldata challenge, uint8 strictness, uint32 season, string calldata focus)
        external
        returns (uint256 id)
    {
        if (msg.sender != JUDGE) revert OnlyJudge();
        id = ++nextId;
        // _mint (not _safeMint): a soulbound credential can never be transferred out, so the
        // ERC721Receiver acceptance hook adds zero safety here. And because mint() runs inside
        // VerdictumJudge.handleResponse (the platform's async callback), a reverting
        // onERC721Received on a contract petitioner would kill the entire callback and lose the
        // verdict. _mint makes no external call, keeping the callback bulletproof.
        _mint(to, id);
        credentialOf[id] = Meta(challenge, uint64(block.timestamp), strictness, to, season, focus);
        emit Locked(id);
    }

    /// @notice ERC-5192: every credential is permanently locked (soulbound).
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId); // reverts if token doesn't exist
        return true;
    }

    // --- on-chain self-describing metadata -----------------------------------------------------

    /// @notice Fully on-chain metadata: a base64 data-URI JSON whose `image` is a base64 SVG
    ///         certificate. No server, no IPFS — renders in any wallet/explorer.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Meta memory m = credentialOf[tokenId];

        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(_svg(tokenId, m))));

        string memory json = string.concat(
            '{"name":"Verdictum Credential #',
            Strings.toString(tokenId),
            '","description":"Soulbound (ERC-5192) proof of a consensus-validated PASS verdict, issued by an on-chain AI examiner running inside Somnia validator consensus. Non-transferable.","image":"',
            image,
            '","attributes":[',
            '{"trait_type":"Challenge","value":"',
            _esc(m.challenge),
            '"},{"trait_type":"Strictness","value":',
            Strings.toString(uint256(m.strictness)),
            '},{"trait_type":"Issued At","display_type":"date","value":',
            Strings.toString(uint256(m.issuedAt)),
            '},{"trait_type":"Holder","value":"',
            Strings.toHexString(m.holder),
            '"},{"trait_type":"Season","value":',
            Strings.toString(uint256(m.season)),
            '},{"trait_type":"Focus","value":"',
            _esc(m.focus),
            '"},{"trait_type":"Soulbound","value":"true"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev The certificate SVG (600x380). Dark ink with a gold foil frame, in Verdictum's palette.
    ///      Pure string concat over view-only data — zero storage writes, so mint gas is unaffected.
    function _svg(uint256 tokenId, Meta memory m) internal pure returns (string memory) {
        string memory holder = Strings.toHexString(m.holder);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">',
            "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
            "<stop offset='0' stop-color='#FBE7A8'/><stop offset='.5' stop-color='#E9C46A'/><stop offset='1' stop-color='#9C7A2E'/></linearGradient></defs>",
            '<rect width="600" height="380" rx="18" fill="#0A0C10"/>',
            '<rect x="12" y="12" width="576" height="356" rx="13" fill="#10141C" stroke="url(#g)" stroke-width="2"/>',
            '<rect x="24" y="24" width="552" height="332" rx="8" fill="none" stroke="#28324A" stroke-width="1"/>',
            '<circle cx="300" cy="74" r="20" fill="none" stroke="url(#g)" stroke-width="2"/>',
            '<text x="300" y="81" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#E9C46A">V</text>',
            '<text x="300" y="128" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="3" fill="#EAEEF7">VERDICTUM</text>',
            '<text x="300" y="151" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="3" fill="#94A0B8">CONSENSUS-VALIDATED CREDENTIAL</text>',
            '<line x1="120" y1="172" x2="480" y2="172" stroke="#28324A" stroke-width="1"/>',
            '<text x="300" y="205" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="2" fill="#94A0B8">PASS VERDICT FOR</text>',
            '<text x="300" y="238" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#34D399">',
            _esc(m.challenge),
            "</text>",
            '<text x="300" y="284" text-anchor="middle" font-family="monospace" font-size="12" fill="#C8D2F0">Holder ',
            holder,
            "</text>",
            '<text x="300" y="305" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#94A0B8">Strictness ',
            Strings.toString(uint256(m.strictness)),
            "/100  -  Issued ",
            Strings.toString(uint256(m.issuedAt)),
            " UTC</text>",
            '<text x="300" y="326" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="1" fill="#E9C46A">SEASON ',
            Strings.toString(uint256(m.season)),
            "  -  FOCUS ",
            _esc(m.focus),
            "</text>",
            '<text x="300" y="348" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" fill="#94A0B8">SOULBOUND - ERC-5192 - NON-TRANSFERABLE - #',
            Strings.toString(tokenId),
            "</text></svg>"
        );
    }

    /// @dev Minimal escaper: drops the bytes that would break the SVG/JSON data-URI (" < > &).
    ///      Challenge labels are owner-curated and short (<=64 bytes), so dropping is sufficient and
    ///      keeps the function cheap; we still escape defensively against any future relaxed registry.
    function _esc(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        // two passes (no inline assembly): count kept bytes, then fill an exact-size buffer. View-only.
        uint256 n;
        for (uint256 i; i < b.length; i++) {
            if (_keep(b[i])) n++;
        }
        bytes memory out = new bytes(n);
        uint256 j;
        for (uint256 i; i < b.length; i++) {
            if (_keep(b[i])) out[j++] = b[i];
        }
        return string(out);
    }

    /// @dev Keep a byte unless it would break the JSON/SVG data-URI: " < > & \ or any control char.
    function _keep(bytes1 ch) private pure returns (bool) {
        return !(ch == 0x22 || ch == 0x3c || ch == 0x3e || ch == 0x26 || ch == 0x5c || uint8(ch) < 0x20);
    }

    /// @dev Soulbound AND irrevocable: allow only mint (from==0). Every transfer and every burn
    /// (any from!=0) reverts, so a credential can never move or be destroyed — not by its holder,
    /// not by the judge, not by the platform's creators. OZ v5 routes all ownership changes here.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        // 0xb45a3c0e = ERC-5192 (soulbound) interface id
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
