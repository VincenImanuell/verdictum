// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAgentRequester, IJsonApiAgent, Response, Request, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @title JsonAgentCaller
/// @notice Chapter 2 plumbing: prove the async `createRequest -> handleResponse`
///         loop end-to-end using the cheap JSON API agent, BEFORE adding LLM
///         complexity. This contract is the template Chapter 3's verdict caller
///         will clone (swap agentId, price, payload encoding, and decode type).
contract JsonAgentCaller {
    // --- Somnia constants (testnet) ---
    IAgentRequester public constant PLATFORM = IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 public constant SUBCOMMITTEE_SIZE = 3; // platform default
    uint256 public constant PRICE_PER_AGENT = 0.03 ether; // JSON API per-agent price

    address public immutable owner;

    // Only requests we created may be answered (anti-spoof guard).
    mapping(uint256 => bool) public pendingRequests;

    // Latest result, exposed so we can read it from cast / the explorer.
    uint256 public lastRequestId;
    uint256 public lastValue;
    ResponseStatus public lastStatus;
    bool public hasResult;

    event RequestSent(uint256 indexed requestId, string url, string selector, uint256 deposit);
    event ResponseReceived(uint256 indexed requestId, ResponseStatus status, uint256 value);

    error NotPlatform();
    error UnknownRequest();
    error Underfunded(uint256 needed, uint256 sent);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Fire an async request: fetch a uint from a JSON API endpoint.
    /// @param url       the JSON API URL
    /// @param selector  dot-path to the value (e.g. "bitcoin.usd")
    /// @param decimals  fixed-point decimals to scale the value by
    function requestFetch(string calldata url, string calldata selector, uint8 decimals)
        external
        payable
        returns (uint256 requestId)
    {
        // The payload is the ABI-encoded agent-method call (not a live call).
        bytes memory payload = abi.encodeWithSelector(IJsonApiAgent.fetchUint.selector, url, selector, decimals);

        // Read the live deposit floor and add the agent reward pot on top.
        uint256 deposit = PLATFORM.getRequestDeposit() + PRICE_PER_AGENT * SUBCOMMITTEE_SIZE;
        if (msg.value < deposit) revert Underfunded(deposit, msg.value);

        requestId = PLATFORM.createRequest{value: deposit}(
            JSON_API_AGENT_ID, address(this), this.handleResponse.selector, payload
        );

        pendingRequests[requestId] = true;
        emit RequestSent(requestId, url, selector, deposit);
    }

    /// @notice Async callback: the platform calls this once validators reach consensus.
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    )
        external
    {
        if (msg.sender != address(PLATFORM)) revert NotPlatform();
        if (!pendingRequests[requestId]) revert UnknownRequest();
        delete pendingRequests[requestId];

        lastRequestId = requestId;
        lastStatus = status;

        uint256 value;
        // Only decode on success — decoding a Failed/empty result would revert.
        if (status == ResponseStatus.Success && responses.length > 0) {
            value = abi.decode(responses[0].result, (uint256));
            lastValue = value;
        }
        hasResult = true;
        emit ResponseReceived(requestId, status, value);
    }

    /// @notice REQUIRED: accept rebates of unused budget pushed back by the platform.
    receive() external payable {}

    /// @notice Reclaim contract balance (rebates + any overpayment).
    function withdraw() external {
        require(msg.sender == owner, "not owner");
        (bool ok,) = payable(owner).call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }
}
