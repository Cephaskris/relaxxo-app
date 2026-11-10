import React, { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { T, Row, Chip, Field, Loading, ErrorNote, Card } from "@/components/ui";
import { TableRow, SmallBtn, ask, Section } from "@/components/admin";
import { errorMessage, prettyPhone, ago } from "@/lib/util";
import { CITY_NAMES } from "@/lib/areas";

export default function AdminUsers() {
  const [role, setRole] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Id<"users"> | null>(null);
  const users = useQuery(api.admin.users, { role, city, search: search || undefined });
  const ledger = useQuery(api.admin.userLedger, selected ? { userId: selected } : "skip");
  const setStatus = useMutation(api.admin.setAccountStatus);
  const adjust = useMutation(api.admin.adjustWallet);
  const [error, setError] = useState<string | null>(null);
  const run = (p: Promise<unknown>) => p.catch((e) => setError(errorMessage(e)));

  return (
    <>
      <T v="display">Users & wallets</T>
      <Row style={{ flexWrap: "wrap", marginTop: 16 }}>
        {[undefined, "client", "therapist", "hotel", "admin"].map((r) => (
          <Chip key={r ?? "all"} label={r ?? "All roles"} active={role === r} onPress={() => setRole(r)} />
        ))}
      </Row>
      <Row style={{ flexWrap: "wrap", marginTop: 10 }}>
        <Chip label="All cities" active={city === undefined} onPress={() => setCity(undefined)} />
        {CITY_NAMES.map((c) => (
          <Chip key={c} label={c} active={city === c} onPress={() => setCity(city === c ? undefined : c)} />
        ))}
      </Row>
      <View style={{ marginTop: 12, maxWidth: 420 }}>
        <Field label="Search by phone or name" value={search} onChangeText={setSearch} />
      </View>
      <ErrorNote text={error} />
      {!users ? (
        <Loading />
      ) : (
        <Card style={{ marginTop: 16, padding: 0 }}>
          <TableRow header cells={["Name", "Phone", "Role", "City", "CC", "Status", "Joined", "Actions"]} />
          {users.map((u) => (
            <TableRow
              key={u._id}
              cells={[
                u.name || "—",
                u.phone ? prettyPhone(u.phone) : "—",
                u.role ?? "—",
                u.city ?? "—",
                u.credits,
                u.accountStatus,
                `${ago(u.joined)} ago`,
                <Row key="a" style={{ flexWrap: "wrap" }} gap={6}>
                  <SmallBtn label="Ledger" onPress={() => setSelected(u._id)} />
                  <SmallBtn
                    label="CC ±"
                    onPress={() => {
                      const amount = ask("Connection Credits (CC) to add (use - to remove), e.g. 2 or -2:");
                      if (!amount) return;
                      const note = ask("Reason (kept in the audit log):");
                      if (note) run(adjust({ userId: u._id, delta: parseInt(amount, 10), note }));
                    }}
                  />
                  {u.role !== "admin" ? (
                    <>
                      {u.accountStatus === "active" ? (
                        <SmallBtn
                          tone="danger"
                          label="Suspend"
                          onPress={() => {
                            const reason = ask("Reason for suspending:");
                            if (reason) run(setStatus({ userId: u._id, status: "suspended", reason }));
                          }}
                        />
                      ) : (
                        <SmallBtn tone="lime" label="Reactivate" onPress={() => run(setStatus({ userId: u._id, status: "active", reason: "Reactivated by admin" }))} />
                      )}
                      {u.accountStatus !== "banned" ? (
                        <SmallBtn
                          tone="danger"
                          label="Ban"
                          onPress={() => {
                            const reason = ask("Reason for banning:");
                            if (reason) run(setStatus({ userId: u._id, status: "banned", reason }));
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}
                </Row>,
              ]}
            />
          ))}
        </Card>
      )}

      {selected && ledger ? (
        <Section title="Connection Credits (CC) ledger" right={<SmallBtn label="Close" onPress={() => setSelected(null)} />}>
          <Card style={{ padding: 0 }}>
            <TableRow header cells={["When", "Change", "Reason", "Note", "Balance after"]} />
            {ledger.map((l) => (
              <TableRow key={l._id} cells={[`${ago(l._creationTime)} ago`, l.delta > 0 ? `+${l.delta}` : l.delta, l.reason, l.note ?? "", l.balanceAfter]} />
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}
