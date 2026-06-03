import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLang } from "../i18n";

export default function Header() {
  const { lang, setLang, t } = useLang();
  return (
    <header className="bar">
      <div className="wrap spread" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div className="brand">
          <div className="seal">V</div>
          <div>
            <div className="word">VERDICTUM</div>
            <div className="tagline">
              {t("The verdict isn't advice — it's the transaction.", "Vonis ini bukan saran — ini transaksi.")}
            </div>
          </div>
        </div>
        <div className="row">
          <div className="langtog">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
              EN
            </button>
            <button className={lang === "id" ? "active" : ""} onClick={() => setLang("id")}>
              ID
            </button>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
