import { Worker } from "bullmq";
import Redis from "ioredis";
import { sendReceiptEmail } from "../email";
import type { EmailJobPayload } from "./email-queue";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export function startEmailWorker() {
  const worker = new Worker<EmailJobPayload, any, string>(
    "email-receipts",
    async (job) => {
      console.log(`[EmailWorker] Processing job ${job.id} for order ${job.data.orderNumber}`);
      
      try {
        await sendReceiptEmail({
            ...job.data,
            paidAt: new Date(job.data.paidAt) // Deserialize from JSON string
        });
      } catch (err) {
        console.error(`[EmailWorker] Job ${job.id} execution failed:`, err);
        throw err;
      }
    },
    { connection: connection as any }
  );

  worker.on("completed", (job) => {
    console.log(`[EmailWorker] Job ${job.id} has completed successfully!`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} has failed with error: ${err.message}`);
  });

  return worker;
}
