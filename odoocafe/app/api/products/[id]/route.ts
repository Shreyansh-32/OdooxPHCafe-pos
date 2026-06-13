import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validations/product";
import {
  ok, badRequest, notFound, serverError,
  requireStaff, isNextResponse,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    if (!product) return notFound("Product not found");
    return ok(product);
  } catch (err) {
    return serverError("Failed to fetch product", err);
  }
}

// PATCH /api/products/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { price, taxRate, ...rest } = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}),
        ...(taxRate !== undefined ? { taxRate: new Prisma.Decimal(taxRate) } : {}),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    return ok(product);
  } catch (err) {
    return serverError("Failed to update product", err);
  }
}

// DELETE /api/products/[id] — soft delete (admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    await prisma.product.update({ where: { id }, data: { isArchived: true } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to archive product", err);
  }
}
