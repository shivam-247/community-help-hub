"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../../lib/i18n";

import { useLanguage } from "../../lib/i18n";
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
} from "../../components/ui";
const descriptions = {
  free: "For everyday neighbourly help.",
  plus: "For neighbours who share more often.",
  society: "A shared board for your residents.",
};
export default function PricingPage() {
  const { t } = useLanguage();
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
      <header className="max-w-3xl mx-auto text-center space-y-5 py-4">
        <Badge variant="outline"><UIMessage>Community help stays free</UIMessage></Badge>
        <h1 className="display-title text-4xl sm:text-6xl"><UIMessage>
          A plan for your neighbourhood.
        </UIMessage></h1>
        <p className="text-ink-muted leading-relaxed"><UIMessage>
          More room to share, or a board for your whole society. No charges
          between neighbours.
        </UIMessage></p>
        <div className="flex flex-wrap justify-center gap-3 items-center">
          <fieldset className="inline-flex gap-1 rounded-lg border border-line p-1">
            <legend className="sr-only"><UIMessage>Billing interval</UIMessage></legend>
            <div className="flex gap-1">
              <Button
                variant={cycle === "monthly" ? "secondary" : "ghost"}
                aria-pressed={cycle === "monthly"}
                onClick={() => setCycle("monthly")}
              ><UIMessage>
                Monthly
              </UIMessage></Button>
              <Button
                variant={cycle === "yearly" ? "secondary" : "ghost"}
                aria-pressed={cycle === "yearly"}
                onClick={() => setCycle("yearly")}
              ><UIMessage>
                Yearly
              </UIMessage></Button>
            </div>
          </fieldset>
          <Badge><UIMessage>Save about 20% yearly</UIMessage></Badge>
          <p className="text-sm text-ink-muted"><UIMessage>
            Priority listings are labelled. Paid membership badges show a plan,
            not an identity check. Identity verification requires a separate
            evidence review on every plan. All plans currently have no ads.
            Fair-use rate limits still apply.
          </UIMessage></p>
          <p className="text-sm text-ink-muted"><UIMessage>
            Test checkout only; no money is charged.</UIMessage>{" "}
            <Link className="underline" href="/refunds"><UIMessage>
              Refund and cancellation policy
            </UIMessage></Link>{" "}
            ·{" "}
            <Link className="underline" href="/terms"><UIMessage>
              Terms
            </UIMessage></Link>{" "}
            ·{" "}
            <Link className="underline" href="/contact"><UIMessage>
              Operator details
            </UIMessage></Link>
          </p>
        </div>
      </header>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger">
          {error}
          <Button variant="ghost" onClick={load}><UIMessage>
            Try again
          </UIMessage></Button>
        </div>
      )}
      {!data && !error ? (
        <p role="status"><UIMessage>Loading plans…</UIMessage></p>
      ) : (
        data && (
          <>
            <div className="bg-warning-soft text-warning border border-line rounded-lg p-4 text-sm">
              <UIMessage>{data.mock_checkout
                ? "Test checkout is enabled. No real payment is collected; invoices are labelled test mode."
                : "Paid checkout is not configured yet. No payment will be collected."}</UIMessage>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {Object.entries(data.plans).map(([key, plan]) => (
                <Card
                  key={key}
                  className={`plan-card ${key === "plus" ? "plan-featured" : ""}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap justify-between gap-2 items-center">
                      <CardTitle>{plan.name}</CardTitle>
                      {key === "plus" && <Badge><UIMessage>For regular sharers</UIMessage></Badge>}
                    </div>
                    <CardDescription><UIMessage>{descriptions[key]}</UIMessage></CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p>
                      <span className="text-4xl font-semibold">
                        ₹
                        {(plan[`${cycle}_paise`] / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-ink-muted">
                        /<UIMessage>{cycle === "monthly" ? "month" : "year"}</UIMessage>
                      </span>
                    </p>
                    <ul className="space-y-3 text-sm">
                      {[
                        plan.posts_per_month == null
                          ? "Unlimited posts and active notices"
                          : t("{count} posts each calendar month", { count: plan.posts_per_month }),
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
                          <UIMessage>{s}</UIMessage>
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
                        <Link href="/signup"><UIMessage>
                          Start with an account
                          </UIMessage><ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <section>
              <h2 className="text-2xl font-semibold mb-5"><UIMessage>
                Compare the details
              </UIMessage></h2>
              <UIElement as="div"
                role="region"
                aria-label="Compare plan features"
                tabIndex={0}
                className="overflow-x-auto rounded-xl border border-line"
              >
                <table className="w-full text-sm text-left bg-surface">
                  <caption className="sr-only"><UIMessage>
                    Plan feature comparison in Indian rupees
                  </UIMessage></caption>
                  <thead>
                    <tr className="bg-surface-muted">
                      {["Feature", "Free", "Plus", "Society"].map((s) => (
                        <th key={s} scope="col" className="p-4">
                          <UIMessage>{s}</UIMessage>
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
                          <UIMessage>{label}</UIMessage>
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
              </UIElement>
              <p className="text-xs text-ink-muted mt-4"><UIMessage>
                Post allowance resets on the first of each month. Deleted posts
                still count. Test upgrades last 30 days or 365 days; switching
                to Free is immediate and preserves this month’s usage. Email
                delivery requires the service’s email provider to be configured.
              </UIMessage></p>
            </section>
          </>
        )
      )}
    </div>
  );
}
