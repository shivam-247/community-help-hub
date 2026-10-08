import { Sprout, HandHeart, ShieldCheck, Award } from "lucide-react";
import { Badge } from "./ui";
export default function BadgeTier({ tier = "Newcomer" }) {
  const name =
    {
      "Community Champion": "Champion",
      "Trusted Helper": "Trusted",
      "Active Helper": "Helper",
    }[tier] || tier;
  const Icon =
    {
      Newcomer: Sprout,
      Helper: HandHeart,
      Trusted: ShieldCheck,
      Champion: Award,
    }[name] || Sprout;
  return (
    <Badge variant={name === "Newcomer" ? "outline" : "secondary"}>
      <Icon aria-hidden="true" className="size-3.5" />
      {name}
    </Badge>
  );
}
