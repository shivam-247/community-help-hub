"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { ShieldCheckIcon, CheckIcon, XIcon, AlertTriangleIcon } from "../../../components/Icons";

export default function AdminVerificationsPage() {
  const auth = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [comments, setComments] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await api("/admin/verifications", { auth: true });
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.user) load();
  }, [auth?.user]);

  if (auth?.loading) return null;

  if (!auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-slate-500 text-sm">Please log in as an administrator.</p>
      </div>
    );
  }

  if (auth.user.role !== "admin" && auth.user.role !== "super_admin") {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <AlertTriangleIcon className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="font-bold text-rose-900 text-sm mb-1">Restricted Access</h3>
          <p className="text-xs text-rose-700">This management dashboard is restricted to verified administrators.</p>
        </div>
      </div>
    );
  }

  const act = async (id, approve) => {
    setBusyId(id);
    try {
      await api(`/admin/verifications/${id}`, {
        method: "PATCH",
        auth: true,
        body: { approve, reviewer_comment: comments[id] || null },
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Review Queue</h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Admin Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review identity and skill proofs submitted by community members.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-800">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 animate-shimmer">
            <div className="w-36 h-5 bg-slate-200 rounded-lg"></div>
            <div className="w-full h-12 bg-slate-100 rounded-xl"></div>
            <div className="w-24 h-7 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl mb-3">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">All caught up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No verification requests are currently pending review in the queue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{v.user_name}</h4>
                  <span className="text-xs text-slate-500 font-medium">Type: {v.proof_type}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {v.status}
                </span>
              </div>

              {/* Submitted value */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-800 font-mono">
                {v.proof_value}
              </div>

              {v.note && (
                <p className="text-xs text-slate-500 italic">
                  Note from applicant: &ldquo;{v.note}&rdquo;
                </p>
              )}

              {/* Comment and actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <input
                  placeholder="Reviewer feedback or notes (optional)..."
                  value={comments[v.id] || ""}
                  onChange={(e) => setComments({ ...comments, [v.id]: e.target.value })}
                  className="w-full sm:flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    disabled={busyId === v.id}
                    onClick={() => act(v.id, true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    disabled={busyId === v.id}
                    onClick={() => act(v.id, false)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-60"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
