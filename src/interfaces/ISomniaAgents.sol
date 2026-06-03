// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =============================================================================
// Somnia Agents — Solidity interface (Shannon testnet, chain id 50312).
// Locked from official docs (re-verified live 2026-06-03) + cross-checked across
// the dev blog and example repos. See memory: somnia-agents-integration.
// =============================================================================

/// @dev Lifecycle status of an agent request / individual validator response.
enum ResponseStatus {
    None, // 0 - uninitialized
    Pending, // 1 - awaiting responses
    Success, // 2 - consensus reached
    Failed, // 3 - validators reported failure
    TimedOut // 4 - request timed out
}

/// @dev How consensus is decided. Majority is the default for createRequest.
enum ConsensusType {
    Majority, // 0
    Threshold // 1
}

/// @dev One validator's response to a request.
struct Response {
    address validator;
    bytes result; // ABI-encoded return value of the agent method
    ResponseStatus status;
    uint256 receipt;
    uint256 timestamp;
    uint256 executionCost;
}

/// @dev Full request record (15 fields, docs ordering). Only needed if you read
/// fields off `details` in the callback; the common pattern ignores it.
struct Request {
    uint256 id;
    address requester;
    address callbackAddress;
    bytes4 callbackSelector;
    address[] subcommittee;
    Response[] responses;
    uint256 responseCount;
    uint256 failureCount;
    uint256 threshold;
    uint256 createdAt;
    uint256 deadline;
    ResponseStatus status;
    ConsensusType consensusType;
    uint256 remainingBudget;
    uint256 perAgentBudget;
}

/// @notice The Somnia Agents platform contract (testnet 0x037Bb9...6776).
/// You call createRequest here; it calls your handleResponse back asynchronously.
interface IAgentRequester {
    function createRequest(uint256 agentId, address callbackAddress, bytes4 callbackSelector, bytes calldata payload)
        external
        payable
        returns (uint256 requestId);

    function createAdvancedRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload,
        uint256 subcommitteeSize,
        uint256 threshold,
        ConsensusType consensusType,
        uint256 timeout
    ) external payable returns (uint256 requestId);

    // Read the current deposit floor at runtime (do NOT hardcode).
    function getRequestDeposit() external returns (uint256);
    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external returns (uint256);
}

/// @notice JSON API Request agent (testnet agentId 13174292974160097713).
/// Used ONLY to ABI-encode the payload (via .selector); never called on-chain.
interface IJsonApiAgent {
    function fetchString(string calldata url, string calldata selector) external returns (string memory);
    function fetchUint(string calldata url, string calldata selector, uint8 decimals) external returns (uint256);
    function fetchInt(string calldata url, string calldata selector, uint8 decimals) external returns (int256);
    function fetchBool(string calldata url, string calldata selector) external returns (bool);
}

/// @notice LLM Inference agent (Chapter 3 — agentId must be verified live first).
/// Declared here for reference; encode payload via .selector like the JSON agent.
interface ILLMAgent {
    function inferString(
        string calldata prompt,
        string calldata system,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory);

    function inferNumber(
        string calldata prompt,
        string calldata system,
        int256 minValue,
        int256 maxValue,
        bool chainOfThought
    ) external returns (int256);
}
