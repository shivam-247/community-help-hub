"use client";
import { Text as UIMessage } from "../lib/i18n";

import { forwardRef } from "react";
import { Label, Input, cn } from "./ui";
import { Text } from "../lib/i18n";
export const Textarea = forwardRef(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn("filter-control", className)}
      {...props}
    />
  );
});
export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return (
    <select ref={ref} className={cn("filter-control", className)} {...props} />
  );
});
export function Field({
  id,
  label,
  hint,
  error,
  as: Component = Input,
  ...props
}) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}><UIMessage>{label}</UIMessage></Label>
      <Component
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          <Text>{hint}</Text>
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          <Text>{error}</Text>
        </p>
      )}
    </div>
  );
}
