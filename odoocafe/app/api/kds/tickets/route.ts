import { requireStaff, ok, serverError, isNextResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/kds/tickets — active tickets for kitchen (orders with status SENT or DRAFT that have non-completed items)
export async function GET() {
  const auth = await requireStaff(["ADMIN", "KITCHEN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const tickets = await prisma.order.findMany({
      where: {
        status: { in: ["SENT", "DRAFT"] },
        items: {
          some: { kdsStatus: { not: "COMPLETED" }, product: { showInKds: true } },
        },
      },
      include: {
        table: { select: { id: true, tableNumber: true, floor: { select: { name: true } } } },
        items: {
          where: { product: { showInKds: true } },
          include: { product: { select: { id: true, name: true, category: { select: { id: true, name: true } } } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(tickets);
  } catch (err) {
    return serverError("Failed to fetch KDS tickets", err);
  }
}
