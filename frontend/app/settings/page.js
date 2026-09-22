"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
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
        <p className="text-slate-500 text-sm">Please log in to view account settings.</p>
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account &amp; Trust Center</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your profile picture, contact preferences, and community verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Reputation Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs h-fit space-y-5">
          <div className="text-center">
            <Avatar
              id={auth.user.avatar || "avatar-1"}
              name={auth.user.name}
              size="w-20 h-20"
              className="mx-auto shadow-md shadow-indigo-100 mb-3"
            />
            <h3 className="font-bold text-slate-900 text-base">{auth.user.name}</h3>
            <p className="text-xs text-slate-400">{auth.user.email}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Role</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                isSuperAdmin
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                  : auth.user.role === "admin"
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {isSuperAdmin ? "Super Admin" : auth.user.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Badge Tier</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                🏅 {auth.user.badge}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Community Credits</span>
              <span className="font-bold text-slate-900">{auth.user.credits} pts</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Exchanges Completed</span>
              <span className="font-bold text-slate-700">{auth.user.rating_count}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Trust Verification</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                status === "Verified"
                  ? "bg-emerald-50 text-emerald-700"
                  : status === "Pending"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Avatar + Privacy & Verification */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Avatar Selection Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Choose Profile Avatar</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick a colorful community avatar to represent you across noticeboards and messages.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {ALL_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`p-2 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                    selectedAvatar === av
                      ? "border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <Avatar id={av} size="w-12 h-12" />
                  <span className="text-[11px] font-semibold text-slate-600">
                    {AVATAR_LABELS[av]}
                  </span>
                </button>
              ))}
            </div>

            {avatarError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">{avatarError}</p>
            )}
            {avatarSaved && (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                ✓ Avatar updated successfully.
              </p>
            )}

            <button
              type="button"
              onClick={saveAvatar}
              disabled={avatarBusy || selectedAvatar === auth.user.avatar}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              {avatarBusy ? "Saving..." : "Save Avatar"}
            </button>
          </div>

          {/* Privacy & Contact Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Privacy &amp; Contact Sharing</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your phone number is completely private and only shared when you accept an offer.
              </p>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Phone number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <PhoneIcon className="w-4 h-4" />
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Share my phone number with accepted helpers or post owners for quick contact</span>
              </label>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">{error}</p>
              )}
              {saved && (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  ✓ Contact preferences saved successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-xs disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </div>

          {/* Verification Center Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Identity &amp; Skill Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unlock the ability to respond to sensitive help requests.
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                status === "Verified"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : status === "Pending"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {status}
              </span>
            </div>

            {status === "Verified" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">You are a Verified Member!</p>
                  <p className="text-emerald-700 mt-0.5">Your credentials have been verified by community administrators.</p>
                </div>
              </div>
            ) : status === "Pending" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900">
                <ClockIcon className="w-6 h-6 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Verification Under Review</p>
                  <p className="text-amber-700 mt-0.5">Your submission is currently queued for administrator approval.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submitVerification} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Proof Type</label>
                  <select
                    value={proofType}
                    onChange={(e) => setProofType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  >
                    {PROOF_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Identifier / Certificate Details / Contact
                  </label>
                  <input
                    required
                    value={proofValue}
                    onChange={(e) => setProofValue(e.target.value)}
                    placeholder="e.g. Aadhaar/DL last 4 digits, certificate ID, or reference neighbor contact"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Note to Reviewer (optional)</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain your context or attach any details for verification review..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>

                {verError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">{verError}</p>
                )}

                <button
                  type="submit"
                  disabled={verBusy}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs disabled:opacity-60"
                >
                  {verBusy ? "Submitting..." : "Submit for Verification (+15 credits)"}
                </button>
              </form>
            )}

            {/* Submission history */}
            {myVerifications.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h4 className="font-semibold text-slate-800 text-xs">Submission History</h4>
                <div className="space-y-2">
                  {myVerifications.map((v) => (
                    <div key={v.id} className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{v.proof_type}: </span>
                        <span className="text-slate-600">{v.proof_value}</span>
                        {v.reviewer_comment && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{v.reviewer_comment}&rdquo;</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ml-2 ${
                        v.status === "Verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : v.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
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
