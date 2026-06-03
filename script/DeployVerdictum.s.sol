// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VerdictumJudge} from "../src/VerdictumJudge.sol";

/// @notice Deploy the Chapter-4 vertical slice: VerdictumJudge (which itself
///         deploys its own soulbound Credential as the sole minter).
/// Constructor args: the empirically-confirmed LLM agentId + the skin label.
contract DeployVerdictum is Script {
    // LLM Inference agentId — empirically confirmed live on Shannon (see deployments.md).
    uint256 constant LLM_AGENT_ID = 12847293847561029384;
    string constant CHALLENGE = "SIDANG";

    /// @dev NOTE: on Somnia, deploy in TWO transactions with explicit high gas limits
    /// (gas accounting is ~15x EVM and an inner `new Credential` is invisible to eth_estimateGas):
    ///   1) deploy VerdictumJudge   2) call judge.initCredential()
    /// This script only does step 1; step 2 is a separate `cast send ... initCredential()`.
    function run() external {
        vm.startBroadcast();
        VerdictumJudge judge = new VerdictumJudge(LLM_AGENT_ID, CHALLENGE);
        vm.stopBroadcast();

        console.log("VerdictumJudge:", address(judge));
        console.log("challenge:     ", judge.challenge());
        console.log("strictness:    ", judge.strictness());
        console.log("NEXT: call initCredential() to deploy the soulbound Credential");
    }
}
