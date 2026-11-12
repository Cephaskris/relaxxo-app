import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly("sweep pending payments", { minuteUTC: 7 }, internal.payments.sweepPending, {});
crons.hourly("purge expired chats", { minuteUTC: 23 }, internal.messages.purgeExpiredChats, {});

export default crons;
