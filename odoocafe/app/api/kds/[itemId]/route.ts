import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateKdsStatusSchema } from "@/lib/validations/order";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";

type Params = { params: Promise<{ itemId: string }> };

const KDS_ORDER: Record<string, number> = {
  PENDING: 0,
  TO_COOK: 1,
  PREPARING: 2,
  COMPLETED: 3,
};

// PATCH /api/kds/[itemId] — advance item KDS status (forward only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN", "KITCHEN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { itemId } = await params;
    const body = await req.json();
    const parsed = updateKdsStatusSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: { select: { id: true, status: true } } },
    });
    if (!item) return notFound("Order item not found");

    // Only allow forward transitions
    const currentRank = KDS_ORDER[item.kdsStatus] ?? 0;
    const newRank = KDS_ORDER[parsed.data.kdsStatus] ?? 0;
    if (newRank <= currentRank) {
      return badRequest(
        `Cannot move status backwards from ${item.kdsStatus} to ${parsed.data.kdsStatus}`
      );
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { kdsStatus: parsed.data.kdsStatus },
      include: { product: { select: { id: true, name: true } } },
    });

    // Check if ALL items in this order (that show in KDS) are now COMPLETED
    const remaining = await prisma.orderItem.count({
      where: {
        orderId: item.orderId,
        kdsStatus: { not: "COMPLETED" },
        product: { showInKds: true },
      },
    });

    return ok({ item: updated, allCompleted: remaining === 0 });
  } catch (err) {
    return serverError("Failed to update KDS status", err);
  }
}
