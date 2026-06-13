import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOrderItemSchema } from "@/lib/validations/order";
import {
  ok, badRequest, notFound, serverError,
  requireStaff, isNextResponse,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string; itemId: string }> };

async function recalcOrderTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: { select: { taxRate: true } } },
  });

  let subtotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);

  for (const item of items) {
    subtotal = subtotal.add(item.lineTotal);
    taxTotal = taxTotal.add(item.lineTotal.mul(item.product.taxRate));
  }

  const grandTotal = subtotal.add(taxTotal);
  await prisma.order.update({ where: { id: orderId }, data: { subtotal, taxTotal, grandTotal } });
  return { subtotal, taxTotal, grandTotal };
}

// PATCH /api/orders/[id]/items/[itemId] — update quantity or notes
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id: orderId, itemId } = await params;
    const body = await req.json();
    const parsed = updateOrderItemSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return notFound("Order not found");
    if (order.status !== "DRAFT") return badRequest("Can only edit DRAFT orders");

    const item = await prisma.orderItem.findUnique({ where: { id: itemId, orderId } });
    if (!item) return notFound("Order item not found");

    // qty=0 means delete
    if (parsed.data.quantity === 0) {
      await prisma.orderItem.delete({ where: { id: itemId } });
      const totals = await recalcOrderTotals(orderId);
      return ok({ deleted: true, totals });
    }

    const newQty = parsed.data.quantity ?? item.quantity;
    const lineTotal = item.unitPrice.mul(newQty);

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: newQty,
        lineTotal,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
      include: { product: { select: { id: true, name: true } } },
    });

    const totals = await recalcOrderTotals(orderId);
    return ok({ item: updated, totals });
  } catch (err) {
    return serverError("Failed to update order item", err);
  }
}

// DELETE /api/orders/[id]/items/[itemId] — remove item
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id: orderId, itemId } = await params;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return notFound("Order not found");
    if (order.status !== "DRAFT") return badRequest("Can only remove items from DRAFT orders");

    const item = await prisma.orderItem.findUnique({ where: { id: itemId, orderId } });
    if (!item) return notFound("Order item not found");

    await prisma.orderItem.delete({ where: { id: itemId } });
    const totals = await recalcOrderTotals(orderId);

    return ok({ success: true, totals });
  } catch (err) {
    return serverError("Failed to remove order item", err);
  }
}
