"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import PasswordSettings from "../../components/PasswordSettings";
import MFASettings from "../../components/MFASettings";
import Avatar, { AVATAR_LABELS } from "../../components/Avatars";
import {
  ShieldCheckIcon,
  CheckIcon,
  ClockIcon,
  PhoneIcon,
  AlertTriangleIcon
} from "../../components/Icons";

const PROOF_TYPES = ["Government ID", "Certificate", "Reference"];
const ALL_AVATARS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6", "avatar-7", "avatar-8"];

export default function SettingsPage() {
  const auth = useAuth();
  const [phone, setPhone] = useState("");
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState("avatar-1");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [proofType, setProofType] = useState(PROOF_TYPES[0]);
  const [proofValue, setProofValue] = useState("");
  const [note, setNote] = useState("");
  const [myVerifications, setMyVerifications] = useState([]);
  const [verError, setVerError] = useState("");
  const [verBusy, setVerBusy] = useState(false);

  useEffect(() => {
    if (auth?.user) {
      setPhone(auth.user.contact_phone || "");
      setVisible(!!auth.user.contact_visible);
      setSelectedAvatar(auth.user.avatar || "avatar-1");
      loadVerifications();
    }
  }, [auth?.user]);

  const loadVerifications = async () => {
    try {
      const data = await api("/verification/mine", { auth: true });
      setMyVerifications(data);
    } catch (e) {
      // silent
    }
  };

  if (auth?.loading) return null;
  if (!auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-ink-muted text-sm">Please log in to view account settings.</p>
      </div>
    );
  }

  const saveAvatar = async () => {
    setAvatarError("");
    setAvatarBusy(true);
    setAvatarSaved(false);
    try {
      await api("/auth/avatar", {
        method: "PATCH",
        auth: true,
        body: { avatar: selectedAvatar },
      });
      await auth.refresh();
      setAvatarSaved(true);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    setSaved(false);
    try {
      await api("/auth/contact", {
        method: "PATCH",
        auth: true,
        body: { contact_phone: phone || null, contact_visible: visible },
      });
      await auth.refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    setVerError("");
    setVerBusy(true);
    try {
      await api("/verification/submit", {
        method: "POST",
        auth: true,
        body: { proof_type: proofType, proof_value: proofValue, note: note || null },
      });
      setProofValue("");
      setNote("");
      await auth.refresh();
      await loadVerifications();
    } catch (err) {
      setVerError(err.message);
    } finally {
      setVerBusy(false);
    }
  };

  const status = auth.user.verification_status;
  const isSuperAdmin = auth.user.role === "super_admin";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Account &amp; Trust Center</h1>
        <p className="text-xs sm:text-sm text-ink-muted mt-1">
          Manage your profile picture, contact preferences, and community verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Reputation Card */}
        <div className="bg-surface border border-line/90 rounded-xl p-6 shadow-xs h-fit space-y-5">
          <div className="text-center">
            <Avatar
              id={auth.user.avatar || "avatar-1"}
              name={auth.user.name}
              size="w-20 h-20"
              className="mx-auto shadow-md shadow-line mb-3"
            />
            <h3 className="font-bold text-ink text-base">{auth.user.name}</h3>
            <p className="text-xs text-ink-muted">{auth.user.email}</p>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Role</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                isSuperAdmin
                  ? "bg-brand-solid text-on-brand"
                  : auth.user.role === "admin"
                  ? "bg-brand-soft text-brand"
                  : "bg-surface-muted text-ink-soft"
              }`}>
                {isSuperAdmin ? "Super Admin" : auth.user.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Badge Tier</span>
              <span className="font-semibold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full">
                🏅 {auth.user.badge}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Community Credits</span>
              <span className="font-bold text-ink">{auth.user.credits} pts</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Exchanges Completed</span>
              <span className="font-bold text-ink-soft">{auth.user.rating_count}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Trust Verification</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                status === "Verified"
                  ? "bg-success-soft text-success"
                  : status === "Pending"
                  ? "bg-warning-soft text-warning"
                  : "bg-surface-muted text-ink-soft"
              }`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Avatar + Privacy & Verification */}
        <div className="md:col-span-2 space-y-6">
          
          <PasswordSettings />
          <MFASettings />
          {/* Avatar Selection Card */}
          <div className="bg-surface border border-line/90 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-ink text-sm">Choose Profile Avatar</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Pick a colorful community avatar to represent you across noticeboards and messages.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {ALL_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                    selectedAvatar === av
                      ? "border-line bg-brand-soft/50 shadow-xs ring-2 ring-brand/20"
                      : "border-line hover:border-line bg-surface"
                  }`}
                >
                  <Avatar id={av} size="w-12 h-12" />
                  <span className="text-[11px] font-semibold text-ink-soft">
                    {AVATAR_LABELS[av]}
                  </span>
                </button>
              ))}
            </div>

            {avatarError && (
              <p className="text-xs text-danger bg-danger-soft p-2.5 rounded-lg border border-danger-soft">{avatarError}</p>
            )}
            {avatarSaved && (
              <p className="text-xs text-success bg-success-soft p-2.5 rounded-lg border border-success-soft">
                ✓ Avatar updated successfully.
              </p>
            )}

            <button
              type="button"
              onClick={saveAvatar}
              disabled={avatarBusy || selectedAvatar === auth.user.avatar}
              className="px-4 py-2 text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              {avatarBusy ? "Saving..." : "Save Avatar"}
            </button>
          </div>

          {/* Privacy & Contact Card */}
          <div className="bg-surface border border-line/90 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-ink text-sm">Privacy &amp; Contact Sharing</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Your phone number is completely private and only shared when you accept an offer.
              </p>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1.5">Phone number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                    <PhoneIcon className="w-4 h-4" />
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-surface-muted border border-line rounded-xl focus:bg-surface focus:ring-2 focus:ring-brand focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="mt-0.5 rounded border-line text-brand focus:ring-brand"
                />
                <span>Share my phone number with accepted helpers or post owners for quick contact</span>
              </label>

              {error && (
                <p className="text-xs text-danger bg-danger-soft p-2.5 rounded-lg border border-danger-soft">{error}</p>
              )}
              {saved && (
                <p className="text-xs text-success bg-success-soft p-2.5 rounded-lg border border-success-soft">
                  ✓ Contact preferences saved successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-surface-strong hover:bg-surface-strong text-on-brand rounded-xl transition-colors shadow-xs disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </div>

          {/* Verification Center Card */}
          <div className="bg-surface border border-line/90 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink text-sm">Identity &amp; Skill Verification</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Unlock the ability to respond to sensitive help requests.
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                status === "Verified"
                  ? "bg-success-soft text-success border-success-soft"
                  : status === "Pending"
                  ? "bg-warning-soft text-warning border-warning-soft"
                  : "bg-surface-muted text-ink-soft border-line"
              }`}>
                {status}
              </span>
            </div>

            {status === "Verified" ? (
              <div className="bg-success-soft border border-success-soft rounded-xl p-4 flex items-center gap-3 text-success">
                <ShieldCheckIcon className="w-6 h-6 text-success shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">You are a Verified Member!</p>
                  <p className="text-success mt-0.5">Your credentials have been verified by community administrators.</p>
                </div>
              </div>
            ) : status === "Pending" ? (
              <div className="bg-warning-soft border border-warning-soft rounded-xl p-4 flex items-center gap-3 text-warning">
                <ClockIcon className="w-6 h-6 text-warning shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Verification Under Review</p>
                  <p className="text-warning mt-0.5">Your submission is currently queued for administrator approval.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submitVerification} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-ink-soft block mb-1.5">Proof Type</label>
                  <select
                    value={proofType}
                    onChange={(e) => setProofType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-surface-muted border border-line rounded-xl focus:bg-surface focus:ring-2 focus:ring-brand focus:outline-hidden transition-all"
                  >
                    {PROOF_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-soft block mb-1.5">
                    Identifier / Certificate Details / Contact
                  </label>
                  <input
                    required
                    value={proofValue}
                    onChange={(e) => setProofValue(e.target.value)}
                    placeholder="e.g. Aadhaar/DL last 4 digits, certificate ID, or reference neighbor contact"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-surface-muted border border-line rounded-xl focus:bg-surface focus:ring-2 focus:ring-brand focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-soft block mb-1.5">Note to Reviewer (optional)</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain your context or attach any details for verification review..."
                    className="w-full p-3 text-xs bg-surface-muted border border-line rounded-xl focus:bg-surface focus:ring-2 focus:ring-brand focus:outline-hidden transition-all"
                  />
                </div>

                {verError && (
                  <p className="text-xs text-danger bg-danger-soft p-2.5 rounded-lg border border-danger-soft">{verError}</p>
                )}

                <button
                  type="submit"
                  disabled={verBusy}
                  className="px-4 py-2 text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand rounded-xl transition-colors shadow-xs disabled:opacity-60"
                >
                  {verBusy ? "Submitting..." : "Submit for Verification (+15 credits)"}
                </button>
              </form>
            )}

            {/* Submission history */}
            {myVerifications.length > 0 && (
              <div className="pt-4 border-t border-line space-y-2">
                <h4 className="font-semibold text-ink text-xs">Submission History</h4>
                <div className="space-y-2">
                  {myVerifications.map((v) => (
                    <div key={v.id} className="text-xs bg-surface-muted p-3 rounded-xl border border-line flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-ink">{v.proof_type}: </span>
                        <span className="text-ink-soft">{v.proof_value}</span>
                        {v.reviewer_comment && (
                          <p className="text-[11px] text-ink-muted mt-1 italic">&ldquo;{v.reviewer_comment}&rdquo;</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2 ${
                        v.status === "Verified"
                          ? "bg-success-soft text-success"
                          : v.status === "Pending"
                          ? "bg-warning-soft text-warning"
                          : "bg-danger-soft text-danger"
                      }`}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

