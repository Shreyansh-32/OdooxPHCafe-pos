import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyCustomerToken } from "@/lib/customer-jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Staff routes ----
  if (pathname.startsWith("/pos") || pathname.startsWith("/kds") || pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = token.role as string;

    // Admin-only routes
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }

    // Kitchen-only routes
    if (pathname.startsWith("/kds") && !["KITCHEN", "ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/pos", request.url));
    }

    // POS routes
    if (pathname.startsWith("/pos") && !["CASHIER", "ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/kds", request.url));
    }
  }

  // ---- Customer order routes ----
  if (pathname.startsWith("/order/")) {
    const segments = pathname.split("/");
    // Allow /order/[tableToken] (auth gate page) without session
    // Protect /order/[tableToken]/status and /receipt
    if (segments.length >= 4 && ["status", "receipt"].includes(segments[3])) {
      const sessionCookie = request.cookies.get("customer_session")?.value;
      if (!sessionCookie) {
        const tableToken = segments[2];
        return NextResponse.redirect(
          new URL(`/order/${tableToken}`, request.url)
        );
      }

      const session = await verifyCustomerToken(sessionCookie);
      if (!session) {
        const tableToken = segments[2];
        return NextResponse.redirect(
          new URL(`/order/${tableToken}`, request.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/pos/:path*",
    "/kds/:path*",
    "/admin/:path*",
    "/order/:path*",
  ],
};
