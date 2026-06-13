import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPromoSchema } from "@/lib/validations/payment";
import { ok, created, badRequest, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";

// GET /api/promotions — admin only
export async function GET() {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
    return ok(promotions);
  } catch (err) {
    return serverError("Failed to fetch promotions", err);
  }
}

// POST /api/promotions — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createPromoSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { discountValue, minOrderAmount, validFrom, validUntil, ...rest } = parsed.data;
    const { Prisma } = await import("@prisma/client");

    const promo = await prisma.promotion.create({
      data: {
        ...rest,
        discountValue: new Prisma.Decimal(discountValue),
        minOrderAmount: minOrderAmount ? new Prisma.Decimal(minOrderAmount) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    return created(promo);
  } catch (err) {
    return serverError("Failed to create promotion", err);
  }
}
