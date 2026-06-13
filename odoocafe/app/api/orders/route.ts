import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/order";
import {
  ok, created, badRequest, serverError,
  requireStaff, isNextResponse, getQuery,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

// GET /api/orders?status=&tableId=&sessionId=
export async function GET(req: NextRequest) {
  const auth = await requireStaff(["ADMIN", "CASHIER", "KITCHEN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const status = getQuery(req, "status");
    const tableId = getQuery(req, "tableId");
    const sessionId = getQuery(req, "sessionId");

    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(tableId ? { tableId } : {}),
        ...(sessionId ? { sessionId } : {}),
        // Kitchen only sees SENT orders
        ...(auth.role === "KITCHEN" ? { status: "SENT" } : {}),
      },
      include: {
        table: { select: { id: true, tableNumber: true, floor: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, uom: true } } },
          orderBy: { createdAt: "asc" },
        },
        payments: { include: { method: { select: { id: true, name: true, type: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(orders);
  } catch (err) {
    return serverError("Failed to fetch orders", err);
  }
}

// POST /api/orders — create new order (requires open session for cashier)
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { tableId, customerId, customerNote, source } = parsed.data;

    // Find open session for this cashier
    const openSession = await prisma.session.findFirst({
      where: { userId: auth.id, closedAt: null },
    });
    if (!openSession) {
      return badRequest("No open session. Please open a POS session before creating orders.");
    }

    // Create order with zero totals (items added separately)
    const order = await prisma.order.create({
      data: {
        sessionId: openSession.id,
        userId: auth.id,
        source,
        tableId: tableId ?? null,
        customerId: customerId ?? null,
        customerNote: customerNote ?? null,
        subtotal: new Prisma.Decimal(0),
        taxTotal: new Prisma.Decimal(0),
        discountTotal: new Prisma.Decimal(0),
        grandTotal: new Prisma.Decimal(0),
      },
      include: {
        table: { select: { id: true, tableNumber: true } },
        user: { select: { id: true, name: true } },
        items: true,
      },
    });

    return created(order);
  } catch (err) {
    return serverError("Failed to create order", err);
  }
}
