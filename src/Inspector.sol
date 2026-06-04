// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAgentRequester, ILLMAgent, Response, Request, ResponseStatus} from "./interfaces/ISomniaAgents.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @dev Minimal read-only view into the soulbound Credential: how many have been issued so far
/// (Credential.nextId increments once per PASS, so this is the running pass count).
interface ICredentialCount {
    function nextId() external view returns (uint256);
}

/// @title Inspector (the autonomous Governor)
/// @notice The AUTONOMY layer — an on-chain "accreditation board" that ACTS on its own, with no admin:
///         - `tick()` (permissionless) asks the on-chain LLM via `inferNumber` how strict to be (0..100).
///         - `advanceSeason()` (permissionless, time-gated) asks the LLM via `inferString` what the
///           examiner should scrutinise MOST next season (one of a fixed focus set), opens a new season,
///           and emits a ruling. No human picks the bar or the focus — the validator consensus does.
///
///         The Judge reads `strictness`, `focus`, and `season` and injects them into every verdict, so
///         the SAME application can PASS one season and FAIL the next — the institution moved, not the
///         paperwork. Both LLM calls return to one async `handleResponse`; a per-request `Kind` tag
///         distinguishes the int (strictness) path from the string (focus) path, each with its own safe
///         decode guard so a Failed/TimedOut/malformed callback can never strand a request.
contract Inspector {
    IAgentRequester public constant PLATFORM = IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);
    uint256 public constant SUBCOMMITTEE_SIZE = 3;
    uint256 public constant PRICE_PER_AGENT = 0.07 ether; // LLM Inference per-agent price

    uint256 public immutable LLM_AGENT_ID;
    ICredentialCount public immutable CREDENTIAL; // read-only signal: how many have passed
    address public immutable OWNER; // only for withdraw()/setSeasonLength(); tick()/advanceSeason() stay permissionless

    uint8 public strictness = 50; // 0..100, tuned autonomously by the LLM
    uint256 public tickCount; // number of autonomous strictness adjustments applied

    // --- season machinery (the agent runs the calendar itself) ---
    uint32 public season = 1; // current season number
    uint64 public seasonStart; // block.timestamp when the current season opened
    uint64 public seasonLength = 7 days; // owner-settable cadence (short for demos)
    string public focus = "OVERALL"; // what the examiner scrutinises most this season (one of FOCUS_VALUES)
    uint256 public seasonStartPasses; // CREDENTIAL.nextId() snapshot when the season opened
    bool public focusInFlight; // dedupe: a focus-pick async is pending

    enum Kind {
        None,
        Strictness,
        Focus
    }

    mapping(uint256 => Kind) public requestKind; // requestId => which async call this is
    mapping(uint256 => bool) public pendingRequests;

    // latest result (readable from cast / explorer)
    uint256 public lastRequestId;
    ResponseStatus public lastStatus;

    string public constant STRICTNESS_SYSTEM = "You are an autonomous accreditation board calibrating how hard an examiner should be. "
        "Output a single integer from 0 to 100: 0 = very lenient, 100 = extremely harsh. "
        "A credential loses value if almost everyone passes, so the more candidates have already "
        "passed, the stricter you should be; stay moderate when few have passed. Reply with the number only.";

    string public constant FOCUS_SYSTEM = "You are an autonomous examination board opening the next exam season. Each season the examiner scrutinizes one "
        "quality of submissions above all others. Pick that focus for the coming season. Choose from EXACTLY these tokens: "
        "EVIDENCE (demand concrete proof, data, numbers, references), METHODOLOGY (demand sound method, rigor, reproducible "
        "process), NOVELTY (demand originality and non-obvious contribution), ROLE_FIT (demand direct relevance to the stated "
        "role or task), HONESTY (demand candor, calibrated claims, owned limitations), OVERALL (weigh all qualities evenly). "
        "Decide from the prior season's pass-rate so a credential stays scarce and meaningful: when the pass-rate was high, "
        "rotate to a sharper, more demanding focus the easy season under-tested; when it was low, you may pick OVERALL or a "
        "focus that rewards genuine all-round merit. Never repeat a focus only to be repetitive, and never weaken the examiner. "
        "Output EXACTLY ONE of these tokens, uppercase, nothing else.";

    event Ticked(uint256 indexed requestId, uint256 passesSoFar);
    event StrictnessUpdated(uint8 oldStrictness, uint8 newStrictness, uint256 tickCount);
    event SeasonAdvancing(uint256 indexed requestId, uint32 indexed fromSeason, uint64 dueAt);
    event SeasonAdvanced(uint32 indexed season, string oldFocus, string newFocus, uint8 strictness, uint64 seasonStart);
    event SeasonLengthSet(uint64 oldLen, uint64 newLen);

    error NotPlatform();
    error UnknownRequest();
    error Underfunded(uint256 needed, uint256 sent);
    error NotOwner();
    error SeasonNotDue(uint256 nowTs, uint256 dueAt);
    error FocusInFlight();

    constructor(uint256 llmAgentId, address credential) {
        LLM_AGENT_ID = llmAgentId;
        CREDENTIAL = ICredentialCount(credential);
        OWNER = msg.sender;
        seasonStart = uint64(block.timestamp);
        seasonStartPasses = ICredentialCount(credential).nextId();
    }

    /// @notice Candidates admitted since the current season opened (for the live Docket).
    function admittedThisSeason() external view returns (uint256) {
        return CREDENTIAL.nextId() - seasonStartPasses;
    }

    /// @notice When the next season may be advanced (unix seconds).
    function seasonDueAt() public view returns (uint256) {
        return uint256(seasonStart) + uint256(seasonLength);
    }

    /// @notice Permissionless strictness recalibration — the AI in consensus sets the bar, not a human.
    function tick() external payable returns (uint256 requestId) {
        uint256 passes = CREDENTIAL.nextId();
        string memory prompt = string.concat(
            "Season ",
            Strings.toString(uint256(season)),
            ", focus ",
            focus,
            ". Candidates who have passed so far: ",
            Strings.toString(passes),
            ". Decide the new strictness, 0 to 100."
        );

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferNumber.selector, prompt, STRICTNESS_SYSTEM, int256(0), int256(100), false
        );

        requestId = _dispatch(payload, Kind.Strictness);
        emit Ticked(requestId, passes);
    }

    /// @notice Permissionless, time-gated season advance: anyone can poke it, but it only acts once the
    ///         season is due. The AI in consensus picks the next focus; no human chooses it.
    function advanceSeason() external payable returns (uint256 requestId) {
        uint256 dueAt = seasonDueAt();
        if (block.timestamp < dueAt) revert SeasonNotDue(block.timestamp, dueAt);
        if (focusInFlight) revert FocusInFlight();

        string memory prompt = string.concat(
            "Current season ",
            Strings.toString(uint256(season)),
            " focus was '",
            focus,
            "'. ",
            Strings.toString(CREDENTIAL.nextId() - seasonStartPasses),
            " candidates were admitted this season. Choose the focus for the next season."
        );

        string[] memory allowed = new string[](6);
        allowed[0] = "EVIDENCE";
        allowed[1] = "METHODOLOGY";
        allowed[2] = "NOVELTY";
        allowed[3] = "ROLE_FIT";
        allowed[4] = "HONESTY";
        allowed[5] = "OVERALL";

        bytes memory payload =
            abi.encodeWithSelector(ILLMAgent.inferString.selector, prompt, FOCUS_SYSTEM, false, allowed);

        focusInFlight = true;
        requestId = _dispatch(payload, Kind.Focus);
        emit SeasonAdvancing(requestId, season, uint64(dueAt));
    }

    /// @dev Shared request dispatch: fund, fire, mark pending, tag the kind.
    function _dispatch(bytes memory payload, Kind kind) internal returns (uint256 requestId) {
        uint256 deposit = PLATFORM.getRequestDeposit() + PRICE_PER_AGENT * SUBCOMMITTEE_SIZE;
        if (msg.value < deposit) revert Underfunded(deposit, msg.value);
        requestId =
            PLATFORM.createRequest{value: deposit}(LLM_AGENT_ID, address(this), this.handleResponse.selector, payload);
        pendingRequests[requestId] = true;
        requestKind[requestId] = kind;
    }

    /// @notice One async callback for both kinds; the per-request Kind tag selects the safe decode path.
    function handleResponse(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory)
        external
    {
        if (msg.sender != address(PLATFORM)) revert NotPlatform();
        if (!pendingRequests[requestId]) revert UnknownRequest();
        Kind k = requestKind[requestId];
        if (k == Kind.None) revert UnknownRequest();
        delete pendingRequests[requestId];
        delete requestKind[requestId];

        lastRequestId = requestId;
        lastStatus = status;

        if (k == Kind.Strictness) {
            // int256 needs 32 bytes; short/malformed -> no-op (request still closed, no revert/strand).
            if (status == ResponseStatus.Success && responses.length > 0 && responses[0].result.length >= 32) {
                int256 raw = abi.decode(responses[0].result, (int256));
                if (raw < 0) raw = 0;
                if (raw > 100) raw = 100;
                uint8 old = strictness;
                strictness = uint8(uint256(raw));
                tickCount += 1;
                emit StrictnessUpdated(old, strictness, tickCount);
            }
        } else {
            // Focus: a valid ABI string is >= 64 bytes; isolate the decode in an external try/catch so
            // malformed >= 64-byte data cannot revert this callback. On any failure the season is NOT
            // advanced and the gate stays open for a retry.
            focusInFlight = false;
            if (status == ResponseStatus.Success && responses.length > 0 && responses[0].result.length >= 64) {
                try this.decodeString(responses[0].result) returns (string memory s) {
                    if (bytes(s).length > 0) {
                        string memory oldFocus = focus;
                        focus = s; // constrained by allowedValues to one of the 6 curated tokens
                        season += 1;
                        seasonStart = uint64(block.timestamp);
                        seasonStartPasses = CREDENTIAL.nextId();
                        emit SeasonAdvanced(season, oldFocus, focus, strictness, seasonStart);
                    }
                } catch {
                    // malformed -> no-op; season not advanced
                }
            }
        }
    }

    /// @dev External wrapper so the focus string decode can run inside a try/catch.
    function decodeString(bytes calldata b) external pure returns (string memory) {
        return abi.decode(b, (string));
    }

    // --- admin (cadence only; the AI still decides the bar & focus) ---
    function setSeasonLength(uint64 newLen) external {
        if (msg.sender != OWNER) revert NotOwner();
        require(newLen >= 1 minutes && newLen <= 365 days, "len");
        emit SeasonLengthSet(seasonLength, newLen);
        seasonLength = newLen;
    }

    receive() external payable {}

    function withdraw() external {
        if (msg.sender != OWNER) revert NotOwner();
        (bool ok,) = payable(OWNER).call{value: address(this).balance}("");
        require(ok, "withdraw failed");
    }
}
