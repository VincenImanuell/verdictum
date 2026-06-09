import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bar">
      <div className="wrap spread" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <Link to="/" className="brand" style={{ color: "inherit", textDecoration: "none" }}>
          <div>
            <div className="word">VERDICTUM</div>
            <div className="tagline">
              The verdict isn't advice — it's the transaction.
            </div>
          </div>
        </Link>
        <div className="row">
          <Link to="/" className="btn btn-ghost back-home">
            ← Home
          </Link>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
