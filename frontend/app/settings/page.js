"use client";
import { Text as UIMessage } from "../../lib/i18n";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import Avatar from "../../components/Avatars";
import PageHeader from "../../components/PageHeader";
import BadgeTier from "../../components/BadgeTier";
import PasswordSettings from "../../components/PasswordSettings";
import MFASettings from "../../components/MFASettings";
import {
  ProfilePanel,
  TrustPanel,
  NotificationsPanel,
  BillingPanel,
} from "../../components/AccountPanels";
import {
  Card,
  CardContent,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
export default function SettingsPage() {
  const auth = useAuth(),
    [tab, setTab] = useState("profile");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (
      ["profile", "security", "trust", "notifications", "billing"].includes(t)
    )
      setTab(t);
  }, []);
  if (auth?.loading) return <p role="status"><UIMessage>Loading your account…</UIMessage></p>;
  if (!auth?.user) return null;
  const user = auth.user;
  const next = user.credits < 5 ? 5 : user.credits < 50 ? 50 : 100;
  return (
    <div className="space-y-7">
      <PageHeader
        className="account-banner"
        eyebrow="Your place in the community"
        title="Account & Trust Center"
        description="Make yourself at home. Your profile, privacy and neighbourhood reputation, in one place."
      />
      <details className="account-privacy">
        <summary className="min-h-11 flex items-center text-sm text-brand cursor-pointer"><UIMessage>
          Your information and privacy choices
        </UIMessage></summary>
        <section
          aria-labelledby="privacy-options"
          className="border border-line rounded-xl p-5 space-y-3"
        >
          <h2 id="privacy-options" className="text-lg font-semibold"><UIMessage>
            Your information and choices
          </UIMessage></h2>
          <p className="text-sm text-ink-muted"><UIMessage>
            Phone and photo are optional. Edit your profile or turn off phone
            sharing here; optional email alerts can be disabled under
            Notifications. To request a copy, correction, deletion, consent
            withdrawal or nomination assistance,</UIMessage>{" "}
            <a
              className="underline"
              href="mailto:parmarshivam247@gmail.com?subject=Community%20Help%20Hub%20privacy%20request"
            ><UIMessage>
              email the project maintainer
            </UIMessage></a>{" "}<UIMessage>
            from your account email. Requests are handled manually. Do not send
            passwords or identity documents.
          </UIMessage></p>
          <Link
            className="underline min-h-11 inline-flex items-center"
            href="/privacy"
          ><UIMessage>
            Read how we use your information
          </UIMessage></Link>
        </section>
      </details>
      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
        <aside className="account-summary">
          <Card className="account-profile-card">
            <CardContent className="pt-0! space-y-5">
              <div className="flex lg:flex-col items-center gap-4">
                <Avatar id={user.avatar} name={user.name} size="size-16" />
                <div className="min-w-0 lg:text-center">
                  <h2 className="font-semibold">{user.name}</h2>
                  <p className="text-xs text-ink-muted break-anywhere mt-1">
                    {user.email}
                  </p>
                  <p className="text-xs text-ink-muted mt-2">{user.locality}</p>
                </div>
              </div>
              <div className="border-t border-line pt-5 space-y-4">
                <BadgeTier tier={user.badge} />
                <p className="text-sm">
                  <strong>{user.credits}</strong><UIMessage> community credits
                </UIMessage></p>
                <Progress
                  label="Progress to next badge"
                  value={Math.min(100, (user.credits / next) * 100)}
                />
                <p className="text-xs text-ink-muted leading-relaxed">
                  {user.credits >= 100
                    ? "You’ve reached Champion. Thank you for showing up."
                    : `${next - user.credits} credits to the next tier.`}{" "}<UIMessage>
                  Both people earn 10 credits after confirming an exchange.
                </UIMessage></p>
                <p className="text-xs text-ink-muted"><UIMessage>
                  Newcomer 0 · Helper 5 · Trusted 50 · Champion 100
                </UIMessage></p>
              </div>
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0">
          <p className="lg:hidden text-sm text-ink-muted mb-4">
            {user.name} · {user.credits}<UIMessage> community credits.</UIMessage>{" "}
            <Link
              className="inline-flex min-h-11 items-center underline text-brand"
              href={`/profile/${user.id}`}
            ><UIMessage>
              View my profile
            </UIMessage></Link>
          </p>
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto chip-row pb-1">
              <TabsList aria-label="Account sections">
                <TabsTrigger value="profile"><UIMessage>Profile</UIMessage></TabsTrigger>
                <TabsTrigger value="security"><UIMessage>Security</UIMessage></TabsTrigger>
                <TabsTrigger value="trust"><UIMessage>Trust & Verification</UIMessage></TabsTrigger>
                <TabsTrigger value="notifications"><UIMessage>Notifications</UIMessage></TabsTrigger>
                <TabsTrigger value="billing"><UIMessage>Billing</UIMessage></TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="profile">
              <ProfilePanel />
            </TabsContent>
            <TabsContent value="security">
              <PasswordSettings />
              <MFASettings />
            </TabsContent>
            <TabsContent value="trust">
              <TrustPanel />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsPanel />
            </TabsContent>
            <TabsContent value="billing">
              <BillingPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
