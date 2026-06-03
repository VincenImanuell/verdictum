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
        uint256 id = cred.mint(alice, "SIDANG", 70);
        assertEq(cred.ownerOf(id), alice);
        assertTrue(cred.locked(id));
        (string memory challenge,, uint8 strictness, address holder) = cred.credentialOf(id);
        assertEq(challenge, "SIDANG");
        assertEq(strictness, 70);
        assertEq(holder, alice);
    }

    function test_OnlyJudgeCanMint() public {
        vm.prank(bob); // not the judge
        vm.expectRevert(Credential.OnlyJudge.selector);
        cred.mint(alice, "SIDANG", 50);
    }

    function test_SoulboundTransferReverts() public {
        uint256 id = cred.mint(alice, "SIDANG", 50);
        vm.prank(alice);
        vm.expectRevert(Credential.Soulbound.selector);
        cred.transferFrom(alice, bob, id);
    }

    function test_SupportsErc5192Interface() public view {
        assertTrue(cred.supportsInterface(0xb45a3c0e)); // ERC-5192
    }

    /// @dev Proves the _safeMint -> _mint hardening. This test contract has code but does
    /// NOT implement onERC721Received, so under _safeMint this mint would revert
    /// (ERC721InvalidReceiver) — which, inside the platform callback, would lose the verdict.
    /// With _mint it must succeed, since a soulbound token can never leave the recipient.
    function test_MintToContractRecipientSucceeds() public {
        uint256 id = cred.mint(address(this), "SIDANG", 60);
        assertEq(cred.ownerOf(id), address(this));
        assertTrue(cred.locked(id));
    }
}
