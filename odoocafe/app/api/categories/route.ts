import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validations/product";
import { ok, created, badRequest, serverError, requireStaff, isNextResponse } from "@/lib/api-helpers";

// GET /api/categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return ok(categories);
  } catch (err) {
    return serverError("Failed to fetch categories", err);
  }
}

// POST /api/categories — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const category = await prisma.category.create({ data: parsed.data });
    return created(category);
  } catch (err) {
    return serverError("Failed to create category", err);
  }
}
