// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Inspector} from "../src/Inspector.sol";
import {Response, Request, ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

/// @dev Local proof of the autonomous strictness logic (clamp + update + access control) by
/// simulating the platform's async callback. The live inferNumber round-trip is exercised on
/// testnet. (tick() itself needs the live platform, so it is covered by the testnet run.)
contract InspectorTest is Test {
    Inspector internal inspector;
    address constant PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    address constant CRED = address(0xCAFE); // dummy; tick() (which reads it) is tested live

    function setUp() public {
        inspector = new Inspector(12847293847561029384, CRED);
    }

    function test_InitialState() public view {
        assertEq(inspector.strictness(), 50);
        assertEq(inspector.tickCount(), 0);
        assertEq(inspector.OWNER(), address(this));
        assertEq(inspector.LLM_AGENT_ID(), 12847293847561029384);
        assertEq(address(inspector.CREDENTIAL()), CRED);
    }

    // tick() sets pendingRequests via the live platform; here we set it directly.
    // pendingRequests is the 3rd storage slot (slot 2): strictness=0, tickCount=1, pendingRequests=2.
    function _markPending(uint256 requestId) internal {
        bytes32 slot = keccak256(abi.encode(requestId, uint256(2)));
        vm.store(address(inspector), slot, bytes32(uint256(1)));
    }

    function _deliver(uint256 requestId, int256 value) internal {
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(value);
        Request memory req;
        vm.prank(PLATFORM);
        inspector.handleResponse(requestId, r, ResponseStatus.Success, req);
    }

    function test_AutonomousUpdate() public {
        _markPending(1);
        _deliver(1, 78);
        assertEq(inspector.strictness(), 78);
        assertEq(inspector.tickCount(), 1);
        assertEq(inspector.lastRequestId(), 1);
        assertEq(uint8(inspector.lastStatus()), uint8(ResponseStatus.Success));
    }

    function test_ClampsAbove100() public {
        _markPending(2);
        _deliver(2, 150);
        assertEq(inspector.strictness(), 100);
    }

    function test_ClampsBelowZero() public {
        _markPending(3);
        _deliver(3, -5);
        assertEq(inspector.strictness(), 0);
    }

    function test_OnlyPlatformCanDeliver() public {
        _markPending(4);
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(int256(80));
        Request memory req;
        vm.expectRevert(Inspector.NotPlatform.selector); // msg.sender = test contract, not platform
        inspector.handleResponse(4, r, ResponseStatus.Success, req);
    }

    function test_UnknownRequestReverts() public {
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(int256(80));
        Request memory req;
        vm.prank(PLATFORM);
        vm.expectRevert(Inspector.UnknownRequest.selector);
        inspector.handleResponse(999, r, ResponseStatus.Success, req);
    }
}
