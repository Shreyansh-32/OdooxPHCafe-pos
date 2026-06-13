import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePromoSchema } from "@/lib/validations/payment";
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

// POST /api/promotions/validate — public (customer or cashier can use)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validatePromoSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { code, orderTotal } = parsed.data;
    const now = new Date();

    const promo = await prisma.promotion.findUnique({ where: { code } });

    if (!promo) return notFound("Promo code not found");
    if (!promo.isActive) return badRequest("Promo code is inactive");
    if (promo.validFrom && promo.validFrom > now) return badRequest("Promo code is not yet valid");
    if (promo.validUntil && promo.validUntil < now) return badRequest("Promo code has expired");
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return badRequest("Promo code usage limit reached");
    }

    const orderDecimal = new Prisma.Decimal(orderTotal);
    if (promo.minOrderAmount && orderDecimal.lessThan(promo.minOrderAmount)) {
      return badRequest(
        `Minimum order amount of ₹${promo.minOrderAmount} required (current: ₹${orderTotal})`
      );
    }

    let discountAmount: Prisma.Decimal;
    if (promo.discountType === "PERCENTAGE") {
      discountAmount = orderDecimal.mul(promo.discountValue.div(100));
    } else {
      discountAmount = promo.discountValue;
    }

    // Cap discount at order total
    if (discountAmount.greaterThan(orderDecimal)) {
      discountAmount = orderDecimal;
    }

    const finalTotal = orderDecimal.sub(discountAmount);

    return ok({
      valid: true,
      promotionId: promo.id,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
    });
  } catch (err) {
    return serverError("Failed to validate promo code", err);
  }
}
