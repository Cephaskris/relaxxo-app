import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Row, Chip, Card, Loading, ErrorNote } from "@/components/ui";
import { TableRow, SmallBtn, ask } from "@/components/admin";
import { errorMessage, prettyPhone, ago } from "@/lib/util";

export default function AdminRefunds() {
  const rows = useQuery(api.admin.refunds);
  const manualRefund = useMutation(api.admin.manualRefund);
  const [filter, setFilter] = useState<"all" | "refunded" | "active">("all");
  const [error, setError] = useState<string | null>(null);

  if (!rows) return <Loading />;
  const filtered = rows.filter((r) =>
    filter === "all" ? true : filter === "refunded" ? r.refunded : !r.refunded,
  );

  return (
    <>
      <T v="display">Refunds</T>
      <T v="label" style={{ marginTop: 4 }}>
        Issue a manual Connection Credit (CC) refund for any client unlock below.
      </T>
      <Row style={{ flexWrap: "wrap", marginTop: 16 }}>
        <Chip label="All unlocks" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label="Refunded" active={filter === "refunded"} onPress={() => setFilter("refunded")} />
        <Chip label="Not refunded" active={filter === "active"} onPress={() => setFilter("active")} />
      </Row>
      <ErrorNote text={error} />
      <Card style={{ marginTop: 16, padding: 0 }}>
        <TableRow header cells={["When", "Client", "Therapist", "CC", "Status", "Action"]} />
        {filtered.map((r) => (
          <TableRow
            key={r._id}
            cells={[
              `${ago(r.at)} ago`,
              `${r.clientName} ${r.clientPhone ? prettyPhone(r.clientPhone) : ""}`,
              r.therapistName,
              r.cost,
              r.refunded ? "Refunded" : r.replied ? "Replied" : "Awaiting reply",
              r.refunded ? (
                "—"
              ) : (
                <SmallBtn
                  tone="lime"
                  label="Manual refund"
                  onPress={() => {
                    const reason = ask("Reason for manual refund:");
                    if (reason) {
                      manualRefund({ unlockId: r._id, reason }).catch((e) => setError(errorMessage(e)));
                    }
                  }}
                />
              ),
            ]}
          />
        ))}
      </Card>
    </>
  );
}

