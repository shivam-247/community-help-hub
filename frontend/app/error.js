"use client";
import RecoveryPanel from "../components/RecoveryPanel";
export default function Error({ error, reset }) {
  return <RecoveryPanel onRetry={reset} reference={error?.digest} />;
}
