import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="bar">
      <div className="wrap spread" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div className="brand">
          <div className="seal">V</div>
          <div>
            <div className="word">VERDICTUM</div>
            <div className="tagline">
              The verdict isn't advice — it's the transaction.
            </div>
          </div>
        </div>
        <div className="row">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
