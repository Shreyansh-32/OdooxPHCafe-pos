import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validations/product";
import {
  ok, created, badRequest, serverError,
  requireStaff, isNextResponse, getQuery,
} from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

// GET /api/products?categoryId=&includeArchived=&includeUnavailable=
export async function GET(req: NextRequest) {
  try {
    const categoryId = getQuery(req, "categoryId");
    const includeArchived = getQuery(req, "includeArchived") === "true";
    const includeUnavailable = getQuery(req, "includeUnavailable") === "true";

    const where: Prisma.ProductWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(!includeArchived ? { isArchived: false } : {}),
      ...(!includeUnavailable ? { isAvailable: true } : {}),
    };

    const products = await prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });

    return ok(products);
  } catch (err) {
    return serverError("Failed to fetch products", err);
  }
}

// POST /api/products — admin only
export async function POST(req: NextRequest) {
  const auth = await requireStaff(["ADMIN"]);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { price, taxRate, ...rest } = parsed.data;

    const product = await prisma.product.create({
      data: {
        ...rest,
        price: new Prisma.Decimal(price),
        taxRate: new Prisma.Decimal(taxRate),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });

    return created(product);
  } catch (err) {
    return serverError("Failed to create product", err);
  }
}
