// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAgentRequester, ILLMAgent, Response, Request, ResponseStatus} from "./interfaces/ISomniaAgents.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @dev Minimal read-only view into the soulbound Credential: how many have been issued so far
/// (Credential.nextId increments once per PASS, so this is the running pass count).
interface ICredentialCount {
    function nextId() external view returns (uint256);
}

/// @title Inspector
/// @notice Chapter 5 — the autonomous "accreditation board" (dewan akreditasi). This is the
///         AUTONOMY layer: a permissionless `tick()` (no admin, no human) asks the on-chain LLM,
///         via `inferNumber`, how strict the examiner should be right now (0..100), grounded in
///         how many candidates have already passed, and overwrites a global `strictness` with the
///         consensus answer. The world tightens/loosens on its own — exactly the "autonomous
///         performance" axis the Agentathon scores. The judge reads this `strictness`.
contract Inspector {
    IAgentRequester public constant PLATFORM = IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);
    uint256 public constant SUBCOMMITTEE_SIZE = 3;
    uint256 public constant PRICE_PER_AGENT = 0.07 ether; // LLM Inference per-agent price

    uint256 public immutable LLM_AGENT_ID;
    ICredentialCount public immutable CREDENTIAL; // read-only signal: how many have passed
    address public immutable OWNER; // only for withdraw(); tick() stays permissionless

    uint8 public strictness = 50; // 0..100, tuned autonomously by the LLM
    uint256 public tickCount; // number of autonomous adjustments applied

    string public constant SYSTEM_PROMPT = "You are an autonomous accreditation board calibrating how hard an examiner should be. "
        "Output a single integer from 0 to 100: 0 = very lenient, 100 = extremely harsh. "
        "A credential loses value if almost everyone passes, so the more candidates have already "
        "passed, the stricter you should be; stay moderate when few have passed. Reply with the number only.";

    mapping(uint256 => bool) public pendingRequests;

    // latest result (readable from cast / explorer)
    uint256 public lastRequestId;
    ResponseStatus public lastStatus;

    event Ticked(uint256 indexed requestId, uint256 passesSoFar);
    event StrictnessUpdated(uint8 oldStrictness, uint8 newStrictness, uint256 tickCount);

    error NotPlatform();
    error UnknownRequest();
    error Underfunded(uint256 needed, uint256 sent);
    error NotOwner();

    constructor(uint256 llmAgentId, address credential) {
        LLM_AGENT_ID = llmAgentId;
        CREDENTIAL = ICredentialCount(credential);
        OWNER = msg.sender;
    }

    /// @notice Permissionless recalibration. ANYONE can fire this — there is no admin gate, which
    ///         is the point: the difficulty is set by the AI in consensus, not by a human.
    function tick() external payable returns (uint256 requestId) {
        uint256 passes = CREDENTIAL.nextId();
        string memory prompt = string.concat(
            "Candidates who have passed so far: ", Strings.toString(passes), ". Decide the new strictness, 0 to 100."
        );

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferNumber.selector, prompt, SYSTEM_PROMPT, int256(0), int256(100), false
        );

        uint256 deposit = PLATFORM.getRequestDeposit() + PRICE_PER_AGENT * SUBCOMMITTEE_SIZE;
        if (msg.value < deposit) revert Underfunded(deposit, msg.value);

        requestId =
            PLATFORM.createRequest{value: deposit}(LLM_AGENT_ID, address(this), this.handleResponse.selector, payload);

        pendingRequests[requestId] = true;
        emit Ticked(requestId, passes);
    }

    /// @notice Async callback: the consensus strictness lands here and overwrites the global value.
    function handleResponse(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory)
        external
    {
        if (msg.sender != address(PLATFORM)) revert NotPlatform();
        if (!pendingRequests[requestId]) revert UnknownRequest();
        delete pendingRequests[requestId];

        lastRequestId = requestId;
        lastStatus = status;

        if (status == ResponseStatus.Success && responses.length > 0) {
            int256 raw = abi.decode(responses[0].result, (int256));
            // inferNumber is asked to bound 0..100; clamp defensively anyway.
            if (raw < 0) raw = 0;
            if (raw > 100) raw = 100;
            uint8 old = strictness;
            strictness = uint8(uint256(raw));
            tickCount += 1;
            emit StrictnessUpdated(old, strictness, tickCount);
        }
    }

    receive() external payable {}

    function withdraw() external {
        if (msg.sender != OWNER) revert NotOwner();
        (bool ok,) = payable(OWNER).call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }
}
