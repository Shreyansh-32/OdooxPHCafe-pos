import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";

// ── Standard JSON responses ───────────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Internal server error", err?: unknown) {
  console.error("[API Error]", message, err);
  return NextResponse.json({ error: message }, { status: 500 });
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Get the current staff session from NextAuth.
 * Returns null if not authenticated.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as Role,
  };
}

/**
 * Require an authenticated staff session.
 * Optionally restrict to specific roles.
 * Returns the session or a NextResponse error.
 */
export async function requireStaff(
  allowedRoles?: Role[]
): Promise<StaffSession | NextResponse> {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return forbidden(`Requires role: ${allowedRoles.join(" or ")}`);
  }
  return session;
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}

// ── URL param helpers ─────────────────────────────────────────────────────────

export function getParam(
  params: Record<string, string>,
  key: string
): string | null {
  return params[key] ?? null;
}

// ── Query string helpers ──────────────────────────────────────────────────────

export function getQuery(req: NextRequest, key: string): string | null {
  return req.nextUrl.searchParams.get(key);
}
