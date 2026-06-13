import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { SOCKET_EVENTS } from "@/lib/socket-events";

// Basic Razorpay Webhook verification
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "fallback_webhook_secret";

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);

    // Handle payment.captured event
    if (body.event === "payment.captured") {
      const paymentData = body.payload.payment.entity;
      
      // Look for custom metadata if added during order creation
      // e.g. paymentData.notes.orderId
      const orderId = paymentData.notes?.orderId;
      
      if (orderId) {
        // Update order status to PAID
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: "PAID" },
        });

        // Trigger websocket event via Redis pubsub or directly if IO is globally available
        // Note: Using the global io instance from server.ts for simplicity in this hackathon
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const io = (global as any).io;
        if (io) {
          // Notify table
          if (updatedOrder.tableId) {
            io.to(`table:${updatedOrder.tableId}`).emit(SOCKET_EVENTS.PAYMENT_RECEIVED, {
              orderId: updatedOrder.id,
              method: "UPI/QR",
            });
          }
          // Notify cashier
          io.to("cashier").emit(SOCKET_EVENTS.PAYMENT_RECEIVED, {
            orderId: updatedOrder.id,
            method: "UPI/QR",
          });
        } else if (redis) {
           // Fallback to redis pubsub if IO isn't global
           await redis.publish(
             "socket_events",
             JSON.stringify({
               event: SOCKET_EVENTS.PAYMENT_RECEIVED,
               room: ["cashier", updatedOrder.tableId ? `table:${updatedOrder.tableId}` : null].filter(Boolean),
               payload: { orderId: updatedOrder.id, method: "UPI/QR" }
             })
           );
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
