import job from "../assets/icons/challenge-job.png";
import sop from "../assets/icons/challenge-sop.png";
import pen from "../assets/icons/challenge-pen.png";
import verdict from "../assets/icons/icon-verdict.png";
import season from "../assets/icons/icon-season.png";
import recalibrate from "../assets/icons/icon-recalibrate.png";
import soulbound from "../assets/icons/icon-soulbound.png";

// Engraved-gold artwork replacing the old emoji. Single owner of the asset imports so sizing/style
// stays consistent everywhere — same idea as Seal.tsx.
export const ICONS = { job, sop, pen, verdict, season, recalibrate, soulbound } as const;
export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  size = 22,
  alt = "",
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={ICONS[name]}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      draggable={false}
      className={`vicon ${className}`}
      style={style}
    />
  );
}
