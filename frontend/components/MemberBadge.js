import { Text as UIMessage } from "../lib/i18n";
import { Badge } from "./ui";
export default function MemberBadge({ plan }) {
  return plan && plan !== "free" ? (
    <Badge variant="outline">
      <UIMessage>{plan === "society" ? "Society member" : "Plus member"}</UIMessage>
    </Badge>
  ) : null;
}
