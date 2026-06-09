import logo from "../assets/logo.jpg";

/** Brand mark — the round gold-ringed seal, now the Verdictum logo. */
export default function Seal({ className = "" }: { className?: string }) {
  return (
    <div className={`seal${className ? ` ${className}` : ""}`}>
      <img src={logo} alt="Verdictum" />
    </div>
  );
}
