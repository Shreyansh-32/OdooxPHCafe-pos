import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signQRToken } from "@/lib/qr";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tables/[id]
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      floor: true,
      orders: {
        where: { status: { in: ["DRAFT", "SENT"] } },
        include: {
          items: { include: { product: { select: { name: true } } } },
          customer: { select: { name: true } },
        },
      },
    },
  });

  if (!table) {
    return NextResponse.json({ ok: false, error: "Table not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: table });
}

// PATCH /api/tables/[id] — Update table (Admin only)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { tableNumber, seats, isActive } = body;

  const table = await prisma.table.update({
    where: { id },
    data: {
      ...(tableNumber !== undefined && { tableNumber }),
      ...(seats !== undefined && { seats }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { floor: true },
  });

  return NextResponse.json({ ok: true, data: table });
}

// DELETE /api/tables/[id] — Deactivate table (Admin only)
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const table = await prisma.table.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true, data: table });
}
