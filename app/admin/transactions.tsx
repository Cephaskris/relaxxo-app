import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Chip, Card, Loading } from "@/components/ui";
import { TableRow, SmallBtn } from "@/components/admin";
import { naira, prettyPhone } from "@/lib/util";

type Status = "pending" | "success" | "failed" | "abandoned" | undefined;

export default function AdminTransactions() {
  const [status, setStatus] = useState<Status>();
  const [days, setDays] = useState<number | undefined>();
  const rows = useQuery(api.admin.transactions, { status, days });

  function exportCsv() {
    if (!rows || typeof document === "undefined") return;
    const header = ["date", "reference", "phone", "name", "role", "credits", "amount_naira", "status", "gateway"];
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header.join(",")]
      .concat(rows.map((r) => [new Date(r.at).toISOString(), r.reference, r.phone, r.name, r.role, r.credits, r.amountNaira, r.status, r.gatewayResponse].map(esc).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `relaxxo-transactions-${Date.now()}.csv`;
    a.click();
  }

  return (
    <>
      <T v="display">Transactions</T>
      <Row style={{ flexWrap: "wrap", marginTop: 16, justifyContent: "space-between" }}>
        <Row style={{ flexWrap: "wrap" }}>
          {([undefined, "success", "failed", "abandoned", "pending"] as Status[]).map((s) => (
            <Chip key={s ?? "all"} label={s ?? "All statuses"} active={status === s} onPress={() => setStatus(s)} />
          ))}
        </Row>
        <SmallBtn tone="dark" label="Export CSV" onPress={exportCsv} />
      </Row>
      <Row style={{ flexWrap: "wrap", marginTop: 10 }}>
        {[
          { l: "All time", d: undefined },
          { l: "Today", d: 1 },
          { l: "Last 7 days", d: 7 },
          { l: "Last 30 days", d: 30 },
        ].map((p) => (
          <Chip key={p.l} label={p.l} active={days === p.d} onPress={() => setDays(p.d)} />
        ))}
      </Row>
      {!rows ? (
        <Loading />
      ) : (
        <Card style={{ marginTop: 16, padding: 0 }}>
          <TableRow header cells={["Date", "Reference", "User", "CC", "Amount", "Status", "Gateway"]} />
          {rows.map((r) => (
            <TableRow
              key={r._id}
              cells={[
                new Date(r.at).toLocaleString("en-NG"),
                r.reference,
                `${r.name || "—"} ${r.phone ? prettyPhone(r.phone) : ""}`,
                r.credits,
                naira(r.amountNaira),
                r.status,
                r.gatewayResponse || "—",
              ]}
            />
          ))}
        </Card>
      )}
    </>
  );
}
