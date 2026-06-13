import { Queue } from "bullmq";
import Redis from "ioredis";
import type { SendReceiptOptions } from "../email";

export type EmailJobPayload = Omit<SendReceiptOptions, "paidAt"> & { paidAt: string };

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue<EmailJobPayload, any, string>("email-receipts", {
  connection: connection as any,
});
