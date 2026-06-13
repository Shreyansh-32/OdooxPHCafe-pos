import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateFloorSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/floors/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const floor = await prisma.floor.findUnique({
      where: { id },
      include: { tables: { orderBy: { tableNumber: "asc" } } },
    });
    if (!floor) return notFound("Floor not found");
    return ok(floor);
  } catch (err) {
    return serverError("Failed to fetch floor", err);
  }
}

// PATCH /api/floors/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateFloorSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const floor = await prisma.floor.update({ where: { id }, data: parsed.data });
    return ok(floor);
  } catch (err) {
    return serverError("Failed to update floor", err);
  }
}

// DELETE /api/floors/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const activeOrders = await prisma.order.count({
      where: { table: { floorId: id }, status: { in: ["DRAFT", "SENT"] } },
    });
    if (activeOrders > 0) {
      return badRequest(`Cannot delete: floor has ${activeOrders} active order(s)`);
    }
    await prisma.floor.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to delete floor", err);
  }
}
