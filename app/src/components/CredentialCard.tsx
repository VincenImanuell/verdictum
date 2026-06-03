import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ADDR, credAbi } from "../contracts";
import { EXPLORER } from "../wagmi";
import { useLang } from "../i18n";

interface Meta {
  challenge: string;
  issuedAt: bigint;
  strictness: number;
  holder: string;
}

export default function CredentialCard({ tokenId }: { tokenId: bigint }) {
  const { t } = useLang();
  const client = usePublicClient();
  const [img, setImg] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!client) return;
      const [uri, m] = await Promise.all([
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "tokenURI", args: [tokenId] }),
        client.readContract({ address: ADDR.credential, abi: credAbi, functionName: "credentialOf", args: [tokenId] }),
      ]);
      if (cancelled) return;
      const json = JSON.parse(atob((uri as string).split(",")[1]));
      setImg(json.image as string);
      setMeta({ challenge: m[0], issuedAt: m[1], strictness: Number(m[2]), holder: m[3] });
    })().catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [client, tokenId]);

  if (!meta || !img) return null;
  const issued = new Date(Number(meta.issuedAt) * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="cred" style={{ marginTop: 14 }}>
      <div className="cred-inner">
        <div className="eyebrow" style={{ color: "var(--gold)", marginBottom: 10 }}>
          {t("Soulbound credential minted", "Kredensial soulbound ter-mint")}
        </div>
        <img src={img} alt="Verdictum certificate" />
        <div className="kv">
          <div className="k">{t("Token", "Token")}</div>
          <div className="v mono">#{tokenId.toString()}</div>
          <div className="k">{t("Challenge", "Tantangan")}</div>
          <div className="v">{meta.challenge}</div>
          <div className="k">{t("Strictness at issuance", "Strictness saat terbit")}</div>
          <div className="v mono">{meta.strictness}/100</div>
          <div className="k">{t("Holder", "Pemegang")}</div>
          <div className="v mono">{short(meta.holder)}</div>
          <div className="k">{t("Issued", "Terbit")}</div>
          <div className="v mono">{issued}</div>
        </div>
        <div className="spread" style={{ marginTop: 12 }}>
          <span className="lock">
            🔒 {t("Soulbound · ERC-5192 · non-transferable", "Soulbound · ERC-5192 · tak bisa dipindah")}
          </span>
          <a target="_blank" href={`${EXPLORER}/token/${ADDR.credential}/instance/${tokenId.toString()}`}>
            {t("View on explorer ↗", "Lihat di explorer ↗")}
          </a>
        </div>
      </div>
    </div>
  );
}
