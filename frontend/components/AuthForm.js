"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { POLICY_VERSION } from "../lib/legal";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui";
import { ErrorMessage, FieldError } from "./AccountPanels";
const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(128),
  totp_code: z.string().regex(/^(?:\d{6})?$/, "Enter a six-digit code"),
});
const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters").max(128),
  locality: z.string().trim().min(2, "Enter your area").max(100),
  privacy_consent: z.literal(true, {error: "Consent to the account purposes to continue"}),
  terms_accepted: z.literal(true, {error: "Accept the terms to continue"}),
  adult_confirmed: z.literal(true, {error: "Accounts are for people aged 18 or older"}),
});
export default function AuthForm({ signup = false }) {
  const auth = useAuth(),
    router = useRouter();
  const [error, setError] = useState(""),
    [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signup ? signupSchema : loginSchema),
    defaultValues: signup
      ? { name: "", email: "", password: "", locality: "", privacy_consent:false, terms_accepted:false, adult_confirmed:false }
      : { email: "", password: "", totp_code: "" },
  });
  async function submit(v) {
    setError("");
    try {
      if (signup) await auth.signup(v.name, v.email, v.password, v.locality, {privacy_consent:v.privacy_consent, terms_accepted:v.terms_accepted, adult_confirmed:v.adult_confirmed, policy_version:POLICY_VERSION});
      else await auth.login(v.email, v.password, v.totp_code);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(
        next &&
          next.startsWith("/") &&
          !next.startsWith("//") &&
          !next.includes("\\")
          ? next
          : "/noticeboard",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center sm:py-10">
      <section className="hidden md:block">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold mb-5">
          Your neighbourhood, connected
        </p>
        <h2 className="text-4xl font-semibold leading-tight">
          A familiar place.
          <br />A helping hand.
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed mt-5">
          Share what you can, ask for what you need, and get to know the people
          nearby.
        </p>
        <p className="flex gap-3 items-center text-sm text-ink-muted mt-8 border-t border-line pt-5">
          <ShieldCheck className="size-5 text-brand" />
          Your phone number stays private by default.
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>
            {signup ? "Join your neighbourhood" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {signup
              ? "Start free. A few details help neighbours recognise you."
              : "Sign in to follow your requests and conversations."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ErrorMessage message={error} />
          <form onSubmit={handleSubmit(submit)} className="space-y-5">
            {(signup
              ? [
                  ["name", "Display name", "Shivam"],
                  ["email", "Email address", "you@example.com"],
                  ["locality", "Area / society", "Gota, Ahmedabad · 382481"],
                ]
              : [["email", "Email address", "you@example.com"]]
            ).map(([key, label, placeholder]) => (
              <div key={key}>
                <Label htmlFor={`auth-${key}`}>{label}</Label>
                <Input
                  id={`auth-${key}`}
                  type={key === "email" ? "email" : "text"}
                  placeholder={placeholder}
                  autoComplete={
                    key === "email"
                      ? "username"
                      : key === "name"
                        ? "name"
                        : "address-level2"
                  }
                  {...register(key)}
                  aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined}
                />
                <FieldError id={`error-${key}`} error={errors[key]} />
              </div>
            ))}
            <div>
              <Label htmlFor="auth-password">
                Password{signup ? " · at least 12 characters" : ""}
              </Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  className="pr-12"
                  type={show ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  {...register("password")}
                  aria-invalid={!!errors.password} aria-describedby={errors.password ? "error-password" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              <FieldError id="error-password" error={errors.password} />
            </div>
            {!signup && (
              <details>
                <summary className="text-sm cursor-pointer text-ink-muted">
                  I use an authenticator
                </summary>
                <Label htmlFor="auth-code" className="mt-3">
                  6-digit code
                </Label>
                <Input
                  id="auth-code"
                  aria-invalid={!!errors.totp_code}
                  aria-describedby={errors.totp_code ? "error-totp_code" : undefined}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  {...register("totp_code")}
                />
                <FieldError id="error-totp_code" error={errors.totp_code} />
              </details>
            )}
            {signup && <fieldset className="space-y-3 border-t border-line pt-4"><legend className="font-semibold text-sm">Before creating your account</legend><p className="text-sm text-ink-muted">We use your display name, email, password and area to run your account and nearby exchanges. Name and area appear on your profile. Phone and photo are optional; email alerts start off. Use an area, not your full home address. <Link className="underline" href="/privacy">Privacy notice and withdrawal options</Link>.</p>{[
              ["privacy_consent", <>I consent to use of my information for these account and exchange purposes.</>],
              ["terms_accepted", <>I agree to the <Link className="underline" href="/terms">Terms and conditions</Link>.</>],
              ["adult_confirmed", <>I confirm I am at least 18 years old.</>]
            ].map(([key,label])=><div key={key}><label className="min-h-11 flex items-start gap-3 py-2 text-sm" htmlFor={`auth-${key}`}><input id={`auth-${key}`} type="checkbox" {...register(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} aria-describedby={errors[key]?`error-${key}`:undefined} /><span>{label}</span></label>{errors[key]&&<p id={`error-${key}`} role="alert" className="text-danger text-sm">{errors[key].message}</p>}</div>)}</fieldset>}
            <Button loading={isSubmitting} type="submit" className="w-full">
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-ink-muted border-t border-line pt-5">
            {signup ? "Already a neighbour? " : "New here? "}
            <Link
              className="text-brand font-medium"
              href={signup ? "/login" : "/signup"}
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
