import type { Tier } from "../../types";

const TIER_COLOR: Record<Tier, string> = {
  DEFAULT: "text-tier-default",
  GOLD: "text-tier-gold",
  DIAMOND: "text-tier-diamond",
  RAINBOW: "",
  BESKAR: "text-tier-beskar",
  GALACTIC: "text-tier-galactic",
};

interface Props {
  tier: Tier;
  className?: string;
}

export function TierPill({ tier, className = "" }: Props) {
  return (
    <span className={`tier-pill ${TIER_COLOR[tier]} ${className}`} data-t={tier}>
      {tier}
    </span>
  );
}
