"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../components/ToastProvider";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../components/ui";
const descriptions = {
  free: "For everyday neighbourly help.",
  plus: "For neighbours who share more often.",
  society: "A shared board for your residents.",
};
export default function PricingPage() {
  const auth = useAuth(),
    toast = useToast();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [cycle, setCycle] = useState("monthly"),
    [busy, setBusy] = useState("");
  const load = () =>
    api("/plans")
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  async function checkout(plan) {
    setBusy(plan);
    setError("");
    try {
      await api("/billing/checkout", {
        method: "POST",
        auth: true,
        body: { plan, cycle, checkout_key: crypto.randomUUID() },
      });
      toast("Plan updated. This was a test checkout; no money was charged.");
      window.location.assign("/settings?tab=billing");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-10">
      <header className="max-w-2xl mx-auto text-center space-y-4">
        <Badge variant="outline">Community help stays free</Badge>
        <h1 className="text-4xl sm:text-5xl font-semibold">
          A plan for your neighbourhood.
        </h1>
        <p className="text-ink-muted leading-relaxed">
          More room to share, or a board for your whole society. No charges
          between neighbours.
        </p>
        <div className="flex flex-wrap justify-center gap-3 items-center">
          <Tabs value={cycle} onValueChange={setCycle}>
            <TabsList aria-label="Billing interval">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge>Save about 20% yearly</Badge>
          <p className="text-sm text-ink-muted">
            Priority listings are labelled. Paid membership badges show a plan,
            not an identity check. Identity verification requires a separate
            evidence review on every plan. All plans currently have no ads.
            Fair-use rate limits still apply.
          </p>
          <p className="text-sm text-ink-muted">
            Test checkout only; no money is charged.{" "}
            <Link className="underline" href="/refunds">
              Refund and cancellation policy
            </Link>{" "}
            ·{" "}
            <Link className="underline" href="/terms">
              Terms
            </Link>{" "}
            ·{" "}
            <Link className="underline" href="/contact">
              Operator details
            </Link>
          </p>
        </div>
      </header>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger">
          {error}
          <Button variant="ghost" onClick={load}>
            Try again
          </Button>
        </div>
      )}
      {!data && !error ? (
        <p role="status">Loading plans…</p>
      ) : (
        data && (
          <>
            <div className="bg-warning-soft text-warning border border-line rounded-lg p-4 text-sm">
              {data.mock_checkout
                ? "Test checkout is enabled. No real payment is collected; invoices are labelled test mode."
                : "Paid checkout is not configured yet. No payment will be collected."}
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {Object.entries(data.plans).map(([key, plan]) => (
                <Card
                  key={key}
                  className={key === "plus" ? "border-brand border-2" : ""}
                >
                  <CardHeader>
                    <div className="flex justify-between gap-2 items-center">
                      <CardTitle>{plan.name}</CardTitle>
                      {key === "plus" && <Badge>More posting capacity</Badge>}
                    </div>
                    <CardDescription>{descriptions[key]}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p>
                      <span className="text-4xl font-semibold">
                        ₹
                        {(plan[`${cycle}_paise`] / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-ink-muted">
                        /{cycle === "monthly" ? "month" : "year"}
                      </span>
                    </p>
                    <ul className="space-y-3 text-sm">
                      {[
                        plan.posts_per_month == null
                          ? "Unlimited posts and active notices"
                          : `${plan.posts_per_month} posts each calendar month`,
                        "Area, category and search filters",
                        ...(plan.priority
                          ? [
                              "Priority listing",
                              "Advanced verified-member filter",
                            ]
                          : []),
                        ...(plan.email_alerts
                          ? ["Email alerts after email verification"]
                          : []),
                        ...(plan.community_tools
                          ? [
                              "Private society board",
                              "Resident invites and board analytics",
                            ]
                          : []),
                      ].map((s) => (
                        <li key={s} className="flex items-start gap-2">
                          <Check className="size-4 text-brand shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    {auth?.user ? (
                      <Button
                        className="w-full"
                        loading={busy === key}
                        disabled={
                          !!busy || (key !== "free" && !data.mock_checkout)
                        }
                        onClick={() => checkout(key)}
                      >
                        {key === "free"
                          ? "Choose Free"
                          : `Try ${plan.name} test checkout`}
                        <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href="/signup">
                          Start with an account
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <section>
              <h2 className="text-2xl font-semibold mb-5">
                Compare the details
              </h2>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm text-left bg-surface">
                  <caption className="sr-only">
                    Plan feature comparison in Indian rupees
                  </caption>
                  <thead>
                    <tr className="bg-surface-muted">
                      {["Feature", "Free", "Plus", "Society"].map((s) => (
                        <th key={s} scope="col" className="p-4">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Posts per calendar month", 5, "Unlimited", "Unlimited"],
                      [
                        "Membership badge",
                        "Free",
                        "Plus member",
                        "Society member",
                      ],
                      ["Ads", "None", "None", "None"],
                      ["Basic filters", "Included", "Included", "Included"],
                      [
                        "Priority listing & advanced filters",
                        "—",
                        "Included",
                        "Included",
                      ],
                      ["Verified email alerts", "—", "Included", "Included"],
                      ["Private board and analytics", "—", "—", "Included"],
                    ].map(([label, ...values]) => (
                      <tr key={label} className="border-t border-line">
                        <th scope="row" className="p-4 font-medium">
                          {label}
                        </th>
                        {values.map((v, i) => (
                          <td key={i} className="p-4">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-muted mt-4">
                Post allowance resets on the first of each month. Deleted posts
                still count. Test upgrades last 30 days or 365 days; switching
                to Free is immediate and preserves this month’s usage. Email
                delivery requires the service’s email provider to be configured.
              </p>
            </section>
          </>
        )
      )}
    </div>
  );
}
