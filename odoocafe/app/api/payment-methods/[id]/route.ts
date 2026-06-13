import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePaymentMethodSchema } from "@/lib/validations/payment";
import { ok, badRequest, notFound, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/payment-methods/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePaymentMethodSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const method = await prisma.paymentMethod.update({ where: { id }, data: parsed.data });
    return ok(method);
  } catch (err) {
    return serverError("Failed to update payment method", err);
  }
}

// DELETE /api/payment-methods/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) return notFound("Payment method not found");

    const usedCount = await prisma.payment.count({ where: { methodId: id } });
    if (usedCount > 0) return badRequest(`Cannot delete: used in ${usedCount} payment(s)`);

    await prisma.paymentMethod.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to delete payment method", err);
  }
}
