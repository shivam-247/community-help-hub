"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Button } from "./ui";
export default forwardRef(function PasswordInput(
  { label = "password", className = "", disabled, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative min-w-0">
      <Input
        {...props}
        ref={ref}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={`pr-12 ${className}`}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        aria-pressed={visible}
        className="absolute top-0 right-0"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  );
});
