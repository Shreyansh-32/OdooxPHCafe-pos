import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/order";
import { SOCKET_EVENTS } from "@/lib/socket-events";

function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io;
}

// GET /api/orders — List orders
export async function GET(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");
  const history = searchParams.get("history") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Customers can only see their own orders
  if (customerSession && !staffSession) {
    const orders = await prisma.order.findMany({
      where: {
        customerId: customerSession.customerId,
        ...(history ? {} : { tableId: tableId || customerSession.tableId }),
        ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" } : {}),
      },
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
        payments: { include: { method: { select: { name: true, type: true } } } },
        table: { select: { tableNumber: true, floor: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, data: orders });
  }

  // Staff can see all orders
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" } : {}),
      ...(tableId ? { tableId } : {}),
    },
    include: {
      items: {
        include: { product: { select: { name: true, imageUrl: true, category: { select: { name: true } } } } },
      },
      payments: { include: { method: true } },
      table: { select: { tableNumber: true, floor: { select: { name: true } } } },
      customer: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ ok: true, data: orders });
}

// POST /api/orders — Create a new order
export async function POST(request: Request) {
  const staffSession = await getServerSession(authOptions);
  const customerSession = await getCustomerSession();

  if (!staffSession && !customerSession) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tableId, source, customerNote, sessionId } = parsed.data;

    const order = await prisma.order.create({
      data: {
        status: "DRAFT",
        source: staffSession ? "CASHIER" : "CUSTOMER",
        customerNote,
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        tableId: tableId || (customerSession?.tableId ?? null),
        userId: staffSession?.user.id || null,
        customerId: customerSession?.customerId || null,
        sessionId: sessionId || null,
      },
    });

    // Notify admin room that a new order was created
    const io = getIO();
    if (io) {
      io.to("admin").emit(SOCKET_EVENTS.ORDER_PLACED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        tableId: order.tableId,
      });
    }

    return NextResponse.json({ ok: true, data: order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
