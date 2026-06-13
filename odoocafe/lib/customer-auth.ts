import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { CustomerJWTPayload } from "./customer-jwt";

export { signCustomerToken, verifyCustomerToken, getCustomerSession } from "./customer-jwt";
export type { CustomerJWTPayload };

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
