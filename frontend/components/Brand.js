import { Text as UIMessage } from "../lib/i18n";
import { HandHeart } from "lucide-react";

export default function Brand({ compact = false }) {
  return (
    <span className="brand-lockup">
      <span className="brand-symbol">
        <HandHeart aria-hidden="true" />
      </span>
      {!compact && (
        <span className="brand-name"><UIMessage>
          Help Hub</UIMessage><span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
