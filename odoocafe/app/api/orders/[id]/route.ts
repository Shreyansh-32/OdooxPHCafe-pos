import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOrderSchema } from "@/lib/validations/order";
import {
  ok, badRequest, notFound, serverError,
  requireStaff, isNextResponse, forbidden,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT:     ["SENT", "PAID", "CANCELLED"],
  SENT:      ["PAID", "CANCELLED"],
  PAID:      [],
  CANCELLED: [],
};

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER", "KITCHEN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { id: true, tableNumber: true, floor: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true } },
        session: { select: { id: true, openedAt: true } },
        items: {
          include: { product: { select: { id: true, name: true, uom: true, showInKds: true } } },
          orderBy: { createdAt: "asc" },
        },
        payments: { include: { method: { select: { id: true, name: true, type: true } } } },
      },
    });
    if (!order) return notFound("Order not found");
    return ok(order);
  } catch (err) {
    return serverError("Failed to fetch order", err);
  }
}

// PATCH /api/orders/[id] — update status or note
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return notFound("Order not found");

    // Validate state transition
    if (parsed.data.status) {
      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return badRequest(
          `Cannot transition from ${order.status} to ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}`
        );
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.customerNote !== undefined ? { customerNote: parsed.data.customerNote } : {}),
        ...(parsed.data.promotionId !== undefined ? { promotionId: parsed.data.promotionId } : {}),
      },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
    });

    return ok(updated);
  } catch (err) {
    return serverError("Failed to update order", err);
  }
}

// DELETE /api/orders/[id] — cancel order (admin or cashier)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return notFound("Order not found");

    if (order.status === "PAID") {
      return forbidden("Cannot cancel a paid order");
    }
    if (order.status === "CANCELLED") {
      return badRequest("Order is already cancelled");
    }

    const cancelled = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return ok(cancelled);
  } catch (err) {
    return serverError("Failed to cancel order", err);
  }
}
