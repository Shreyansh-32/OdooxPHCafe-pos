import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPaymentMethodSchema } from "@/lib/validations/payment";
import { ok, created, badRequest, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";

// GET /api/payment-methods — visible to all staff
export async function GET() {
  const auth = await requireStaff(["ADMIN", "CASHIER"]);
  if (isNextResponse(auth)) return auth;

  try {
    const methods = await prisma.paymentMethod.findMany({
      where: auth.role === "CASHIER" ? { isEnabled: true } : {},
      orderBy: { name: "asc" },
    });
    return ok(methods);
  } catch (err) {
    return serverError("Failed to fetch payment methods", err);
  }
}

// POST /api/payment-methods — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createPaymentMethodSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const method = await prisma.paymentMethod.create({ data: parsed.data });
    return created(method);
  } catch (err) {
    return serverError("Failed to create payment method", err);
  }
}
