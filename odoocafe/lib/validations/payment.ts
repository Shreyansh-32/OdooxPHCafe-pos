import { z } from "zod";

export const recordPaymentSchema = z.object({
  methodId: z.string().min(1, "Payment method is required"),
  amount: z.number().positive("Amount must be positive"),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

export const validatePromoSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
  orderTotal: z.number().positive("Order total must be positive"),
});

export const createPromoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const updatePromoSchema = createPromoSchema.partial();

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CASH", "UPI", "CARD"]),
  isEnabled: z.boolean().default(true),
  upiId: z.string().optional(),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ValidatePromoInput = z.infer<typeof validatePromoSchema>;
export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
