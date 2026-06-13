import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const closeSessionSchema = z.object({
  closingAmount: z.number().min(0, "Closing amount must be non-negative"),
});

// GET /api/sessions/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orders: {
          include: {
            payments: { include: { method: { select: { id: true, name: true, type: true } } } },
          },
        },
        _count: { select: { orders: true } },
      },
    });
    if (!session) return notFound("Session not found");
    return ok(session);
  } catch (err) {
    return serverError("Failed to fetch session", err);
  }
}

// PATCH /api/sessions/[id] — close session
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = closeSessionSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) return notFound("Session not found");
    if (existing.closedAt) return badRequest("Session is already closed");

    const session = await prisma.session.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closingAmount: new Prisma.Decimal(parsed.data.closingAmount),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return ok(session);
  } catch (err) {
    return serverError("Failed to close session", err);
  }
}
