// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Inspector} from "../src/Inspector.sol";
import {IAgentRequester, Response, Request, ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

/// @dev Tiny Credential stand-in exposing nextId (the Inspector reads it as the running pass count).
contract MockCred {
    uint256 public nextId;

    function setNextId(uint256 n) external {
        nextId = n;
    }
}

/// @dev The Governor (autonomy) tested by driving the real tick()/advanceSeason() flow with a mocked
/// platform, then delivering the async callback as the platform — this sets pendingRequests + the Kind
/// tag through the real contract code (no storage slot hacking) and exercises the two-kind dispatch.
contract InspectorTest is Test {
    Inspector internal inspector;
    MockCred internal cred;
    address constant PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    uint256 constant AGENT = 12847293847561029384;

    function setUp() public {
        vm.deal(address(this), 100 ether);
        cred = new MockCred();
        inspector = new Inspector(AGENT, address(cred));
        vm.mockCall(
            PLATFORM,
            abi.encodeWithSelector(IAgentRequester.getRequestDeposit.selector),
            abi.encode(uint256(0.03 ether))
        );
    }

    function _mockCreate(uint256 rid) internal {
        vm.mockCall(PLATFORM, abi.encodeWithSelector(IAgentRequester.createRequest.selector), abi.encode(rid));
    }

    function _deliverInt(uint256 rid, int256 v) internal {
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(v);
        Request memory req;
        vm.prank(PLATFORM);
        inspector.handleResponse(rid, r, ResponseStatus.Success, req);
    }

    function _deliverStr(uint256 rid, string memory v) internal {
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(v);
        Request memory req;
        vm.prank(PLATFORM);
        inspector.handleResponse(rid, r, ResponseStatus.Success, req);
    }

    function test_InitialState() public view {
        assertEq(inspector.strictness(), 50);
        assertEq(inspector.tickCount(), 0);
        assertEq(inspector.season(), 1);
        assertEq(inspector.focus(), "OVERALL");
        assertEq(inspector.OWNER(), address(this));
        assertEq(address(inspector.CREDENTIAL()), address(cred));
    }

    // --- strictness (inferNumber) path ---------------------------------------------------------

    function test_TickSetsStrictness() public {
        _mockCreate(1);
        uint256 rid = inspector.tick{value: 0.24 ether}();
        assertEq(rid, 1);
        assertTrue(inspector.pendingRequests(1));
        _deliverInt(1, 78);
        assertEq(inspector.strictness(), 78);
        assertEq(inspector.tickCount(), 1);
        assertFalse(inspector.pendingRequests(1)); // request closed
    }

    function test_TickClampsAbove100() public {
        _mockCreate(2);
        inspector.tick{value: 0.24 ether}();
        _deliverInt(2, 150);
        assertEq(inspector.strictness(), 100);
    }

    function test_TickClampsBelowZero() public {
        _mockCreate(3);
        inspector.tick{value: 0.24 ether}();
        _deliverInt(3, -5);
        assertEq(inspector.strictness(), 0);
    }

    // --- season (inferString focus) path -------------------------------------------------------

    function test_AdvanceSeasonRevertsBeforeDue() public {
        _mockCreate(4);
        vm.expectRevert(); // SeasonNotDue
        inspector.advanceSeason{value: 0.24 ether}();
    }

    function test_AdvanceSeasonPicksFocusAndOpensNewSeason() public {
        vm.warp(block.timestamp + inspector.seasonLength() + 1);
        _mockCreate(5);
        uint256 rid = inspector.advanceSeason{value: 0.24 ether}();
        assertEq(rid, 5);
        assertTrue(inspector.focusInFlight());
        _deliverStr(5, "EVIDENCE");
        assertEq(inspector.focus(), "EVIDENCE");
        assertEq(inspector.season(), 2); // advanced
        assertFalse(inspector.focusInFlight()); // cleared
    }

    function test_AdvanceSeasonNoOpOnFailure() public {
        vm.warp(block.timestamp + inspector.seasonLength() + 1);
        _mockCreate(6);
        inspector.advanceSeason{value: 0.24 ether}();
        Response[] memory r = new Response[](1); // empty result
        Request memory req;
        vm.prank(PLATFORM);
        inspector.handleResponse(6, r, ResponseStatus.TimedOut, req);
        assertEq(inspector.season(), 1); // NOT advanced
        assertFalse(inspector.focusInFlight()); // cleared so anyone can retry
    }

    /// @dev Both kinds share one callback; the per-request Kind tag keeps them apart even out of order.
    function test_DistinguishesTwoAsyncKinds() public {
        _mockCreate(10);
        inspector.tick{value: 0.24 ether}(); // Kind.Strictness
        vm.warp(block.timestamp + inspector.seasonLength() + 1);
        _mockCreate(11);
        inspector.advanceSeason{value: 0.24 ether}(); // Kind.Focus
        _deliverStr(11, "NOVELTY"); // focus callback first
        _deliverInt(10, 64); // strictness callback second
        assertEq(inspector.focus(), "NOVELTY");
        assertEq(inspector.strictness(), 64);
        assertEq(inspector.season(), 2);
    }

    // --- access control ------------------------------------------------------------------------

    function test_OnlyPlatformCanDeliver() public {
        _mockCreate(7);
        inspector.tick{value: 0.24 ether}();
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(int256(80));
        Request memory req;
        vm.expectRevert(Inspector.NotPlatform.selector);
        inspector.handleResponse(7, r, ResponseStatus.Success, req);
    }

    function test_UnknownRequestReverts() public {
        Response[] memory r = new Response[](1);
        r[0].result = abi.encode(int256(80));
        Request memory req;
        vm.prank(PLATFORM);
        vm.expectRevert(Inspector.UnknownRequest.selector);
        inspector.handleResponse(999, r, ResponseStatus.Success, req);
    }

    function test_SetSeasonLengthOwnerOnly() public {
        inspector.setSeasonLength(120);
        assertEq(inspector.seasonLength(), 120);
        vm.prank(address(0xBEEF));
        vm.expectRevert(Inspector.NotOwner.selector);
        inspector.setSeasonLength(60);
    }
}
