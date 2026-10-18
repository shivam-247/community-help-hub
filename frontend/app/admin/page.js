"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Pagination from "../../components/Pagination";
import RecoveryPanel from "../../components/RecoveryPanel";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import TrustReview from "../../components/TrustReview";
import { Button } from "../../components/ui";
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
  const [pages, setPages] = useState({
      verifications: 1,
      posts: 1,
      spam: 1,
      users: 1,
      reports: 1,
    }),
    [pageMeta, setPageMeta] = useState({});
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
      const keys = ["verifications", "posts", "users", "reports"];
      const [stats, ...responses] = await Promise.all([
        api("/admin/stats", { auth: true }),
        ...keys.map((key) =>
          api(
            `/admin/${key}?page=${pages[key === "posts" && activeTab === "spam" ? "spam" : key]}&page_size=20${key === "posts" && activeTab === "spam" ? "&spam_only=true" : ""}`,
            { auth: true, pagination: true },
          ),
        ),
      ]);
      setStats(stats);
      setVerifications(responses[0].items);
      setPosts(responses[1].items);
      setUsersList(responses[2].items);
      setReports(responses[3].items);
      setPageMeta(
        Object.fromEntries(keys.map((key, i) => [key, responses[i].has_more])),
      );
    } catch (e) {
      setError(e.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [pages, activeTab]);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin, loadData]);

  if (auth?.loading) return <p role="status">Loading administration…</p>;
  if (loading)
    return (
      <div role="status" className="p-8">
        <h1 className="text-2xl font-semibold">Loading moderation queue…</h1>
      </div>
    );
  if (error && !loading)
    return <RecoveryPanel message={error} onRetry={loadData} />;

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-ink-muted text-sm">
          Please log in as an administrator.
        </p>
        <Link
          href="/login"
          className="inline-block mt-3 text-xs font-semibold text-brand"
        >
          Go to Login &rarr;
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-danger-soft border border-danger-soft rounded-xl p-6">
          <AlertTriangleIcon className="w-8 h-8 text-danger mx-auto mb-2" />
          <h3 className="font-bold text-danger text-sm mb-1">
            Restricted Access
          </h3>
          <p className="text-xs text-danger">
            This management dashboard is restricted to verified administrators.
          </p>
        </div>
      </div>
    );
  }

  // Act on verification
  const handleReport = async (reportId, status) => {
    setReportBusyId(reportId);
    try {
      await api(`/admin/reports/${reportId}`, {
        method: "PATCH",
        auth: true,
        body: { status },
      });
      await loadData();
      notify(`Report marked ${status.toLowerCase()}.`);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setReportBusyId(null);
    }
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
    if (
      !confirm("Are you sure you want to delete this post from the platform?")
    )
      return;
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
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)),
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
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {isSuperAdmin ? "Super Admin Command Center" : "Admin Portal"}
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isSuperAdmin
                  ? "bg-brand-solid text-on-brand shadow-xs"
                  : "bg-brand-soft text-brand border border-line"
              }`}
            >
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted">
            Platform governance: manage identity verifications, moderate
            notices, and assign roles.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="text-xs font-semibold text-ink-soft hover:text-ink bg-surface border border-line px-3.5 py-2 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          {loading ? "Refreshing..." : "↻ Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger-soft rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-danger">
          <AlertTriangleIcon className="w-4 h-4 text-danger shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
          <div className="bg-surface border border-line/90 rounded-xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Community Members
            </span>
            <span className="text-2xl font-bold text-ink mt-1 block">
              {stats.total_users}
            </span>
          </div>
          <div className="bg-surface border border-line/90 rounded-xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Published Notices
            </span>
            <span className="text-2xl font-bold text-ink mt-1 block">
              {stats.total_posts}
            </span>
          </div>
          <div className="bg-surface border border-line/90 rounded-xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Pending Verifications
            </span>
            <span
              className={`text-2xl font-bold mt-1 block ${stats.pending_verifications > 0 ? "text-warning" : "text-success"}`}
            >
              {stats.pending_verifications}
            </span>
          </div>
          <div className="bg-surface border border-line/90 rounded-xl p-4 shadow-xs text-center">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Open Reports
            </span>
            <span
              className={`text-2xl font-bold mt-1 block ${stats.open_reports > 0 ? "text-danger" : "text-ink"}`}
            >
              {stats.open_reports}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <Button
        variant={activeTab === "spam" ? "secondary" : "outline"}
        onClick={() => setActiveTab("spam")}
      >
        Spam queue ({posts.filter((p) => p.spam_flag).length})
      </Button>
      {activeTab === "spam" && (
        <p className="text-sm text-ink-muted">
          The filter supplies a score, not a detailed explanation. Review the
          full notice and context before approving or removing it.
        </p>
      )}
      {activeTab === "spam" && !posts.some((p) => p.spam_flag) && (
        <p className="text-sm text-ink-muted p-5 border border-line rounded-lg">
          No posts awaiting spam review.
        </p>
      )}

      <button
        onClick={() => setActiveTab("reports")}
        className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "reports" ? "bg-surface-strong text-on-brand" : "bg-surface border border-line"}`}
      >
        Reports ({reports.filter((report) => report.status === "Open").length}{" "}
        open)
      </button>
      {activeTab === "reports" && (
        <div className="space-y-3">
          {!reports.length && (
            <p className="rounded-xl border bg-surface p-8 text-center text-ink-muted">
              No reported posts. Your community queue is clear.
            </p>
          )}
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-line bg-surface p-5 space-y-3"
            >
              <div className="flex justify-between gap-3">
                <Link
                  href={`/post/${report.post_id}`}
                  className="font-bold text-brand"
                >
                  {report.post_title}
                </Link>
                <span className="text-sm text-ink-muted">{report.status}</span>
              </div>
              <p className="text-sm text-ink-soft whitespace-pre-wrap">
                {report.reason}
              </p>
              <p className="text-xs text-ink-muted">
                Reported by {report.reporter_name} ·{" "}
                {new Date(report.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                {["Reviewed", "Actioned"].map((status) => (
                  <button
                    key={status}
                    disabled={
                      reportBusyId === report.id || report.status === status
                    }
                    onClick={() => handleReport(report.id, status)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    Mark {status.toLowerCase()}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-b border-line/80 pb-3 select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab("verifications")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "verifications"
              ? "bg-surface-strong text-on-brand shadow-xs"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <span>Identity Verifications</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "verifications"
                ? "bg-surface-muted text-ink-muted"
                : "bg-surface-muted text-ink-soft"
            }`}
          >
            {verifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "posts"
              ? "bg-surface-strong text-on-brand shadow-xs"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <span>Content Moderation</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "posts"
                ? "bg-surface-muted text-ink-muted"
                : "bg-surface-muted text-ink-soft"
            }`}
          >
            {posts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "users"
              ? "bg-surface-strong text-on-brand shadow-xs"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <span>User &amp; Role Management</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "users"
                ? "bg-surface-muted text-ink-muted"
                : "bg-surface-muted text-ink-soft"
            }`}
          >
            {usersList.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Verification Queue */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <div className="bg-surface border border-line/90 rounded-xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-success-soft text-success flex items-center justify-center mx-auto text-xl mb-3">
                ✓
              </div>
              <h3 className="font-bold text-ink text-sm mb-1">
                Queue is clear
              </h3>
              <p className="text-xs text-ink-muted">
                All community reference requests on this page have been
                processed.
              </p>
            </div>
          ) : (
            verifications.map((v) => (
              <div
                key={v.id}
                className="bg-surface border border-line/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/profile/${v.user_id}`}
                        className="font-bold text-ink hover:text-brand transition-colors text-sm"
                      >
                        {v.user_name}
                      </Link>
                      <span className="text-[11px] font-semibold bg-brand-soft text-brand px-2 py-0.5 rounded-md border border-line">
                        {v.proof_type}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft font-mono bg-surface-muted px-2.5 py-1.5 rounded-lg border border-line inline-block">
                      {v.proof_value}
                    </p>
                    {v.note && (
                      <p className="text-xs text-ink-soft mt-2 italic bg-surface-muted/70 p-2.5 rounded-lg border border-line">
                        Note: &ldquo;{v.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-muted shrink-0">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    value={verComments[v.id] || ""}
                    onChange={(e) =>
                      setVerComments({ ...verComments, [v.id]: e.target.value })
                    }
                    aria-label={`Feedback for ${v.user_name}`}
                    placeholder="Optional feedback note to applicant..."
                    className="flex-1 px-3 py-1.5 text-xs bg-surface-muted border border-line rounded-xl focus:bg-surface focus-visible:outline-brand focus:ring-2 focus:ring-brand transition-all"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVerification(v.id, true)}
                      disabled={verBusyId === v.id}
                      className="inline-flex items-center gap-1 bg-brand-solid hover:brightness-110 text-on-brand text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleVerification(v.id, false)}
                      disabled={verBusyId === v.id}
                      className="inline-flex items-center gap-1 bg-danger-soft hover:bg-danger-soft text-danger border border-danger-soft text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
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
      {(activeTab === "posts" || activeTab === "spam") && (
        <div className="space-y-3">
          {(activeTab === "spam"
            ? posts.filter((p) => p.spam_flag)
            : posts
          ).map((p) => (
            <div
              key={p.id}
              className="bg-surface border border-line/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      p.status === "Open"
                        ? "bg-success-soft text-success border-success-soft"
                        : p.status === "In Progress"
                          ? "bg-warning-soft text-warning border-warning-soft"
                          : "bg-surface-muted text-ink-soft border-line"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-[10px] font-semibold bg-brand-soft text-brand px-2 py-0.5 rounded-full">
                    {p.category}
                  </span>
                  {p.spam_flag && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api(`/admin/posts/${p.id}/spam`, {
                            method: "PATCH",
                            auth: true,
                          });
                          notify("Post approved.");
                          await loadData();
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Approve post
                    </Button>
                  )}
                  {p.spam_flag && (
                    <span className="text-[10px] font-bold bg-danger-soft text-danger border border-danger-soft px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <AlertTriangleIcon className="w-3 h-3 text-danger" />
                      Flagged for review · score {p.spam_score}
                    </span>
                  )}
                </div>

                <Link
                  href={`/post/${p.id}`}
                  className="font-bold text-ink hover:text-brand transition-colors text-sm block truncate"
                >
                  {p.title}
                </Link>

                <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
                  <span>
                    Author:{" "}
                    <strong className="text-ink-soft">{p.owner_name}</strong> (
                    {p.owner_email})
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3 text-ink-muted" />
                    {p.locality}
                  </span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/post/${p.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-ink-soft bg-surface-muted hover:bg-surface-muted border border-line rounded-xl transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDeletePost(p.id)}
                  disabled={postBusyId === p.id}
                  className="px-3 py-1.5 text-xs font-semibold text-danger bg-danger-soft hover:bg-danger-soft border border-danger-soft rounded-xl transition-colors inline-flex items-center gap-1 disabled:opacity-50"
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
        <div className="bg-surface border border-line/90 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-line text-ink-muted font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Locality</th>
                  <th className="p-4">Credits &amp; Badge</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {usersList.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-muted/60 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          id={u.avatar || "avatar-1"}
                          name={u.name}
                          size="w-8 h-8"
                        />
                        <div>
                          <Link
                            href={`/profile/${u.id}`}
                            className="font-bold text-ink hover:text-brand transition-colors"
                          >
                            {u.name}
                          </Link>
                          <p className="text-[11px] text-ink-muted">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-ink-soft">{u.locality}</td>

                    <td className="p-4">
                      <span className="font-bold text-ink">
                        {u.credits} pts
                      </span>
                      <span className="text-ink-muted ml-1">· {u.badge}</span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.verification_status === "verified"
                            ? "bg-success-soft text-success border border-success-soft"
                            : u.verification_status === "pending"
                              ? "bg-warning-soft text-warning border border-warning-soft"
                              : "bg-surface-muted text-ink-soft"
                        }`}
                      >
                        {u.verification_status}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === "super_admin"
                            ? "bg-brand-solid text-on-brand"
                            : u.role === "admin"
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-muted text-ink-soft"
                        }`}
                      >
                        {u.role === "super_admin" ? "Super Admin" : u.role}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {u.id !== user.id && (
                        <TrustReview
                          userId={u.id}
                          onSaved={() => notify("Trust review saved.")}
                        />
                      )}
                      {isSuperAdmin ? (
                        <select
                          aria-label={`Role for ${u.name}`}
                          value={u.role}
                          disabled={userRoleBusyId === u.id || u.id === user.id}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value)
                          }
                          className="px-2 py-1 text-xs bg-surface-muted border border-line rounded-lg focus-visible:outline-brand focus:ring-1 focus:ring-brand transition-all disabled:opacity-40"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className="text-ink-muted text-[11px] italic">
                          Super Admin only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <Pagination
          page={pages[activeTab] || 1}
          hasMore={
            pageMeta[activeTab === "spam" ? "posts" : activeTab] || false
          }
          onPage={(n) => setPages((p) => ({ ...p, [activeTab]: n }))}
          label="admin records"
        />
      )}
    </div>
  );
}
