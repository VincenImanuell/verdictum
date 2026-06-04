import type { Address, Hex } from "viem";

/// Season-aware multi-challenge set — Somnia Shannon (see repo/deployments.md).
/// NOTE: addresses are updated by script/deploy_v2.sh on each redeploy.
export const ADDR = {
  judge: "0x8eab3B290DFc329d0f4EFe59E5C8E5adbfE617C8" as Address,
  credential: "0x97f27ea3c86D70e20C6a390385E9E5dCcc200AE8" as Address,
  inspector: "0xBca5618226fF717C7C1Cc339376A980acF593cF9" as Address,
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

export interface ChallengeCopy {
  title: string;
  sub: string;
  ph: string;
}
export interface Challenge {
  key: string;
  id: Hex;
  label: string;
  icon: string;
  featured?: boolean;
  free?: boolean;
  en: ChallengeCopy;
  id_: ChallengeCopy;
}

export const CHALLENGES: Challenge[] = [
  {
    key: "job",
    featured: true,
    icon: "💼",
    id: "0xfe8076e403d326e10828e1f4b8c02c3977d2dcb85c2acb527c7c3df3a01c9fdd",
    label: "Job Application Screening",
    en: {
      title: "Job Application Screening",
      sub: "Write your “why this role” — face the recruiter that can't be charmed.",
      ph: "Paste your cover letter or “why this role / why this company” answer. Be specific: name real projects, metrics, and outcomes…",
    },
    id_: {
      title: "Screening Lamaran Kerja",
      sub: "Tulis “kenapa peran ini” — hadapi recruiter yang tak bisa dirayu.",
      ph: "Tempel cover letter atau jawaban “kenapa peran/perusahaan ini”. Spesifik: sebut proyek nyata, metrik, dan hasil…",
    },
  },
  {
    key: "thesis",
    icon: "🎓",
    id: "0x9b1d0259263e7dcb2009d85fcdd5710c935ed8f56728b8a28d2ec240476e68c2",
    label: "SIDANG - Thesis Defense",
    en: {
      title: "SIDANG — Thesis Defense",
      sub: "Defend your thesis title + abstract before an AI examiner.",
      ph: "Submit your thesis TITLE and ABSTRACT: research question, method, sample, the literature gap, and your contribution…",
    },
    id_: {
      title: "SIDANG — Sidang Skripsi",
      sub: "Pertahankan judul + abstrak skripsimu di hadapan penguji AI.",
      ph: "Kirim JUDUL dan ABSTRAK skripsi: pertanyaan penelitian, metode, sampel, gap literatur, dan kontribusimu…",
    },
  },
  {
    key: "mom",
    icon: "🔥",
    free: true,
    id: "0xb0e078d425b932d86768fbae797f20fc71289b343659bc2ba92b663663d475da",
    label: "Defend Yourself From Mom",
    en: {
      title: "Defend Yourself From Mom",
      sub: "Plead your most ridiculous case. Mom is not amused easily.",
      ph: "Make your excuse. Be honest, take responsibility, and bring a believable plan (a little charm helps)…",
    },
    id_: {
      title: "Bela Diri dari Dimarahi Ibu",
      sub: "Bela perkaramu yang paling konyol. Ibu tak mudah luluh.",
      ph: "Sampaikan alasanmu. Jujur, bertanggung jawab, dan bawa rencana yang masuk akal (sedikit pesona membantu)…",
    },
  },
];
