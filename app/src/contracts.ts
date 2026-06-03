import type { Address, Hex } from "viem";

/** Hardened multi-challenge set — Somnia Shannon (see repo/deployments.md). */
export const ADDR = {
  judge: "0xf8003915d1836B006b87998eCDe1E294f6Da2781" as Address,
  credential: "0x36C5079f593c1dba473b824587e0621865a89fF2" as Address,
  inspector: "0x08e0449f77EDC2273F2a3A6CaFEa788C2b63B1A9" as Address,
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
    name: "currentStrictness",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "event",
    name: "Submitted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "petitioner", type: "address", indexed: true },
      { name: "challengeId", type: "bytes32", indexed: true },
      { name: "strictness", type: "uint8", indexed: false },
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
    ],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "locked",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const inspAbi = [
  { type: "function", name: "tick", stateMutability: "payable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "strictness", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "tickCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
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
    id: "0xda4f87d416037b8267cc8176843693497c90612beeaad0b1acf2b75369d01ef9",
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
