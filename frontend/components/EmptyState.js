import { Inbox } from "lucide-react";
import { Card } from "./ui";
export default function EmptyState({ title, description, children }) {
  return (
    <Card className="p-8 text-center space-y-4">
      <Inbox aria-hidden="true" className="size-9 mx-auto text-brand" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {children}
    </Card>
  );
}
