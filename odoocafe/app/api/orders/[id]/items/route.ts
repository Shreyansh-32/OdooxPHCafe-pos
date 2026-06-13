import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { addOrderItemSchema } from "@/lib/validations/order";
import {
  ok, created, badRequest, notFound, serverError,
  requireStaff, isNextResponse,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/** Recalculate and persist order totals based on current items */
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

  await prisma.order.update({
    where: { id: orderId },
    data: { subtotal, taxTotal, grandTotal },
  });

  return { subtotal, taxTotal, grandTotal };
}

// GET /api/orders/[id]/items
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER", "KITCHEN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const items = await prisma.orderItem.findMany({
      where: { orderId: id },
      include: { product: { select: { id: true, name: true, uom: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok(items);
  } catch (err) {
    return serverError("Failed to fetch order items", err);
  }
}

// POST /api/orders/[id]/items — add item to order
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const parsed = addOrderItemSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return notFound("Order not found");
    if (order.status !== "DRAFT") {
      return badRequest(`Cannot add items to an order with status: ${order.status}`);
    }

    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
    if (!product) return notFound("Product not found");
    if (!product.isAvailable) return badRequest("Product is currently unavailable");
    if (product.isArchived) return badRequest("Product has been archived");

    const unitPrice = product.price;
    const lineTotal = unitPrice.mul(parsed.data.quantity);

    const item = await prisma.orderItem.create({
      data: {
        orderId,
        productId: product.id,
        quantity: parsed.data.quantity,
        unitPrice,
        lineTotal,
        notes: parsed.data.notes,
        // Skip KDS if showInKds=false
        kdsStatus: product.showInKds ? "PENDING" : "COMPLETED",
      },
      include: { product: { select: { id: true, name: true, uom: true } } },
    });

    const totals = await recalcOrderTotals(orderId);

    return created({ item, totals });
  } catch (err) {
    return serverError("Failed to add order item", err);
  }
}
