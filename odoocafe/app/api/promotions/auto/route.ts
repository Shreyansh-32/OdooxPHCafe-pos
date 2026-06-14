import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/promotions/auto?orderTotal=<number>
 * Returns all active auto-applicable promotions (those WITHOUT a code)
 * that are eligible for the given order total.
 * The frontend will automatically apply the best one.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTotalParam = searchParams.get("orderTotal");
  const orderTotal = orderTotalParam ? parseFloat(orderTotalParam) : 0;

  const now = new Date();

  // Find all active promotions without a code (auto-apply type)
  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      code: null, // No code = auto-apply
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      ],
    },
    orderBy: { discountValue: "desc" }, // Best discount first
  });

  // Filter by min order amount and max uses, then calculate discount
  const eligible = promos
    .filter((p) => {
      if (p.maxUses && p.usedCount >= p.maxUses) return false;
      if (p.minOrderAmount && orderTotal < Number(p.minOrderAmount)) return false;
      return true;
    })
    .map((p) => {
      let discountAmount = 0;
      if (p.discountType === "PERCENTAGE") {
        discountAmount = (orderTotal * Number(p.discountValue)) / 100;
      } else {
        discountAmount = Math.min(Number(p.discountValue), orderTotal);
      }
      return {
        id: p.id,
        name: p.name,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
      };
    });

  return NextResponse.json({ ok: true, data: eligible });
}
