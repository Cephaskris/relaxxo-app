import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { T, Loading } from "@/components/ui";
import { Stat, Grid, Section, TableRow } from "@/components/admin";
import { naira } from "@/lib/util";

export default function AdminOverview() {
  const o = useQuery(api.admin.overview);
  if (!o) return <Loading />;
  return (
    <>
      <T v="display">Overview</T>
      <Section title="Revenue">
        <Grid>
          <Stat tone="lime" label="Today" value={naira(o.revenue.today)} />
          <Stat label="Last 7 days" value={naira(o.revenue.week)} />
          <Stat label="Last 30 days" value={naira(o.revenue.month)} />
          <Stat tone="dark" label="All time" value={naira(o.revenue.all)} />
        </Grid>
      </Section>
      <Section title="Connection Credits (CC) & payments">
        <Grid>
          <Stat label="CC sold" value={o.creditsSold} />
          <Stat label="CC spent" value={o.creditsSpent} />
          <Stat label="CC held by users" value={o.creditsHeld} />
          <Stat label="Failed payments (7 days)" value={o.failedPayments} />
        </Grid>
      </Section>
      <Section title="Users & live activity">
        <Grid>
          <Stat tone="lime" label="Active users" value={o.activeUsers} />
          <Stat label="Online therapists now" value={o.onlineTherapists} />
          <Stat label="Online hotels now" value={o.onlineHotels} />
          <Stat label="Clients" value={o.users.client} />
          <Stat label="Therapists" value={o.users.therapist} />
          <Stat label="Hotels" value={o.users.hotel} />
        </Grid>
      </Section>
      <Section title="Needs attention">
        <Grid>
          <Stat tone={o.queues.verification ? "lime" : undefined} label="Verifications" value={o.queues.verification} />
          <Stat label="Services to review" value={o.queues.services} />
          <Stat label="Rooms to review" value={o.queues.rooms} />
          <Stat tone={o.queues.reports ? "dark" : undefined} label="Open reports" value={o.queues.reports} />
        </Grid>
      </Section>
      <Section title="Cities">
        <TableRow header cells={["City", "Open to clients", "Approved therapists", "Online therapists", "Approved hotels", "Online hotels"]} />
        {o.cities.map((c) => (
          <TableRow key={c.name} cells={[c.name, c.open ? "Yes" : "Not yet", c.approvedTherapists, c.onlineNow, c.approvedHotels, c.onlineHotelsNow]} />
        ))}
        <T v="small">Open a city in Pricing & settings once it has around 20 approved therapists.</T>
      </Section>
    </>
  );
}
