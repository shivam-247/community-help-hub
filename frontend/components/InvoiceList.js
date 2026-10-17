"use client";
import { usePagedResource } from "../lib/use-paged-resource";
import Pagination from "./Pagination";
import InvoiceReceipt from "./InvoiceReceipt";
import { Button } from "./ui";
export default function InvoiceList() {
  const list = usePagedResource("/billing/invoices");
  return (
    <div className="space-y-4">
      {list.loading ? (
        <p role="status">Loading invoices…</p>
      ) : list.error ? (
        <div role="alert">
          <p>{list.error}</p>
          <Button onClick={list.reload}>Retry invoices</Button>
        </div>
      ) : list.items.length ? (
        <ul className="divide-y divide-line">
          {list.items.map((i) => (
            <li
              key={i.id}
              className="py-3 flex flex-wrap justify-between gap-3 text-sm"
            >
              <span>
                Test invoice #{i.id} · {i.plan} · {i.cycle}
                <span className="block text-xs text-ink-muted">
                  {new Date(i.created_at).toLocaleDateString("en-IN")}
                </span>
              </span>
              <span>
                ₹{(i.amount_paise / 100).toLocaleString("en-IN")} · No charge
              </span>
              <InvoiceReceipt invoiceId={i.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          No invoices yet. Test plan changes will appear here.
        </p>
      )}
      <Pagination
        page={list.page}
        hasMore={list.hasMore}
        onPage={list.setPage}
        loading={list.loading}
        label="invoices"
      />
    </div>
  );
}
