"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import Avatar from "../../components/Avatars";
import { useToast } from "../../components/ToastProvider";
import {
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  TrashIcon,
  MapPinIcon,
} from "../../components/Icons";

export default function AdminDashboardPage() {
  const auth = useAuth();
  const notify = useToast();
  const [reports, setReports] = useState([]);
  const [reportBusyId, setReportBusyId] = useState(null);
  const user = auth?.user;
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const [activeTab, setActiveTab] = useState("verifications"); // "verifications" | "posts" | "users"
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Verifications state
  const [verifications, setVerifications] = useState([]);
  const [verBusyId, setVerBusyId] = useState(null);
  const [verComments, setVerComments] = useState({});

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postBusyId, setPostBusyId] = useState(null);

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [userRoleBusyId, setUserRoleBusyId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load stats
      const s = await api("/admin/stats", { auth: true });
      setStats(s);

      // Load verifications
      const v = await api("/admin/verifications", { auth: true });
      setVerifications(v);

      // Load posts
      const p = await api("/admin/posts", { auth: true });
      setPosts(p);

      // Load users
      const u = await api("/admin/users", { auth: true });
      setUsersList(u);
      setReports(await api("/admin/reports", { auth: true }));
    } catch (e) {
      setError(e.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin, loadData]);

  if (auth?.loading) return null;

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-slate-500 text-sm">Please log in as an administrator.</p>
        <Link href="/login" className="inline-block mt-3 text-xs font-semibold text-indigo-600">
          Go to Login &rarr;
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
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

  // Act on verification
  const handleReport = async (reportId, status) => {
    setReportBusyId(reportId);
    try {
      await api(`/admin/reports/${reportId}`, { method: "PATCH", auth: true, body: { status } });
      await loadData();
      notify(`Report marked ${status.toLowerCase()}.`);
    } catch (e) { notify(e.message, "error"); }
    finally { setReportBusyId(null); }
  };

  const handleVerification = async (id, approve) => {
    setVerBusyId(id);
    try {
      await api(`/admin/verifications/${id}`, {
        method: "PATCH",
        auth: true,
        body: { approve, reviewer_comment: verComments[id] || null },
      });
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setVerBusyId(null);
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post from the platform?")) return;
    setPostBusyId(postId);
    try {
      await api(`/admin/posts/${postId}`, { method: "DELETE", auth: true });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (stats) setStats({ ...stats, total_posts: stats.total_posts - 1 });
    } catch (e) {
      setError(e.message);
    } finally {
      setPostBusyId(null);
    }
  };

  // Update user role
  const handleRoleChange = async (targetUserId, newRole) => {
    if (!isSuperAdmin) {
      alert("Only Super Admin can change user roles.");
      return;
    }
    setUserRoleBusyId(targetUserId);
    try {
      await api(`/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        auth: true,
        body: { role: newRole },
      });
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setUserRoleBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isSuperAdmin ? "Super Admin Command Center" : "Admin Portal"}
            </h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              isSuperAdmin
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
                : "bg-indigo-50 text-indigo-700 border border-indigo-100"
            }`}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Platform governance: manage identity verifications, moderate notices, and assign roles.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          {loading ? "Refreshing..." : "↻ Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-800">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Community Members</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.total_users}</span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Published Notices</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.total_posts}</span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pending Verifications</span>
            <span className={`text-2xl font-bold mt-1 block ${stats.pending_verifications > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {stats.pending_verifications}
            </span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Open Reports</span>
            <span className={`text-2xl font-bold mt-1 block ${stats.open_reports > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {stats.open_reports}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <button onClick={() => setActiveTab("reports")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "reports" ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`}>Reports ({reports.filter((report) => report.status === "Open").length} open)</button>
      {activeTab === "reports" && <div className="space-y-3">
        {!reports.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-500">No reported posts. Your community queue is clear.</p>}
        {reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex justify-between gap-3"><Link href={`/post/${report.post_id}`} className="font-bold text-indigo-600">{report.post_title}</Link><span className="text-sm text-slate-500">{report.status}</span></div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.reason}</p>
          <p className="text-xs text-slate-500">Reported by {report.reporter_name} · {new Date(report.created_at).toLocaleDateString()}</p>
          <div className="flex gap-2">{["Reviewed", "Actioned"].map((status) => <button key={status} disabled={reportBusyId === report.id || report.status === status} onClick={() => handleReport(report.id, status)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Mark {status.toLowerCase()}</button>)}</div>
        </article>)}
      </div>}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab("verifications")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "verifications"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Identity Verifications</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "verifications" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {verifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "posts"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Content Moderation</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "posts" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {posts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "users"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>User &amp; Role Management</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "users" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {usersList.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Verification Queue */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl mb-3">
                ✓
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Queue is clear</h3>
              <p className="text-xs text-slate-500">All identity and skill verification requests have been processed.</p>
            </div>
          ) : (
            verifications.map((v) => (
              <div
                key={v.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/profile/${v.user_id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm"
                      >
                        {v.user_name}
                      </Link>
                      <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                        {v.proof_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 inline-block">
                      {v.proof_value}
                    </p>
                    {v.note && (
                      <p className="text-xs text-slate-600 mt-2 italic bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        Note: &ldquo;{v.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    value={verComments[v.id] || ""}
                    onChange={(e) => setVerComments({ ...verComments, [v.id]: e.target.value })}
                    placeholder="Optional feedback note to applicant..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVerification(v.id, true)}
                      disabled={verBusyId === v.id}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleVerification(v.id, false)}
                      disabled={verBusyId === v.id}
                      className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Content Moderation */}
      {activeTab === "posts" && (
        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    p.status === "Open"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : p.status === "In Progress"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {p.status}
                  </span>
                  <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {p.category}
                  </span>
                  {p.spam_flag && (
                    <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <AlertTriangleIcon className="w-3 h-3 text-rose-600" />
                      Spam (Score {p.spam_score})
                    </span>
                  )}
                </div>

                <Link
                  href={`/post/${p.id}`}
                  className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm block truncate"
                >
                  {p.title}
                </Link>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>Author: <strong className="text-slate-700">{p.owner_name}</strong> ({p.owner_email})</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3 text-slate-400" />
                    {p.locality}
                  </span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/post/${p.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDeletePost(p.id)}
                  disabled={postBusyId === p.id}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: User Role Management */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Locality</th>
                  <th className="p-4">Credits &amp; Badge</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar id={u.avatar || "avatar-1"} name={u.name} size="w-8 h-8" />
                        <div>
                          <Link href={`/profile/${u.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                            {u.name}
                          </Link>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600">
                      {u.locality}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-900">{u.credits} pts</span>
                      <span className="text-slate-400 ml-1">· {u.badge}</span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        u.verification_status === "Verified"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : u.verification_status === "Pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {u.verification_status}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === "super_admin"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                          : u.role === "admin"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {u.role === "super_admin" ? "Super Admin" : u.role}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {isSuperAdmin ? (
                        <select
                          value={u.role}
                          disabled={userRoleBusyId === u.id || u.id === user.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-40"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Super Admin only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
