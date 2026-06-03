import { http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

/** Somnia Shannon testnet (chain id 50312). */
export const somniaShannon = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: ["https://dream-rpc.somnia.network"] } },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
  testnet: true,
});

export const EXPLORER = "https://shannon-explorer.somnia.network";

// A WalletConnect projectId is only needed for WC/mobile wallets. MetaMask (injected) works without
// a real one on desktop; set VITE_WC_PROJECT_ID (free at https://cloud.reown.com) to enable WC.
export const config = getDefaultConfig({
  appName: "Verdictum",
  projectId: import.meta.env.VITE_WC_PROJECT_ID || "verdictum_demo_projectid",
  chains: [somniaShannon],
  transports: { [somniaShannon.id]: http("https://dream-rpc.somnia.network") },
  ssr: false,
});
