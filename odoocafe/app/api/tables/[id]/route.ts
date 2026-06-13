import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateTableSchema = z.object({
  tableNumber: z.string().min(1).optional(),
  seats: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/tables/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        floor: { select: { id: true, name: true } },
        orders: {
          where: { status: { in: ["DRAFT", "SENT"] } },
          include: { items: { include: { product: { select: { id: true, name: true } } } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!table) return notFound("Table not found");
    return ok(table);
  } catch (err) {
    return serverError("Failed to fetch table", err);
  }
}

// PATCH /api/tables/[id] — admin or cashier
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTableSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const table = await prisma.table.update({
      where: { id },
      data: parsed.data,
      include: { floor: { select: { id: true, name: true } } },
    });
    return ok(table);
  } catch (err) {
    return serverError("Failed to update table", err);
  }
}

// DELETE /api/tables/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const activeOrders = await prisma.order.count({
      where: { tableId: id, status: { in: ["DRAFT", "SENT"] } },
    });
    if (activeOrders > 0) {
      return badRequest(`Cannot delete: table has ${activeOrders} active order(s)`);
    }
    await prisma.table.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to delete table", err);
  }
}
