import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const CUSTOMER_JWT_SECRET = new TextEncoder().encode(
  process.env.CUSTOMER_JWT_SECRET || "fallback-secret-change-in-production"
);

export interface CustomerJWTPayload {
  customerId: string;
  tableId: string;
  name: string;
  email: string;
}

// Sign a new customer session JWT
export async function signCustomerToken(
  payload: CustomerJWTPayload
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(CUSTOMER_JWT_SECRET);
}

// Verify and decode a customer session JWT
export async function verifyCustomerToken(
  token: string
): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_JWT_SECRET);
    return payload as unknown as CustomerJWTPayload;
  } catch {
    return null;
  }
}

// Get current customer from cookie (server-side)
export async function getCustomerSession(): Promise<CustomerJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_session")?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password with hash
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Register a new customer
export async function registerCustomer(data: {
  name: string;
  email: string;
  password: string;
  tableId: string;
}) {
  const existing = await prisma.customer.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  const hashed = await hashPassword(data.password);
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
    },
  });

  return customer;
}

// Login a customer
export async function loginCustomer(data: {
  email: string;
  password: string;
}) {
  const customer = await prisma.customer.findUnique({
    where: { email: data.email },
  });

  if (!customer) {
    throw new Error("Invalid credentials");
  }

  const valid = await verifyPassword(data.password, customer.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  return customer;
}
