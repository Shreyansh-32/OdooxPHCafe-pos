import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validations/product";
import {
  ok, badRequest, notFound, serverError,
  requireStaff, isNextResponse,
} from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/categories/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return ok(category);
  } catch (err) {
    return serverError("Failed to update category", err);
  }
}

// DELETE /api/categories/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    // Check no active products
    const count = await prisma.product.count({ where: { categoryId: id, isArchived: false } });
    if (count > 0) {
      return badRequest(`Cannot delete: ${count} active product(s) in this category`);
    }
    await prisma.category.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError("Failed to delete category", err);
  }
}

// GET /api/categories/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: { where: { isArchived: false }, orderBy: { name: "asc" } },
        _count: { select: { products: true } },
      },
    });
    if (!category) return notFound("Category not found");
    return ok(category);
  } catch (err) {
    return serverError("Failed to fetch category", err);
  }
}
