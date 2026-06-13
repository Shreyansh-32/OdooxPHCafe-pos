import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

// GET /api/reports — Analytics data for admin dashboard
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";

  const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
  const startDate = startOfDay(subDays(new Date(), days - 1));
  const endDate = endOfDay(new Date());

  const [
    totalOrdersToday,
    totalRevenueToday,
    activeTablesCount,
    paidOrders,
    topProducts,
    revenueByDay,
    paymentMethodBreakdown,
  ] = await Promise.all([
    // Today's order count
    prisma.order.count({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),

    // Today's revenue
    prisma.order.aggregate({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
      _sum: { grandTotal: true },
    }),

    // Active tables (tables with DRAFT or SENT orders)
    prisma.table.count({
      where: {
        orders: { some: { status: { in: ["DRAFT", "SENT"] } } },
      },
    }),

    // All paid orders in period
    prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        payments: { include: { method: { select: { type: true, name: true } } } },
        items: { include: { product: { select: { name: true } } } },
      },
    }),

    // Top selling products
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          status: "PAID",
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),

    // Revenue by day (last N days)
    prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { grandTotal: true, createdAt: true },
    }),

    // Payment method breakdown
    prisma.payment.groupBy({
      by: ["methodId"],
      where: {
        order: {
          status: "PAID",
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Process top products (get names)
  const productIds = topProducts.map((p) => p.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const topProductsWithNames = topProducts.map((p) => ({
    productId: p.productId,
    name: productNames.find((n) => n.id === p.productId)?.name || "Unknown",
    totalQty: p._sum.quantity || 0,
    totalRevenue: Number(p._sum.lineTotal || 0),
  }));

  // Process revenue by day
  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    dayMap[date] = 0;
  }

  revenueByDay.forEach((o) => {
    const day = format(o.createdAt, "yyyy-MM-dd");
    dayMap[day] = (dayMap[day] || 0) + Number(o.grandTotal);
  });

  const revenueChart = Object.entries(dayMap).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // Process payment methods
  const methodIds = paymentMethodBreakdown.map((p) => p.methodId);
  const methods = await prisma.paymentMethod.findMany({
    where: { id: { in: methodIds } },
    select: { id: true, name: true, type: true },
  });

  const paymentBreakdown = paymentMethodBreakdown.map((p) => ({
    method: methods.find((m) => m.id === p.methodId)?.name || "Unknown",
    type: methods.find((m) => m.id === p.methodId)?.type || "CASH",
    total: Number(p._sum.amount || 0),
    count: p._count,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      kpis: {
        ordersToday: totalOrdersToday,
        revenueToday: Number(totalRevenueToday._sum.grandTotal || 0),
        activeTables: activeTablesCount,
        totalOrdersPeriod: paidOrders.length,
        totalRevenuePeriod: paidOrders.reduce(
          (sum, o) => sum + Number(o.grandTotal),
          0
        ),
      },
      revenueChart,
      topProducts: topProductsWithNames,
      paymentBreakdown,
    },
  });
}
