"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  HandHeart,
  KeyRound,
  MapPin,
  MessageCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import NeighbourhoodScene from "./NeighbourhoodScene";
import SignupVerification from "./SignupVerification";
import { useAuth } from "../lib/auth-context";
import { POLICY_VERSION } from "../lib/legal";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "./ui";
import { ErrorMessage, FieldError } from "./FormFeedback";
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
  privacy_consent: z.literal(true, {
    error: "Consent to the account purposes to continue",
  }),
  terms_accepted: z.literal(true, { error: "Accept the terms to continue" }),
  adult_confirmed: z.literal(true, {
    error: "Accounts are for people aged 18 or older",
  }),
});
export default function AuthForm({ signup = false }) {
  const auth = useAuth(),
    router = useRouter();
  const [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [returnQuery, setReturnQuery] = useState(""),
    [complete, setComplete] = useState(false),
    [signupCreated, setSignupCreated] = useState(false);
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setReturnQuery(next ? `?${new URLSearchParams({ next })}` : "");
  }, [signup]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(signup ? signupSchema : loginSchema),
    defaultValues: signup
      ? {
          name: "",
          email: "",
          password: "",
          locality: "",
          privacy_consent: false,
          terms_accepted: false,
          adult_confirmed: false,
        }
      : { email: "", password: "", totp_code: "" },
  });
  async function submit(v) {
    setError("");
    try {
      if (signup)
        await auth.signup(v.name, v.email, v.password, v.locality, {
          privacy_consent: v.privacy_consent,
          terms_accepted: v.terms_accepted,
          adult_confirmed: v.adult_confirmed,
          policy_version: POLICY_VERSION,
        });
      else await auth.login(v.email, v.password, v.totp_code);
      if (signup) {
        setSignupCreated(true);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      setComplete(true);
      router.replace(
        next &&
          next.startsWith("/") &&
          !next.startsWith("//") &&
          !next.includes("\\")
          ? next
          : "/noticeboard",
      );
    } catch (e) {
      setError(
        signup && e.message.includes("already exists")
          ? "We could not create this account. Try signing in or contact support."
          : !signup && e.status === 401
            ? "We couldn’t sign you in. Check your email, password and authenticator code, if enabled."
            : e.message,
      );
    }
  }
  if (signupCreated) return <SignupVerification />;
  return (
    <div className="auth-layout meadow-enter">
      <UIElement as="aside" className="auth-story" aria-label="Your neighbourhood starts here">
        <p className="eyebrow mb-5"><UIMessage>Neighbours make the difference</UIMessage></p>
        <h2 className="display-title"><UIMessage>
          A familiar face.
          </UIMessage><br /><UIMessage>A helping hand.
          </UIMessage><br />
          <em className="text-brand"><UIMessage>A place to belong.</UIMessage></em>
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-ink-muted"><UIMessage>
          Good neighbourhoods grow from everyday kindness. Find yours in a
          shared skill, a borrowed tool, or a simple hello.
        </UIMessage></p>
        <NeighbourhoodScene />
        <ul className="grid grid-cols-3 gap-3 mt-5 text-xs leading-5 text-ink-muted">
          {[
            [MapPin, "Keep it local"],
            [MessageCircle, "Talk privately"],
            [HandHeart, "Share freely"],
          ].map(([Icon, label]) => (
            <li key={label}>
              <Icon aria-hidden="true" className="mb-2 size-5 text-brand" />
              <UIMessage>{label}</UIMessage>
            </li>
          ))}
        </ul>
      </UIElement>
      <div>
        <Card className="auth-card">
          <CardHeader className="p-0! mb-6">
            <div className="auth-mobile-intro">
              <HandHeart aria-hidden="true" className="size-4 text-brand" />
              <p className="eyebrow"><UIMessage>Your neighbourhood starts here</UIMessage></p>
            </div>
            <span className="tone-icon tone-skill mb-5">
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <h1 id="auth-heading" className="font-semibold">
              <UIMessage>{signup ? "Join your neighbourhood" : "Welcome back"}</UIMessage>
            </h1>
            <CardDescription>
              <UIMessage>{signup
                ? "Start free. A few details help neighbours recognise you."
                : "Sign in to follow your requests and conversations."}</UIMessage>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0! space-y-5">
            <ErrorMessage message={error} />
            {complete ? (
              <div role="status" className="auth-success">
                <CheckCircle2 aria-hidden="true" className="size-6 mb-3" />
                <p className="font-semibold">
                  <UIMessage>{signup
                    ? "You’re part of the neighbourhood."
                    : "You’re signed in."}</UIMessage>
                </p>
                <p className="mt-2 text-sm"><UIMessage>Opening your page…</UIMessage></p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(submit)}
                aria-busy={isSubmitting}
                className="space-y-5"
              >
                <fieldset disabled={isSubmitting} className="space-y-5 min-w-0">
                  {(signup
                    ? [
                        ["name", "Display name", "Enter your name"],
                        ["email", "Email address", "you@example.com"],
                        [
                          "locality",
                          "Area / society",
                          "e.g. Alkapuri, Vadodara",
                        ],
                      ]
                    : [["email", "Email address", "you@example.com"]]
                  ).map(([key, label, placeholder]) => (
                    <div key={key}>
                      <Label htmlFor={`auth-${key}`}><UIMessage>{label}</UIMessage></Label>
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
                        aria-invalid={!!errors[key]}
                        aria-describedby={
                          errors[key] ? `error-${key}` : undefined
                        }
                      />
                      <FieldError id={`error-${key}`} error={errors[key]} />
                    </div>
                  ))}
                  <div>
                    <Label htmlFor="auth-password"><UIMessage>
                      Password</UIMessage><UIMessage>{signup ? " · at least 12 characters" : ""}</UIMessage>
                    </Label>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        className="pr-12"
                        type={show ? "text" : "password"}
                        autoComplete={
                          signup ? "new-password" : "current-password"
                        }
                        {...register("password")}
                        aria-invalid={!!errors.password}
                        aria-describedby={
                          errors.password ? "error-password" : undefined
                        }
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
                    <details className="auth-code-details">
                      <summary>
                        <span className="flex items-center gap-2">
                          <ShieldCheck aria-hidden="true" className="size-4" /><UIMessage>I
                          use an authenticator
                        </UIMessage></span>
                        <ChevronDown aria-hidden="true" className="size-4" />
                      </summary>
                      <p className="text-xs leading-5 text-ink-muted mb-3"><UIMessage>
                        If you enabled two-step verification, enter the current
                        code from your authenticator app.
                      </UIMessage></p>
                      <Label htmlFor="auth-code" className="mt-3"><UIMessage>
                        6-digit code
                      </UIMessage></Label>
                      <Input
                        id="auth-code"
                        aria-invalid={!!errors.totp_code}
                        aria-describedby={
                          errors.totp_code ? "error-totp_code" : undefined
                        }
                        className="tracking-[.35em] font-semibold"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        {...register("totp_code")}
                      />
                      <FieldError
                        id="error-totp_code"
                        error={errors.totp_code}
                      />
                    </details>
                  )}
                  {signup && (
                    <fieldset className="auth-consent space-y-3" aria-labelledby="signup-consent-heading">
                      <p id="signup-consent-heading" className="font-semibold text-sm"><UIMessage>
                        Before creating your account
                      </UIMessage></p>
                      <p className="text-sm text-ink-muted"><UIMessage>
                        We use your display name, email, password and area to
                        run your account and nearby exchanges. Name and area
                        appear on your profile. Phone and photo are optional;
                        email alerts start off. Use an area, not your full home
                        address.</UIMessage>{" "}
                        <Link className="underline" href="/privacy"><UIMessage>
                          Privacy notice and withdrawal options
                        </UIMessage></Link>
                        .
                      </p>
                      {[
                        [
                          "privacy_consent",
                          <><UIMessage>
                            I consent to use of my information for these account
                            and exchange purposes.
                          </UIMessage></>,
                        ],
                        [
                          "terms_accepted",
                          <><UIMessage>
                            I agree to the</UIMessage>{" "}
                            <Link className="underline" href="/terms"><UIMessage>
                              Terms and conditions
                            </UIMessage></Link>
                            .
                          </>,
                        ],
                        [
                          "adult_confirmed",
                          <><UIMessage>I confirm I am at least 18 years old.</UIMessage></>,
                        ],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label
                            className="min-h-11 flex items-start gap-3 py-2 text-sm"
                            htmlFor={`auth-${key}`}
                          >
                            <input
                              id={`auth-${key}`}
                              type="checkbox"
                              {...register(key)}
                              aria-invalid={!!errors[key]}
                              aria-describedby={
                                errors[key] ? `error-${key}` : undefined
                              }
                            />
                            <span><UIMessage>{label}</UIMessage></span>
                          </label>
                          {errors[key] && (
                            <p
                              id={`error-${key}`}
                              role="alert"
                              className="text-danger text-sm"
                            >
                              {errors[key].message}
                            </p>
                          )}
                        </div>
                      ))}
                    </fieldset>
                  )}
                  <Button
                    loading={isSubmitting}
                    type="submit"
                    className="auth-submit"
                  >
                    <UIMessage>{signup ? "Create account" : "Sign in"}</UIMessage>
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </fieldset>
              </form>
            )}
            <p className="text-sm text-ink-muted border-t border-line pt-5">
              <UIMessage>{signup ? "Already a neighbour? " : "New here? "}</UIMessage>
              <Link
                className="inline-flex items-center min-h-11 text-brand font-semibold underline underline-offset-4"
                href={`${signup ? "/login" : "/signup"}${returnQuery}`}
              >
                <UIMessage>{signup ? "Sign in" : "Create an account"}</UIMessage>
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="auth-meta">
          <ShieldCheck aria-hidden="true" className="size-3.5" /><UIMessage>
          Your password and codes stay private.
        </UIMessage></p>
      </div>
    </div>
  );
}
