"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, API_BASE } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { LOCATIONS_DATA, STATES_LIST } from "../../lib/locations";
import { PlusIcon, SparklesIcon, AlertTriangleIcon, MapPinIcon } from "../../components/Icons";

const TYPES = ["Need help", "Offer help", "Request item", "Offer service"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function CreatePostPage() {
  const auth = useAuth();
  const router = useRouter();
  const [type, setType] = useState("Need help");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState("");
  const [locality, setLocality] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth?.loading && !auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl mb-3">
            🔐
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-1">Sign in to post</h2>
          <p className="text-xs text-slate-500 mb-5">
            You must be logged in to create a noticeboard post for your neighborhood.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const stateLocalities = state ? (LOCATIONS_DATA[state] || []) : [];

  const handleStateChange = (newState) => {
    setState(newState);
    setLocality("");
  };

  // Compose final locality string to send to API
  const localityValue = locality || state;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side anti-bogus and quality checks
    const titleWords = title.trim().split(/\s+/).filter(Boolean);
    const descWords = description.trim().split(/\s+/).filter(Boolean);

    if (titleWords.length < 2 || title.trim().length < 6) {
      setError("Please provide a descriptive title (at least 2 words, minimum 6 characters).");
      return;
    }

    if (!/[a-zA-Z]{3,}/.test(title)) {
      setError("Title cannot be purely numbers or symbols. Please describe what you need or offer.");
      return;
    }

    if (descWords.length < 4 || description.trim().length < 20) {
      setError("Please provide a clear description (at least 4 words, minimum 20 characters) so neighbors can understand your request.");
      return;
    }

    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(title + " " + description)) {
      setError("The text contains random keyboard mashing. Please write a meaningful description.");
      return;
    }

    if (!state) {
      setError("Please select a State.");
      return;
    }

    if (!locality) {
      setError("Please select a Locality / Area within the state.");
      return;
    }

    setBusy(true);
    try {
      let image_url = null;
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const res = await fetch(`${API_BASE}/posts/upload-image`, {
          method: "POST",
          headers: { "X-CHH-CSRF": "1" },
          credentials: "same-origin",
          body: form,
        });
        if (!res.ok) throw new Error("Photo upload failed. You can still post without it.");
        const data = await res.json();
        image_url = data.image_url;
      }
      const post = await api("/posts", {
        method: "POST",
        auth: true,
        body: {
          type,
          title,
          description,
          locality: localityValue,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          image_url,
        },
      });
      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          &larr; Back to Feed
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">Publish a Notice</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Reach neighbors nearby. Our AI engine will auto-categorize and tag your post automatically.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        
        {/* Type selector */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">I want to...</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                  type === t
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Post Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Need ladder for 2 hours / Giving away study table"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Description with ML Auto-tag indicator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600">Detailed Description</label>
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
              <SparklesIcon className="w-3 h-3" />
              Auto ML Categorization
            </span>
          </div>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain clearly what help you need or what you are offering, any specific timing, or tools involved..."
            className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* State & Locality dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" /> State *
              </span>
            </label>
            <select
              required
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">Select State...</option>
              {STATES_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Locality / Area *</label>
            <select
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              disabled={!state}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Locality...</option>
              {stateLocalities.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority & Deadline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Target Date / Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Photo Upload with Preview */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Attach Photo (optional)</label>
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              accept="image/*"
              id="file-upload"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setImageFile(f);
                setImagePreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="text-slate-500 text-xs font-medium">
                {imageFile ? "Change uploaded photo" : "Click here to upload an image from your device"}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
            </label>
          </div>

          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden max-h-48 border border-slate-200">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
            <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs disabled:opacity-60"
        >
          {busy ? (
            <span>Publishing to Board...</span>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              <span>Publish Post</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}

