// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Credential} from "../src/Credential.sol";

/// @dev Local proof (no testnet/STT) that the credential is truly soulbound and
/// mint-gated. Covers roadmap 4.1b (transfers rejected) and 4.3d.
contract CredentialTest is Test {
    Credential internal cred;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        // this test contract plays the role of the judge / sole minter
        cred = new Credential(address(this));
    }

    function test_MintAndMetadata() public {
        uint256 id = cred.mint(alice, "SIDANG", 70, 3, "EVIDENCE");
        assertEq(cred.ownerOf(id), alice);
        assertTrue(cred.locked(id));
        (string memory challenge,, uint8 strictness, address holder, uint32 season, string memory focus) =
            cred.credentialOf(id);
        assertEq(challenge, "SIDANG");
        assertEq(strictness, 70);
        assertEq(holder, alice);
        assertEq(season, 3);
        assertEq(focus, "EVIDENCE");
    }

    function test_OnlyJudgeCanMint() public {
        vm.prank(bob); // not the judge
        vm.expectRevert(Credential.OnlyJudge.selector);
        cred.mint(alice, "SIDANG", 50, 1, "OVERALL");
    }

    function test_SoulboundTransferReverts() public {
        uint256 id = cred.mint(alice, "SIDANG", 50, 1, "OVERALL");
        vm.prank(alice);
        vm.expectRevert(Credential.Soulbound.selector);
        cred.transferFrom(alice, bob, id);
    }

    function test_SupportsErc5192Interface() public view {
        assertTrue(cred.supportsInterface(0xb45a3c0e)); // ERC-5192
    }

    /// @dev The certificate is fully on-chain: tokenURI returns a base64 data-URI JSON (no server/IPFS).
    function test_TokenURIIsOnChainDataUri() public {
        uint256 id = cred.mint(alice, "Job Application Screening", 72, 2, "ROLE_FIT");
        string memory uri = cred.tokenURI(id);
        // must be an on-chain data URI, not an http/ipfs pointer
        assertEq(_startsWith(uri, "data:application/json;base64,"), true);
        assertGt(bytes(uri).length, 200); // non-trivial encoded payload
    }

    function test_TokenURIRevertsForMissingToken() public {
        vm.expectRevert();
        cred.tokenURI(999);
    }

    function _startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory b = bytes(s);
        bytes memory p = bytes(prefix);
        if (b.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (b[i] != p[i]) return false;
        }
        return true;
    }

    /// @dev Proves the _safeMint -> _mint hardening. This test contract has code but does
    /// NOT implement onERC721Received, so under _safeMint this mint would revert
    /// (ERC721InvalidReceiver) — which, inside the platform callback, would lose the verdict.
    /// With _mint it must succeed, since a soulbound token can never leave the recipient.
    function test_MintToContractRecipientSucceeds() public {
        uint256 id = cred.mint(address(this), "SIDANG", 60, 1, "OVERALL");
        assertEq(cred.ownerOf(id), address(this));
        assertTrue(cred.locked(id));
    }
}
