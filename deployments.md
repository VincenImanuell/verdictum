# Deployments — Somnia Shannon testnet (chain id 50312)

Platform (IAgentRequester): `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
Explorer: https://shannon-explorer.somnia.network

## ⭐ INTEGRATED SET (canonical — use these for the demo/frontend)

The full autonomous loop wired together (Chapter 5 complete). Deployed 2026-06-03.

| Contract | Address | Role |
|---|---|---|
| `VerdictumJudge` | `0x4b3571c7690072d3a6cd42bCBb3322f6990119bC` | examiner; reads strictness from the Inspector and injects it into every verdict prompt |
| `Credential` (ERC-5192) | `0xB4Ef6c7446E4eB901E64F0E6aD25d8e5FD144f4D` | soulbound; `JUDGE` = the judge above (sole minter) |
| `Inspector` | `0xAd55c4d91181Dd37CF5B821f1E2C93aA27280823` | permissionless `tick()` → `inferNumber(0..100)` sets `strictness` autonomously; reads pass-count from the Credential |

Wiring verified: `judge.credential()`=Credential, `judge.inspector()`=Inspector, `cred.JUDGE()`=judge,
`inspector.CREDENTIAL()`=Credential, `judge.currentStrictness()`=`inspector.strictness()`=50.
Live end-to-end: submit (strictness 50 injected) → consensus PASS → soulbound tokenId 1 minted with
`credentialOf(1)` = ("SIDANG", strictness 50, petitioner). Tx refs below.

> Earlier M4/M5 rows are standalone PROTOTYPES (judge that minted its own credential via initCredential;
> inspector reading that credential). Superseded by the integrated set above — kept for history.

| Milestone | Contract | Address | Notes |
|---|---|---|---|
| M1 | `Counter` (hello-world) | `0xf0C78a961ba70C780aA781988B018dFb3f539256` | store/read a uint; proves compile→deploy→explorer |
| M2 | `JsonAgentCaller` | `0x9EB1F934F0ABd0645764E939Cb5338611c8d3296` | async createRequest→handleResponse via JSON API agent; fetched BTC price (lastValue 6742000000000 ≈ $67,420), status Success |
| M3 | `LlmVerdictCaller` | `0x7Bbd1DCfF7359835294ECf18d40c959ABbAad14b` | THE HEART: on-chain LLM verdict via inferString[PASS,REVISE,FAIL]. Strong thesis → PASS; unsupported over-claim → FAIL (both status Success). LLM agentId `12847293847561029384` (empirically confirmed). |
| M4 | `VerdictumJudge` | `0x490022eA54b1D5E3109CDf741e726B1F7d805e84` | Vertical slice: submit → on-chain LLM verdict → mint SOULBOUND credential on PASS. Constructor `(12847293847561029384, "SIDANG")`. |
| M4 | `Credential` (ERC-5192 soulbound) | `0x0259876de1C7Ba30D3BfcfC8F1f394A1777E0620` | Deployed via `judge.initCredential()`; `JUDGE` = the VerdictumJudge above (sole minter). name "Verdictum Credential" / "VERDICT". supportsInterface(0xb45a3c0e)=true. |
| M5 | `Inspector` (autonomy) | `0xA0B9A4814a7CAC3Ad1f48302212e47b927d720a9` | Permissionless `tick()` → on-chain LLM `inferNumber(0..100)` sets `strictness` autonomously (no human). Reads pass-count from the M4 Credential. **First empirical `inferNumber` round-trip:** tick with passes=1 → consensus returned **50** (moderate), `StrictnessUpdated(50→50)`, status Success. |

LLM Inference agentId (confirmed): `12847293847561029384` · JSON API agentId: `13174292974160097713`

### ⚠️ Somnia gas note (learned at M4)
Gas accounting is ~15x EVM. Deploying `VerdictumJudge` **and** its inner `new Credential` in one
tx needs ~60M+ gas; `eth_estimateGas`/`forge script` (local-sim gas) under-sized it and the tx ran
dry (6.17M, then 15M). Fix: (1) split — Credential is created in a one-time `initCredential()`, not
the constructor; (2) deploy with the **live** estimate (`forge create`/`cast send` call Somnia's
`eth_estimateGas`), never a hand-guessed `--gas-limit`. Judge deploy used ~76M gas; initCredential ~32M.

### Tx references
- M1 deploy: `0x4bb288f23b78614605fd19f032131cd499788b2e320c5b19a8ea5f49045b5f8d`
- M1 setNumber(42): `0x939209592945fa7c5bcefa621d4d6fdf8e7681f119692858e0f0f504588eed8d`
- M2 deploy: `0x0c94876a7ab9bed99f46a3fc0e209d905ac6125186b3024aaddbbccc9ab0606e`
- M2 requestFetch: `0x33236660af738885735047c86e1e3039e9698af72f8e96ba6f1c4a28cc3ca152`
- M3 deploy: `0xa354f6402934e0f6bc1e4114b9561a744e4d24b8c7eab2a9290836fa8da5c5ef`
- M3 submit (→PASS): `0xb0225223c9383096be6205c32a142a861d542a3d21188f4af124ca9fc9936fd8`
- M4 VerdictumJudge deploy: `0x3fcb9236de413c06d404f8580595bfae2a19802bb33d534341c04ddfc0fb6280` (status 1, gasUsed 76,083,491)
- M4 initCredential (deploys Credential): `0x384b3546d16a5c34b66a02a1296533eddbd1936822d25e38a9e8e516f835d619` (gasUsed 32,306,115)
- M4 submit thesis (→ requestId 4257137): `0xd94e3a5e4d80f46892c16cb950ef6bbe25999c8a23e2960c887e2bdd9c337679`
- M4 verdict callback: PASS (status Success), minted soulbound credential tokenId 1 to petitioner `0xf155…1450`. `credentialOf(1)` = ("SIDANG", issuedAt 1780477783, strictness 50, holder petitioner).
- M4 soulbound proof — transferFrom reverts `Soulbound()` (0xa4420a95); real on-chain attempt mined FAILED: `0xc24a8dbf7376e590cebd7375a7d869a2445224b22c5b087b3bf79283b34d2fb0`
- M5 Inspector deploy: `0x22d192d5aadf34958951f9abaafb8a4053a49bffff74ccf8fb890e8cab75fa9b` (gasUsed 25,667,747)
- M5 tick() (requestId 4267919, passes=1): `0x3771eb5ab069b060610a5e0710ba73780b4d50fb1b1d50d7bb6379302a6e16de`
- M5 inferNumber callback → strictness 50 (StrictnessUpdated 50→50): `0x4da14831b2cddf2d15c6c52fae0096f99e2e5bb824e4e7077a17770f5320e6af`

### Integrated set tx references
- Judge setCredential + Inspector deploy + setInspector: see broadcast / explorer for the wallet txs around block ~399.4M.
- Integrated submit (→PASS, strictness 50 injected, minted tokenId 1): `0x4f3d72ce437d88f3eb596269aaa8e81e1684ad79113e2169be4883d4d6b4e2f8`
