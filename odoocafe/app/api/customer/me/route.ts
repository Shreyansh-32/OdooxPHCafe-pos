import { getStaffSession, ok, unauthorized } from "@/lib/api-helpers";

// GET /api/customer/me — placeholder for customer JWT session (future)
// For now returns staff session info; real customer JWT auth to be added with Socket.IO server
export async function GET() {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  return ok({ user: session });
}
