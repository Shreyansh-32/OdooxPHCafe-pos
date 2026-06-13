import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError, requireStaff, isNextResponse, getQuery } from "@/lib/api-helpers";
import { z } from "zod";

const createTableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required"),
  seats: z.number().int().positive("Seats must be a positive number"),
  floorId: z.string().min(1, "Floor is required"),
});

// GET /api/tables?floorId=
export async function GET(req: NextRequest) {
  try {
    const floorId = getQuery(req, "floorId");
    const tables = await prisma.table.findMany({
      where: { ...(floorId ? { floorId } : {}) },
      include: {
        floor: { select: { id: true, name: true } },
        orders: {
          where: { status: { in: ["DRAFT", "SENT"] } },
          select: { id: true, status: true, orderNumber: true },
        },
      },
      orderBy: [{ floor: { sortOrder: "asc" } }, { tableNumber: "asc" }],
    });
    return ok(tables);
  } catch (err) {
    return serverError("Failed to fetch tables", err);
  }
}

// POST /api/tables — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createTableSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const table = await prisma.table.create({
      data: parsed.data,
      include: { floor: { select: { id: true, name: true } } },
    });
    return created(table);
  } catch (err) {
    return serverError("Failed to create table", err);
  }
}
