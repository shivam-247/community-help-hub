import Link from "next/link";

export const metadata = { title: "Community plans | Community Help Hub" };
const plans = [
  { name: "Community Member", price: "₹0", note: "Free community access", features: ["Create requests and offers", "Respond to neighbors", "Public profile and community reviews"], href: "/signup", action: "Join your community" },
  { name: "Trusted Helper", price: "₹0", note: "With identity verification", features: ["All member features", "Verified badge", "Respond to Help Requests after approval"], href: "/settings", action: "Get verified" },
  { name: "Neighborhood Admin", price: "By invitation", note: "Community governance", features: ["Moderate community posts", "Review verification submissions", "Review reported content"], href: "/about", action: "Learn about our mission" },
  { name: "Community Partner", price: "₹499/month", note: "Proposed plan · Coming soon", features: ["Planned organization profile", "Planned bulk posting", "Planned priority listing"], action: "Coming soon" },
];
export default function PricingPage() {
  return <div className="space-y-10 py-6">
    <div className="text-center max-w-2xl mx-auto space-y-3">
      <p className="text-sm font-semibold text-brand">A place for every neighbor</p>
      <h1 className="text-3xl sm:text-4xl font-bold">Community help starts free</h1>
      <p className="text-ink-soft">Share what you can, ask for what you need, and build trust close to home. Membership and verification are free.</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {plans.map((plan) => <section key={plan.name} className="rounded-xl border border-line bg-surface p-6 flex flex-col gap-5 shadow-sm">
        <h2 className="font-bold text-lg">{plan.name}</h2>
        <div><p className="text-2xl font-bold">{plan.price}</p><p className="text-xs text-ink-muted mt-2">{plan.note}</p></div>
        <ul className="space-y-3 text-sm text-ink-soft flex-1">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
        {plan.href ? <Link href={plan.href} className="rounded-xl bg-brand-solid text-on-brand text-sm font-semibold p-3 text-center hover:bg-brand-solid">{plan.action}</Link> : <button disabled className="rounded-xl bg-surface-muted text-ink-muted text-sm font-semibold p-3">{plan.action}</button>}
      </section>)}
    </div>
    <p className="text-center text-sm text-ink-muted">No payments are collected. Posting quotas and partner subscriptions are planned features.</p>
  </div>;
}

