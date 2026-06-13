import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordPaymentSchema } from "@/lib/validations/payment";
import {
  ok, badRequest, notFound, serverError,
  requireStaff, isNextResponse,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// POST /api/orders/[id]/pay — record a payment (supports split payments)
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        customer: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) return notFound("Order not found");
    if (order.status === "PAID") return badRequest("Order is already paid");
    if (order.status === "CANCELLED") return badRequest("Cannot pay a cancelled order");

    // Verify payment method
    const method = await prisma.paymentMethod.findUnique({ where: { id: parsed.data.methodId } });
    if (!method) return notFound("Payment method not found");
    if (!method.isEnabled) return badRequest("Payment method is not enabled");

    const newAmount = new Prisma.Decimal(parsed.data.amount);

    // Sum existing payments
    const existingTotal = order.payments.reduce(
      (sum, p) => sum.add(p.amount),
      new Prisma.Decimal(0)
    );

    const newTotal = existingTotal.add(newAmount);

    if (newTotal.greaterThan(order.grandTotal)) {
      return badRequest(
        `Payment of ₹${parsed.data.amount} would exceed order total of ₹${order.grandTotal}. Remaining: ₹${order.grandTotal.sub(existingTotal)}`
      );
    }

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        orderId,
        methodId: parsed.data.methodId,
        amount: newAmount,
        transactionRef: parsed.data.transactionRef ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { method: { select: { id: true, name: true, type: true } } },
    });

    // Check if fully paid
    let updatedOrder = order;
    if (newTotal.equals(order.grandTotal)) {
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
        include: { customer: true, items: true, payments: true },
      }) as typeof order;
    }

    return ok({
      payment,
      orderStatus: newTotal.equals(order.grandTotal) ? "PAID" : order.status,
      amountPaid: newTotal.toFixed(2),
      amountRemaining: order.grandTotal.sub(newTotal).toFixed(2),
    });
  } catch (err) {
    return serverError("Failed to record payment", err);
  }
}
