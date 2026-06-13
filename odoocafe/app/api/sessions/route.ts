import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { z } from "zod";

const openSessionSchema = z.object({
  openingAmount: z.number().min(0).default(0),
});

// GET /api/sessions — admin sees all, cashier sees own
export async function GET() {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const sessions = await prisma.session.findMany({
      where: auth.role === "CASHIER" ? { userId: auth.id } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { openedAt: "desc" },
    });
    return ok(sessions);
  } catch (err) {
    return serverError("Failed to fetch sessions", err);
  }
}

// POST /api/sessions — open a new POS session
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = openSessionSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    // Cashier can only have one open session at a time
    const existingOpen = await prisma.session.findFirst({
      where: { userId: auth.id, closedAt: null },
    });
    if (existingOpen) {
      return conflict("You already have an open session. Close it before opening a new one.");
    }

    const { Prisma } = await import("@prisma/client");
    const session = await prisma.session.create({
      data: {
        userId: auth.id,
        openingAmount: new Prisma.Decimal(parsed.data.openingAmount),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return created(session);
  } catch (err) {
    return serverError("Failed to open session", err);
  }
}
