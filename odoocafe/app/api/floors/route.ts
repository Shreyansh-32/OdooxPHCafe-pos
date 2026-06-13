import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const floors = await prisma.floor.findMany({
    include: {
      _count: { select: { tables: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ ok: true, data: floors });
}
