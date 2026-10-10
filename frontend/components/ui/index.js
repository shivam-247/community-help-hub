"use client";
// shadcn-style primitives: Radix owns accessibility; tokens own the visual language.
import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { icons, X, LoaderCircle, Circle } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...v) => twMerge(clsx(v));
export const Button = forwardRef(function Button(
  {
    className,
    variant = "default",
    size = "default",
    asChild,
    loading,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const variants = {
    default: "bg-brand-solid text-on-brand hover:brightness-110",
    outline: "border border-line bg-surface hover:bg-surface-muted",
    secondary: "bg-brand-soft text-brand hover:brightness-95",
    ghost: "hover:bg-surface-muted",
    destructive: "bg-danger-soft text-danger border border-danger",
  };
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
        variants[variant] || variants.default,
        size === "icon" && "w-11 p-2",
        size === "sm" && "px-3 text-xs",
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  );
});
export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-muted disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
export const Label = ({ className, ...props }) => (
  <label
    className={cn("block text-sm font-medium mb-2", className)}
    {...props}
  />
);
export const Badge = ({ className, variant = "secondary", ...props }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
      {
        secondary: "border-transparent bg-brand-soft text-brand",
        outline: "border-line text-ink-soft",
        success: "bg-success-soft text-success border-transparent",
        warning: "bg-warning-soft text-warning border-transparent",
        destructive: "bg-danger-soft text-danger border-transparent",
      }[variant],
      className,
    )}
    {...props}
  />
);
export const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-xl border border-line bg-surface text-ink",
      className,
    )}
    {...props}
  />
);
export const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 sm:p-6 space-y-2", className)} {...props} />
);
export const CardTitle = ({ className, ...props }) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
);
export const CardDescription = ({ className, ...props }) => (
  <p
    className={cn("text-sm leading-relaxed text-ink-muted", className)}
    {...props}
  />
);
export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
);
export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex min-h-11 gap-1 p-1 rounded-lg bg-surface-muted",
      className,
    )}
    {...props}
  />
);
export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      "min-h-11 whitespace-nowrap rounded-md px-3 py-2 text-sm text-ink-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
);
export const TabsContent = ({ className, ...props }) => (
  <TabsPrimitive.Content
    className={cn("mt-6 space-y-6 outline-none", className)}
    {...props}
  />
);
export const Progress = ({ value = 0, label = "Progress", className }) => (
  <ProgressPrimitive.Root
    value={value}
    aria-label={label}
    className={cn(
      "h-2 w-full overflow-hidden rounded-full bg-surface-muted",
      className,
    )}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-brand-solid transition-transform"
      style={{
        width: "100%",
        transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)`,
      }}
    />
  </ProgressPrimitive.Root>
);
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = ({ className, ...props }) => (
  <Dialog.Title className={cn("text-xl font-semibold", className)} {...props} />
);
export const SheetDescription = ({ className, ...props }) => (
  <Dialog.Description
    className={cn("text-sm text-ink-muted mt-2", className)}
    {...props}
  />
);
export const SheetContent = ({ children, className, ...props }) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
    <Dialog.Content
      className={cn(
        "fixed z-50 inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-line bg-surface p-6 shadow-xl",
        className,
      )}
      {...props}
    >
      <Dialog.Close
        className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-muted"
        aria-label="Close panel"
      >
        <X className="size-5" />
      </Dialog.Close>
      {children}
    </Dialog.Content>
  </Dialog.Portal>
);
export function Icon({ name, decorative, size = "md", className, ...props }) {
  const key = name
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
  const Comp = icons[key] || Circle;
  return (
    <Comp
      aria-hidden={decorative || undefined}
      className={cn(
        size === "sm" ? "size-4" : size === "xl" ? "size-12" : "size-5",
        "shrink-0",
        className,
      )}
      {...props}
    />
  );
}
