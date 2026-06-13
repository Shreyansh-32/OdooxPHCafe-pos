import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError, requireStaff, isNextResponse, getQuery } from "@/lib/api-helpers";

// GET /api/reports?type=revenue|products|payments|tables&from=&to=
export async function GET(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const type = getQuery(req, "type") ?? "revenue";
    const fromStr = getQuery(req, "from");
    const toStr = getQuery(req, "to");

    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date();

    if (type === "revenue") {
      const orders = await prisma.order.findMany({
        where: { status: "PAID", createdAt: { gte: from, lte: to } },
        select: { grandTotal: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      // Group by day
      const byDay: Record<string, number> = {};
      for (const o of orders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + Number(o.grandTotal);
      }

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);

      return ok({ type, totalRevenue: totalRevenue.toFixed(2), byDay });
    }

    if (type === "products") {
      const items = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { status: "PAID", createdAt: { gte: from, lte: to } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 20,
      });

      const productIds = items.map((i) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

      return ok({
        type,
        topProducts: items.map((i) => ({
          productId: i.productId,
          name: productMap[i.productId] ?? "Unknown",
          unitsSold: i._sum.quantity ?? 0,
          revenue: Number(i._sum.lineTotal ?? 0).toFixed(2),
        })),
      });
    }

    if (type === "payments") {
      const payments = await prisma.payment.groupBy({
        by: ["methodId"],
        where: { order: { status: "PAID", createdAt: { gte: from, lte: to } } },
        _sum: { amount: true },
        _count: true,
      });

      const methodIds = payments.map((p) => p.methodId);
      const methods = await prisma.paymentMethod.findMany({
        where: { id: { in: methodIds } },
        select: { id: true, name: true, type: true },
      });
      const methodMap = Object.fromEntries(methods.map((m) => [m.id, m]));

      return ok({
        type,
        breakdown: payments.map((p) => ({
          methodId: p.methodId,
          name: methodMap[p.methodId]?.name ?? "Unknown",
          type: methodMap[p.methodId]?.type,
          totalAmount: Number(p._sum.amount ?? 0).toFixed(2),
          transactionCount: p._count,
        })),
      });
    }

    if (type === "tables") {
      const tableOrders = await prisma.order.groupBy({
        by: ["tableId"],
        where: { status: "PAID", createdAt: { gte: from, lte: to }, tableId: { not: null } },
        _sum: { grandTotal: true },
        _count: true,
        orderBy: { _sum: { grandTotal: "desc" } },
      });

      const tableIds = tableOrders.map((t) => t.tableId).filter(Boolean) as string[];
      const tables = await prisma.table.findMany({
        where: { id: { in: tableIds } },
        select: { id: true, tableNumber: true, floor: { select: { name: true } } },
      });
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

      return ok({
        type,
        tables: tableOrders.map((t) => ({
          tableId: t.tableId,
          tableNumber: tableMap[t.tableId!]?.tableNumber ?? "Unknown",
          floor: tableMap[t.tableId!]?.floor.name ?? "Unknown",
          totalRevenue: Number(t._sum.grandTotal ?? 0).toFixed(2),
          orderCount: t._count,
        })),
      });
    }

    return badRequest(`Unknown report type: ${type}. Use: revenue, products, payments, tables`);
  } catch (err) {
    return serverError("Failed to generate report", err);
  }
}
