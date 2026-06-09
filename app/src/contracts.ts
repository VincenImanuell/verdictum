import type { Address, Hex } from "viem";

/// Season-aware multi-challenge set — Somnia Shannon (see repo/deployments.md).
/// NOTE: addresses are updated by script/deploy_v2.sh on each redeploy.
export const ADDR = {
  judge: "0xa169b1528D6CB9Ac790D2A76802E1BDe0d0dB93C" as Address,
  credential: "0x3203332165Fa483e317095DcBA7d56d2ED4E15bC" as Address,
  inspector: "0xbC5976F8bDB470D43D58C88BA89Bd08711aF9Ee0" as Address,
  platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as Address,
} as const;

export const judgeAbi = [
  {
    type: "function",
    name: "submit",
    stateMutability: "payable",
    inputs: [
      { name: "challengeId", type: "bytes32" },
      { name: "statement", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "createChallenge",
    stateMutability: "payable",
    inputs: [
      { name: "label", type: "string" },
      { name: "persona", type: "string" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  { type: "function", name: "CREATE_CHALLENGE_FEE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "challengeCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "challengeIds", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }] },
  {
    type: "function",
    name: "challenges",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [
      { name: "label", type: "string" },
      { name: "persona", type: "string" },
      { name: "exists", type: "bool" },
    ],
  },
  { type: "function", name: "challengeCreator", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "address" }] },
  { type: "function", name: "currentStrictness", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "currentFocus", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "currentSeason", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  {
    type: "event",
    name: "Submitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "petitioner", type: "address", indexed: true },
      { name: "challengeId", type: "bytes32", indexed: true },
      { name: "strictness", type: "uint8", indexed: false },
      { name: "season", type: "uint32", indexed: false },
      { name: "focus", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ChallengeCreated",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "label", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VerdictReached",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "petitioner", type: "address", indexed: true },
      { name: "verdict", type: "uint8", indexed: false },
      { name: "raw", type: "string", indexed: false },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "season", type: "uint32", indexed: false },
      { name: "focus", type: "string", indexed: false },
    ],
  },
] as const;

export const credAbi = [
  {
    type: "function",
    name: "credentialOf",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "challenge", type: "string" },
      { name: "issuedAt", type: "uint64" },
      { name: "strictness", type: "uint8" },
      { name: "holder", type: "address" },
      { name: "season", type: "uint32" },
      { name: "focus", type: "string" },
    ],
  },
  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "locked", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "nextId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const inspAbi = [
  { type: "function", name: "tick", stateMutability: "payable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "advanceSeason", stateMutability: "payable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "strictness", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "tickCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "season", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "focus", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "seasonDueAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "seasonLength", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "admittedThisSeason", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "event",
    name: "SeasonAdvanced",
    inputs: [
      { name: "season", type: "uint32", indexed: true },
      { name: "oldFocus", type: "string", indexed: false },
      { name: "newFocus", type: "string", indexed: false },
      { name: "strictness", type: "uint8", indexed: false },
      { name: "seasonStart", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StrictnessUpdated",
    inputs: [
      { name: "oldStrictness", type: "uint8", indexed: false },
      { name: "newStrictness", type: "uint8", indexed: false },
      { name: "tickCount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const platformAbi = [
  { type: "function", name: "getRequestDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export type Verdict = 0 | 1 | 2 | 3;

export interface Challenge {
  key: string;
  id: Hex;
  label: string;
  icon: string;
  featured?: boolean;
  free?: boolean;
  title: string;
  sub: string;
  ph: string;
  community?: boolean; // registered on-chain by a user via createChallenge (vs. curated)
  creator?: Address; // the community author, when community === true
}

export const CHALLENGES: Challenge[] = [
  {
    key: "job",
    featured: true,
    icon: "💼",
    id: "0xfe8076e403d326e10828e1f4b8c02c3977d2dcb85c2acb527c7c3df3a01c9fdd",
    label: "Job Application Screening",
    title: "Job Application Screening",
    sub: "Write your “why this role” — face the recruiter that can't be charmed.",
    ph: "Paste your cover letter or “why this role / why this company” answer. Be specific: name real projects, metrics, and outcomes…",
  },
  {
    key: "sop",
    icon: "🎓",
    id: "0x9dc0e540bcb66feb716386610198c9bcffde0149a850ef674002c6e9e67df35d",
    label: "Statement of Purpose",
    title: "Statement of Purpose",
    sub: "Your admissions essay, screened by the committee that can't be charmed.",
    ph: "Paste your statement of purpose / personal statement: your goal, concrete evidence (projects, results), and genuine fit with the program…",
  },
  {
    key: "pen",
    icon: "🖊️",
    free: true,
    id: "0x4ad5ecaac6a190e8c2b5d4a08a7d031dd7e088c19df214dbfd54a916236b7963",
    label: "Sell Me This Pen",
    title: "Sell Me This Pen",
    sub: "Pick anything. Sell it to the buyer that can't be charmed.",
    ph: "Choose an object and sell it: who needs it, the one problem it solves, and why now — make it impossible to say no…",
  },
];

/// Ids the on-chain enumeration should NOT surface as community challenges: the curated set (shown with
/// hand-written copy above) plus the retired "Defend Yourself From Mom" examiner, still registered but
/// no longer listed. Anything else returned by challengeIds() is a user-created community examiner.
export const HIDDEN_CHALLENGE_IDS: ReadonlySet<string> = new Set(
  [
    ...CHALLENGES.map((c) => c.id),
    "0xb0e078d425b932d86768fbae797f20fc71289b343659bc2ba92b663663d475da", // retired: Defend Yourself From Mom
  ].map((id) => id.toLowerCase()),
);
