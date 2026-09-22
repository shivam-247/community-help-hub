import Link from "next/link";
import {
  CHHLogoIcon,
  ShieldCheckIcon,
  StarIcon,
  MessageSquareIcon,
  SparklesIcon,
  CheckIcon,
  XIcon,
} from "../../components/Icons";

export const metadata = {
  title: "About Us - Community Help Hub (CHH)",
  description: "Learn how Community Help Hub transforms chaotic neighborhood chats into trusted, structured mutual aid.",
};

const COMPARISON = [
  {
    feature: "Finding Help",
    whatsapp: "Messages get buried instantly under 500+ daily chats",
    chh: "Structured locality noticeboard with search, categories & priority filters",
  },
  {
    feature: "Identity & Trust",
    whatsapp: "Anyone can join with a SIM card; zero verification",
    chh: "Admin-reviewed Government ID & skill verification badges",
  },
  {
    feature: "Phone Number Privacy",
    whatsapp: "Your mobile number is exposed to everyone in the group",
    chh: "Phone number is encrypted and shared only when you mutually accept an offer",
  },
  {
    feature: "Accountability",
    whatsapp: "No ratings, no tracking; bad actors disappear without consequence",
    chh: "Verified ⭐ peer ratings, community credits & reputation badge rankings",
  },
  {
    feature: "Duplicate & Spam Control",
    whatsapp: "Repeated spammed forwards and unverified rumors",
    chh: "Built-in Machine Learning spam detection & cosine-similarity duplicate checks",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Post What You Need or Offer",
    desc: "Whether it's an emergency plumber, lending tools, donating food, or tutoring calculus, post with clear details in your locality.",
  },
  {
    step: "02",
    title: "AI Auto-Tagging & Safety",
    desc: "Our machine learning engine auto-categorizes your notice, flags potential spam, and prevents duplicate requests nearby.",
  },
  {
    step: "03",
    title: "Connect with Verified Neighbors",
    desc: "Review incoming offers with peer ⭐ ratings, community badges, and verified ID credentials before accepting.",
  },
  {
    step: "04",
    title: "Chat & Rate the Exchange",
    desc: "Coordinate privately via 1-on-1 messaging. Once resolved, exchange ratings to award credits and build community trust.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200/60 ring-4 ring-indigo-50">
          <CHHLogoIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Building safer, closer, more helpful neighborhoods.
        </h1>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
          Community Help Hub (CHH) was created to solve a simple problem: when emergencies happen or neighbors want to help each other, WhatsApp and Telegram groups fail.
        </p>
      </div>

      {/* The 4-Step Journey */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        <div className="text-center max-w-lg mx-auto">
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            A simple, structured mutual aid workflow
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-2 relative">
              <span className="text-2xl font-extrabold text-indigo-200 absolute top-4 right-4 select-none">
                {s.step}
              </span>
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison: WhatsApp vs CHH */}
      <div className="space-y-4">
        <div className="text-center max-w-lg mx-auto">
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
            The Difference
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            Why neighborhood WhatsApp groups don&apos;t work
          </h2>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 w-1/4">Key Need</th>
                  <th className="p-4 w-3/8 text-rose-700">Traditional WhatsApp Groups</th>
                  <th className="p-4 w-3/8 text-indigo-700 bg-indigo-50/50">Community Help Hub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {COMPARISON.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{c.feature}</td>
                    <td className="p-4 text-slate-500">
                      <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
                        <XIcon className="w-3.5 h-3.5 shrink-0" />
                        {c.whatsapp}
                      </span>
                    </td>
                    <td className="p-4 bg-indigo-50/30">
                      <span className="inline-flex items-center gap-1.5 text-indigo-900 font-medium">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {c.chh}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Trust & Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Verified Security</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Unlike anonymous message boards, high-stakes tasks require admin-approved proof of identity.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <StarIcon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Mutual Accountability</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every completed exchange earns verified peer reviews, boosting good neighbors to &ldquo;Community Champion&rdquo;.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">100% Free &amp; Ad-Free</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No algorithms pushing sensationalism. Only honest, real neighborhood mutual aid for people who care.
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl p-8 text-center space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold tracking-tight">Ready to join your neighborhood noticeboard?</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Start lending a hand, borrow tools you need, or get help with tasks today.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Create Free Account
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
          >
            Browse Noticeboard &rarr;
          </Link>
        </div>
      </div>

    </div>
  );
}
