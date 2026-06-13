import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { z } from "zod";

const createFloorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sortOrder: z.number().int().optional(),
});

// GET /api/floors
export async function GET() {
  try {
    const floors = await prisma.floor.findMany({
      include: {
        tables: { orderBy: { tableNumber: "asc" } },
        _count: { select: { tables: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return ok(floors);
  } catch (err) {
    return serverError("Failed to fetch floors", err);
  }
}

// POST /api/floors — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createFloorSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const floor = await prisma.floor.create({ data: parsed.data });
    return created(floor);
  } catch (err) {
    return serverError("Failed to create floor", err);
  }
}
