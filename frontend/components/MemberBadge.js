import { Badge } from "./ui";
export default function MemberBadge({ plan }) {
  return plan && plan !== "free" ? (
    <Badge variant="outline">
      {plan === "society" ? "Society member" : "Plus member"}
    </Badge>
  ) : null;
}
