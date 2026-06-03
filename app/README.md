# Verdictum — web app (Vite + React + TypeScript + wagmi/viem + RainbowKit)

The type-safe dapp for the Verdictum multi-challenge platform on Somnia Shannon.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 — open in a browser with MetaMask
```

Build a self-contained static bundle (host it anywhere):

```bash
npm run build      # type-checks with tsc, then bundles to dist/
npm run preview    # serve dist on http://localhost:8001
```

You need a little **STT** (faucet: https://testnet.somnia.network) to submit / tick. Reading and the
public **Verify** page work without a wallet.

## Layout

- `src/contracts.ts` — addresses + ABIs (`as const`, fully typed) + the curated challenges
- `src/wagmi.ts` — custom Somnia Shannon chain (`defineChain`) + RainbowKit/wagmi config
- `src/components/` — `Header`, `ChallengePicker`, `SubmitPanel`, `InspectorPanel`, `VerifyPanel`, …
- `src/i18n.tsx` — EN/ID toggle (bilingual)

Optional: set `VITE_WC_PROJECT_ID` (free at https://cloud.reown.com) in a `.env` to enable
WalletConnect / mobile wallets. MetaMask (injected) works without it on desktop.

> A **zero-build** single-file version also lives at `../web/index.html` — open it directly, no npm.
