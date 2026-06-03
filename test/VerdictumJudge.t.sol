// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VerdictumJudge} from "../src/VerdictumJudge.sol";
import {Credential} from "../src/Credential.sol";

/// @dev Local proof of the two-step deploy refactor (Credential created via initCredential,
/// not in the constructor, so the on-chain deploy fits Somnia's per-tx gas budget). No
/// testnet/STT needed. The async submit/verdict path is exercised live on testnet (M4).
contract VerdictumJudgeTest is Test {
    VerdictumJudge internal judge;
    uint256 constant AGENT_ID = 12847293847561029384;

    function setUp() public {
        judge = new VerdictumJudge(AGENT_ID, "SIDANG");
    }

    function test_NoCredentialUntilInit() public view {
        assertEq(address(judge.credential()), address(0));
        assertEq(judge.LLM_AGENT_ID(), AGENT_ID);
        assertEq(judge.challenge(), "SIDANG");
        assertEq(judge.OWNER(), address(this));
    }

    function test_SubmitRevertsBeforeInit() public {
        vm.expectRevert(VerdictumJudge.NotInitialized.selector);
        judge.submit("any statement");
    }

    function test_InitCredentialMakesJudgeSoleMinter() public {
        address cred = judge.initCredential();
        assertEq(cred, address(judge.credential()));
        // the judge deployed it, so the judge is the minter
        assertEq(Credential(cred).JUDGE(), address(judge));
    }

    function test_InitCredentialOwnerOnly() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(VerdictumJudge.NotOwner.selector);
        judge.initCredential();
    }

    function test_InitCredentialIsOneTime() public {
        judge.initCredential();
        vm.expectRevert(VerdictumJudge.AlreadyInitialized.selector);
        judge.initCredential();
    }
}
