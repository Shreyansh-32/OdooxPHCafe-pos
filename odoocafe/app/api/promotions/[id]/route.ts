import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePromoSchema } from "@/lib/validations/payment";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/promotions/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePromoSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { discountValue, minOrderAmount, validFrom, validUntil, ...rest } = parsed.data;

    const promo = await prisma.promotion.update({
      where: { id },
      data: {
        ...rest,
        ...(discountValue !== undefined ? { discountValue: new Prisma.Decimal(discountValue) } : {}),
        ...(minOrderAmount !== undefined ? { minOrderAmount: new Prisma.Decimal(minOrderAmount) } : {}),
        ...(validFrom !== undefined ? { validFrom: new Date(validFrom) } : {}),
        ...(validUntil !== undefined ? { validUntil: new Date(validUntil) } : {}),
      },
    });

    return ok(promo);
  } catch (err) {
    return serverError("Failed to update promotion", err);
  }
}

// DELETE /api/promotions/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) return notFound("Promotion not found");
    await prisma.promotion.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to delete promotion", err);
  }
}
