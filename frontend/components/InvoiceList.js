"use client";
import { Text as UIMessage } from "../lib/i18n";

import { usePagedResource } from "../lib/use-paged-resource";
import Pagination from "./Pagination";
import dynamic from "next/dynamic";
const InvoiceReceipt = dynamic(() => import("./InvoiceReceipt"), {
  loading: () => <span role="status"><UIMessage>Loading invoice controls…</UIMessage></span>,
});
import { Button } from "./ui";
export default function InvoiceList() {
  const list = usePagedResource("/billing/invoices");
  return (
    <div className="space-y-4">
      {list.loading ? (
        <p role="status"><UIMessage>Loading invoices…</UIMessage></p>
      ) : list.error ? (
        <div role="alert">
          <p>{list.error}</p>
          <Button onClick={list.reload}><UIMessage>Retry invoices</UIMessage></Button>
        </div>
      ) : list.items.length ? (
        <ul className="divide-y divide-line">
          {list.items.map((i) => (
            <li
              key={i.id}
              className="py-3 flex flex-wrap justify-between gap-3 text-sm"
            >
              <span><UIMessage>
                Test invoice #</UIMessage>{i.id} · {i.plan} · {i.cycle}
                <span className="block text-xs text-ink-muted">
                  {new Date(i.created_at).toLocaleDateString("en-IN")}
                </span>
              </span>
              <span>
                ₹{(i.amount_paise / 100).toLocaleString("en-IN")}<UIMessage> · No charge
              </UIMessage></span>
              <InvoiceReceipt invoiceId={i.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted"><UIMessage>
          No invoices yet. Test plan changes will appear here.
        </UIMessage></p>
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
