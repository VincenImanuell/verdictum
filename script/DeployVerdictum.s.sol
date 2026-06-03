// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VerdictumJudge} from "../src/VerdictumJudge.sol";

/// @notice Reference deployer for the VerdictumJudge. The integrated set (Credential + Inspector)
/// and the curated challenges are wired in afterwards via `cast`.
contract DeployVerdictum is Script {
    // LLM Inference agentId — empirically confirmed live on Shannon (see deployments.md).
    uint256 constant LLM_AGENT_ID = 12847293847561029384;

    /// @dev On Somnia DO NOT deploy via `forge script` — its broadcast gas comes from local-EVM
    /// simulation, which under-sizes Somnia's ~15x gas and the tx runs dry. Deploy each contract
    /// with `forge create` / `cast send` so the LIVE eth_estimateGas is used. Integrated flow:
    ///   1) forge create VerdictumJudge(agentId)
    ///   2) forge create Credential(judge)                       // JUDGE == judge => sole minter
    ///   3) cast send judge "setCredential(address)" cred
    ///   4) forge create Inspector(agentId, cred)                // reads pass-count
    ///   5) cast send judge "setInspector(address)" inspector    // judge reads autonomous strictness
    ///   6) cast send judge "addChallenge(bytes32,string,string)" <id> <label> <persona>  // seed skins
    function run() external {
        vm.startBroadcast();
        VerdictumJudge judge = new VerdictumJudge(LLM_AGENT_ID);
        vm.stopBroadcast();

        console.log("VerdictumJudge:", address(judge));
        console.log("NEXT: deploy Credential(judge) + setCredential, Inspector(cred) + setInspector, then addChallenge");
    }
}
