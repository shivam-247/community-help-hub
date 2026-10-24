"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";

import { useEffect, useState } from "react";
import { ErrorMessage, FieldError } from "./FormFeedback";
import Link from "next/link";
import InvoiceList from "./InvoiceList";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Phone,
  Building2,
  Check,
  Camera,
  ArrowRight,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useLanguage } from "../lib/i18n";
import { useToast } from "./ToastProvider";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Progress,
  Badge,
} from "./ui";
const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your display name").max(100),
  locality: z.string().trim().min(2, "Enter your area").max(100),
  contact_phone: z
    .string()
    .regex(
      /^(?:(?:\+91[ -]?)?[6-9][0-9]{9})?$/,
      "Use a 10-digit Indian mobile number",
    ),
  contact_visible: z.boolean(),
});
const proofSchema = z.object({
  proof_type: z.enum(["Reference"]),
  proof_value: z
    .string()
    .trim()
    .min(10, "Include a society name and a reference who can vouch for you")
    .max(1000),
  note: z.string().max(2000),
});
export function ProfilePanel() {
  const auth = useAuth(),
    toast = useToast();
  const [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: auth.user.name,
      locality: auth.user.locality || "",
      contact_phone: auth.user.contact_phone || "",
      contact_visible: !!auth.user.contact_visible,
    },
  });
  async function save(values) {
    setError("");
    try {
      await api("/account/profile", {
        method: "PATCH",
        auth: true,
        body: { ...values, contact_phone: values.contact_phone || null },
      });
      await auth.refresh();
      toast("Profile saved.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw Error("Choose a photo smaller than 5 MB.");
      const body = new FormData();
      body.append("file", file);
      const data = await api("/posts/upload-image", {
        method: "POST",
        auth: true,
        body,
      });
      await api("/auth/avatar", {
        method: "PATCH",
        auth: true,
        body: { avatar: data.image_url },
      });
      await auth.refresh();
      toast("Profile photo updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle><UIMessage>Your neighbourhood profile</UIMessage></CardTitle>
        <CardDescription><UIMessage>
          Use your name and area so neighbours know who they’re meeting.
        </UIMessage></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Label
            htmlFor="profile-photo"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-4 py-2 rounded-lg text-sm mb-0"
          >
            <Camera className="size-4" />
            <UIMessage>{uploading ? "Uploading…" : "Upload a photo"}</UIMessage>
          </Label>
          <input
            id="profile-photo"
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading || isSubmitting}
            onChange={upload}
          />
          <Button
            variant="ghost"
            disabled={uploading || isSubmitting}
            onClick={async () => {
              try {
                await api("/auth/avatar", {
                  method: "PATCH",
                  auth: true,
                  body: { avatar: "initials" },
                });
                await auth.refresh();
                toast("Using your initials.");
              } catch (e) {
                setError(e.message);
              }
            }}
          ><UIMessage>
            Use initials
          </UIMessage></Button>
          <p className="text-xs text-ink-muted"><UIMessage>
            PNG, JPEG or WebP · up to 5 MB
          </UIMessage></p>
        </div>
        <form onSubmit={handleSubmit(save)} className="space-y-5">
          <fieldset
            disabled={isSubmitting || uploading}
            className="min-w-0 space-y-5"
          >
            {[
              ["name", "Full name", "Enter your name"],
              ["locality", "Area / society", "e.g. Satellite, Ahmedabad"],
              ["contact_phone", "Mobile number (optional)", "+91 9876543210"],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <Label htmlFor={`profile-${key}`}><UIMessage>{label}</UIMessage></Label>
                <Input
                  id={`profile-${key}`}
                  type={key === "contact_phone" ? "tel" : "text"}
                  inputMode={key === "contact_phone" ? "tel" : undefined}
                  autoComplete={
                    key === "contact_phone"
                      ? "tel"
                      : key === "name"
                        ? "name"
                        : "address-level2"
                  }
                  {...register(key)}
                  placeholder={placeholder}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `error-${key}` : undefined}
                />
                <FieldError id={`error-${key}`} error={errors[key]} />
              </div>
            ))}
            <label className="flex items-start gap-3 min-h-11 text-sm">
              <input
                type="checkbox"
                {...register("contact_visible")}
                className="mt-1 size-5"
              />
              <span><UIMessage>
                Share my phone number with accepted exchange participants. It
                stays hidden from the public board.
              </UIMessage></span>
            </label>
            <ErrorMessage message={error} />
            {error && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              ><UIMessage>
                Reload account section
              </UIMessage></Button>
            )}
            <Button loading={isSubmitting} type="submit"><UIMessage>
              Save profile
            </UIMessage></Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
export function TrustPanel() {
  const { t } = useLanguage();
  const auth = useAuth(),
    toast = useToast();
  const [data, setData] = useState(null),
    [history, setHistory] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(proofSchema),
    defaultValues: { proof_type: "Reference", proof_value: "", note: "" },
  });
  async function load() {
    setError("");
    try {
      const [t, h] = await Promise.all([
        api("/account/trust", { auth: true }),
        api("/verification/mine", { auth: true }),
      ]);
      setData(t);
      setHistory(h);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const refresh = () => { if (!document.hidden) load(); };
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(timer); };
  }, []);
  async function action(path, body) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", auth: true, body });
      toast(
        path.endsWith("send")
          ? "Verification code queued for email delivery."
          : "Email verified.",
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(values) {
    setError("");
    try {
      await api("/verification/submit", {
        method: "POST",
        auth: true,
        body: values,
      });
      await load();
      await auth.refresh();
      toast("Your reference is ready for community review.");
    } catch (e) {
      setError(e.message);
    }
  }
  if (!data)
    return (
      <Card>
        <CardHeader>
          <CardTitle><UIMessage>Trust & Verification</UIMessage></CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <>
              <ErrorMessage message={error} />
              <Button onClick={load}><UIMessage>Retry verification status</UIMessage></Button>
            </>
          ) : (
            <p role="status"><UIMessage>Loading verification checks…</UIMessage></p>
          )}
        </CardContent>
      </Card>
    );
  const staff = !!data.staff_access;
  const completed = data
    ? [data.email, data.phone, data.community].filter(Boolean).length
    : 0;
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle><UIMessage>Build trust, one step at a time</UIMessage></CardTitle>
          <CardDescription><UIMessage>
            Each check shows what has actually been reviewed. No step is marked
            complete just because you entered a detail.
          </UIMessage></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between text-sm">
            <span>{t(staff ? "{count} of 3 optional identity checks complete" : "{count} of 3 checks complete", { count: completed })}</span>
            <Badge variant="outline">{data?.status || "Loading"}</Badge>
          </div>
          <Progress
            value={(completed / 3) * 100}
            label="Verification checks completed"
          />
          <ol className="space-y-5">
            {[
              [
                Mail,
                "email",
                "Email address",
                "Confirm a code sent to your email.",
              ],
              [
                Phone,
                "phone",
                "Phone number",
                "Add your number in Profile. A community administrator can confirm it with your reference.",
              ],
              [
                Building2,
                "community",
                "Address / community vouch",
                "Submit your society name and a neighbour or secretary who can vouch for you.",
              ],
            ].map(([Icon, key, title, description], i) => (
              <li key={key} className="flex gap-3">
                <span
                  className={`size-10 rounded-full flex items-center justify-center shrink-0 ${data?.[key] ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted"}`}
                >
                  {data?.[key] ? (
                    <Check className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {i + 1}. <UIMessage>{title}</UIMessage>{" "}
                    <span className="text-xs text-ink-muted font-normal">
                      <UIMessage>{data?.[key] ? "Confirmed" : key === "phone" && data.phone_saved ? "Saved · needs review" : key === "community" && data.status === "pending" ? "Awaiting review" : "Next step"}</UIMessage>
                    </span>
                  </p>
                  <p className="text-sm text-ink-muted leading-relaxed mt-1">
                    <UIMessage>{description}</UIMessage>
                  </p>
                  {key === "phone" && !data.phone && <p className="text-xs mt-2 text-ink-muted"><UIMessage>{data.phone_saved ? "Your number is saved. Ask the moderator to review your phone check after approving your society reference." : "Save an optional phone number in the Profile tab first."}</UIMessage></p>}
                  {key === "community" && staff && <p className="text-xs mt-2 text-brand"><UIMessage>Your staff role already grants moderation access. Community review is not required to use your dashboard; identity checks remain separate.</UIMessage></p>}
                  {key === "email" && !data?.email && (
                    <div className="mt-3 space-y-3">
                      {data && !data.email_delivery_available ? (
                        <p className="text-xs text-warning"><UIMessage>
                          Email delivery is awaiting provider setup. You can
                          submit your community reference below.
                        </UIMessage></p>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            loading={busy}
                            onClick={() => action("/account/email/send", {})}
                          ><UIMessage>
                            Send verification code
                          </UIMessage></Button>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              action("/account/email/verify", { code });
                            }}
                            className="flex gap-2"
                          >
                            <Input
                              aria-label="Six-digit email code"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              inputMode="numeric"
                              maxLength={6}
                              pattern="[0-9]{6}"
                              placeholder="6-digit code"
                              required
                            />
                            <Button
                              type="submit"
                              disabled={busy || code.length !== 6}
                            ><UIMessage>
                              Verify
                            </UIMessage></Button>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <ErrorMessage message={error} />
          {error && (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            ><UIMessage>
              Reload account section
            </UIMessage></Button>
          )}
        </CardContent>
      </Card>
      {!staff && <Card>
        <CardHeader>
          <CardTitle><UIMessage>Request community review</UIMessage></CardTitle>
          <CardDescription><UIMessage>
            Prefer a society reference. Do not enter a full Aadhaar number,
            banking details, passwords, or OTPs.
          </UIMessage></CardDescription>
        </CardHeader>
        <CardContent>
          {data?.status === "pending" ? (
            <p className="text-sm text-warning"><UIMessage>
              Your evidence is awaiting review. The administrator will update
              the result here.
            </UIMessage></p>
          ) : data?.status === "verified" ? (
            <p className="text-sm text-success"><UIMessage>
              Your community evidence has been reviewed. Phone and address
              checks may still need confirmation by an administrator.
            </UIMessage></p>
          ) : (
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
              <div>
                <Label htmlFor="proof-type"><UIMessage>Evidence type</UIMessage></Label>
                <select
                  id="proof-type"
                  className="filter-control"
                  {...register("proof_type")}
                >
                  <option value="Reference"><UIMessage>Reference</UIMessage></option>
                </select>
              </div>
              <div>
                <Label htmlFor="proof-value"><UIMessage>
                  Society reference or evidence details
                </UIMessage></Label>
                <UIElement as="textarea"
                  id="proof-value"
                  aria-invalid={!!errors.proof_value}
                  aria-describedby={
                    errors.proof_value ? "error-proof_value" : undefined
                  }
                  className="filter-control"
                  rows={4}
                  placeholder="Society name and area; a society secretary who has agreed to vouch for you. No government ID, full address or unsolicited contact details."
                  {...register("proof_value")}
                />
                <FieldError id="error-proof_value" error={errors.proof_value} />
              </div>
              <div>
                <Label htmlFor="proof-note"><UIMessage>Note to reviewer (optional)</UIMessage></Label>
                <Input id="proof-note" {...register("note")} />
              </div>
              <p className="text-sm text-ink-muted"><UIMessage>
                Submitting shares this reference with authorised reviewers for
                community verification. Get the reference person’s permission
                first.</UIMessage>{" "}
                <Link className="underline" href="/privacy"><UIMessage>
                  How we use this information
                </UIMessage></Link>
                .
              </p>
              <Button type="submit" loading={isSubmitting}><UIMessage>
                Submit reference for review
              </UIMessage></Button>
            </form>
          )}
          {history.length > 0 && (
            <div className="border-t border-line mt-6 pt-4 space-y-3">
              <h3 className="text-sm font-semibold"><UIMessage>Review history</UIMessage></h3>
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg bg-surface-muted p-3 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <p>{h.proof_type}</p>
                    <Badge variant="outline">{h.status}</Badge>
                  </div>
                  {h.reviewer_comment && (
                    <p className="text-ink-muted mt-2">{h.reviewer_comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}
    </>
  );
}
export function NotificationsPanel() {
  const toast = useToast();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/notifications/preferences", { auth: true })
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setData(
        await api("/notifications/preferences", {
          method: "PATCH",
          auth: true,
          body: { in_app: data.in_app, email_alerts: data.email_alerts },
        }),
      );
      toast("Notification preferences saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle><UIMessage>Stay in the loop</UIMessage></CardTitle>
        <CardDescription><UIMessage>
          Get updates when someone responds, accepts an exchange, or sends a
          message.
        </UIMessage></CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorMessage message={error} />
        {error && (
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          ><UIMessage>
            Reload account section
          </UIMessage></Button>
        )}
        {data ? (
          <form onSubmit={save} className="space-y-5">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {[
                ["in_app", "In-app notifications"],
                ["email_alerts", "Email alerts (Plus and Society)"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 min-h-11 text-sm"
                >
                  <input
                    className="size-5"
                    type="checkbox"
                    checked={data[key]}
                    disabled={key === "email_alerts" && !data.plan_allows_email}
                    onChange={(e) =>
                      setData({ ...data, [key]: e.target.checked })
                    }
                  />
                  <UIMessage>{label}</UIMessage>
                </label>
              ))}
              {!data.plan_allows_email && (
                <p className="text-sm text-ink-muted">
                  <Link className="text-brand underline" href="/pricing"><UIMessage>
                    Upgrade your plan
                  </UIMessage></Link>{" "}<UIMessage>
                  to enable email alerts.
                </UIMessage></p>
              )}
              {(!data.email_verified || !data.email_available) && (
                <p className="text-xs text-warning"><UIMessage>
                  Email alerts are delivered after you verify your email and the
                  service’s email provider is configured. In-app notifications
                  work now.
                </UIMessage></p>
              )}
              <Button type="submit" loading={busy}><UIMessage>
                Save preferences
              </UIMessage></Button>
              <Button asChild variant="ghost">
                <Link href="/notifications"><UIMessage>
                  View notifications
                  </UIMessage><ArrowRight className="size-4" />
                </Link>
              </Button>
            </fieldset>
          </form>
        ) : (
          !error && <p role="status"><UIMessage>Loading preferences…</UIMessage></p>
        )}
      </CardContent>
    </Card>
  );
}
export function BillingPanel() {
  const toast = useToast();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api("/billing", { auth: true })
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  async function downgrade() {
    setBusy(true);
    try {
      await api("/billing/checkout", {
        method: "POST",
        auth: true,
        body: {
          plan: "free",
          cycle: "monthly",
          checkout_key: crypto.randomUUID(),
        },
      });
      await load();
      toast("Switched to Free. Your current usage is preserved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle><UIMessage>Your plan & usage</UIMessage></CardTitle>
          <CardDescription><UIMessage>
            Your allowance resets on the first of each calendar month. Deleted
            posts still count.
          </UIMessage></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ErrorMessage message={error} />
          {error && (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            ><UIMessage>
              Reload account section
            </UIMessage></Button>
          )}
          {data ? (
            <>
              <div className="flex flex-wrap justify-between gap-3">
                <Badge>
                  {data.plan === "society"
                    ? "Society / Community"
                    : data.plan === "plus"
                      ? "Plus"
                      : "Free"}
                </Badge>
                <span className="text-sm text-ink-muted">
                  {data.used}<UIMessage> posts this month
                  </UIMessage>{data.limit == null
                    ? " · Unlimited allowance"
                    : ` · ${data.limit} allowed`}
                </span>
              </div>
              <Progress
                value={data.limit == null ? 0 : (data.used / data.limit) * 100}
                label={
                  data.limit == null
                    ? "Unlimited monthly allowance"
                    : "Monthly post usage"
                }
              />
              {data.expires_at && (
                <p className="text-xs text-ink-muted"><UIMessage>
                  Test entitlement ends</UIMessage>{" "}
                  {new Date(data.expires_at).toLocaleDateString("en-IN")}<UIMessage>. This
                  is not an auto-renewing charge.
                </UIMessage></p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/pricing"><UIMessage>Compare / upgrade plans</UIMessage></Link>
                </Button>
                {data.plan !== "free" && (
                  <Button variant="outline" loading={busy} onClick={downgrade}><UIMessage>
                    Switch to Free now
                  </UIMessage></Button>
                )}
              </div>
              <p className="text-xs text-warning">
                <UIMessage>{data.mock_checkout
                  ? "Test mode: no real payments are collected."
                  : "Paid checkout is not configured."}</UIMessage>
              </p>
            </>
          ) : (
            !error && <p role="status"><UIMessage>Loading billing…</UIMessage></p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle><UIMessage>Invoices</UIMessage></CardTitle>
          <CardDescription><UIMessage>
            INR amounts are set by the server. Test invoices are not tax
            invoices.
          </UIMessage></CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceList />
        </CardContent>
      </Card>
      <SocietyPanel />
    </>
  );
}
export function SocietyPanel() {
  const auth = useAuth(),
    toast = useToast();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]),
    [analytics, setAnalytics] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [pin, setPin] = useState(""),
    [invite, setInvite] = useState("");
  async function load() {
    setError("");
    setLoading(true);
    try {
      const b = await api("/communities", { auth: true });
      setBoards(b);
      for (const x of b)
        if (x.owner_id === auth.user.id) {
          try {
            const a = await api(`/communities/${x.id}/analytics`, {
              auth: true,
            });
            setAnalytics((v) => ({ ...v, [x.id]: a }));
          } catch (e) {
            setError(`Society analytics could not be loaded: ${e.message}`);
          }
        }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function act(path, body) {
    setError("");
    setBusy(true);
    try {
      await api(path, { method: "POST", auth: true, body });
      await load();
      toast("Society board updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle><UIMessage>Your society board</UIMessage></CardTitle>
        <CardDescription><UIMessage>
          Create a board with the Society plan, or join as a resident with an
          invite code.
        </UIMessage></CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ErrorMessage message={error} />
        {error && (
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          ><UIMessage>
            Reload account section
          </UIMessage></Button>
        )}
        {loading && <p role="status"><UIMessage>Loading your society boards…</UIMessage></p>}
        {!loading && !error && !boards.length && (
          <p className="text-sm text-ink-muted"><UIMessage>
            No society board joined yet. Ask your society organiser for an
            invite code.
          </UIMessage></p>
        )}
        {boards.map((b) => (
          <div
            key={b.id}
            className="border border-line rounded-lg p-4 space-y-3"
          >
            <p className="font-semibold">
              {b.name} · {b.pin_code}
            </p>
            <Button asChild variant="outline">
              <Link href={`/noticeboard?community=${b.id}`}><UIMessage>
                Open private board
              </UIMessage></Link>
            </Button>
            {b.invite_code && (
              <>
                <Label><UIMessage>Resident invite code</UIMessage></Label>
                <p className="text-xs break-all select-all bg-surface-muted rounded p-3">
                  {b.invite_code}
                </p>
                <p className="text-xs text-ink-muted"><UIMessage>
                  Share this code only with residents. Members enter it below to
                  join.
                </UIMessage></p>
              </>
            )}
            {analytics[b.id] && (
              <p className="text-sm text-ink-muted">
                {analytics[b.id].members}<UIMessage> members · </UIMessage>{analytics[b.id].posts}{" "}<UIMessage>
                posts · </UIMessage>{analytics[b.id].completed}<UIMessage> completed
              </UIMessage></p>
            )}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act("/communities/join", { invite_code: invite });
          }}
          className="space-y-3"
        >
          <Label htmlFor="society-invite"><UIMessage>Join a society</UIMessage></Label>
          <Input
            id="society-invite"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            minLength={16}
            maxLength={100}
            placeholder="Resident invite code"
            required
          />
          <Button type="submit" variant="outline" disabled={busy}><UIMessage>
            Join board
          </UIMessage></Button>
        </form>
        <details className="border-t border-line pt-3">
          <summary className="text-sm font-medium cursor-pointer"><UIMessage>
            Create a board · Society plan required
          </UIMessage></summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act("/communities", { name, pin_code: pin });
            }}
            className="space-y-3 mt-4"
          >
            <Label htmlFor="society-name"><UIMessage>Society name</UIMessage></Label>
            <Input
              id="society-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={100}
              placeholder="Your society name"
              required
            />
            <Label htmlFor="society-pin"><UIMessage>PIN code</UIMessage></Label>
            <Input
              id="society-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              inputMode="numeric"
              placeholder="382481"
              required
            />
            <Button type="submit" disabled={busy}><UIMessage>
              Create board
            </UIMessage></Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
