import { z } from "zod";

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  customerNote: z.string().optional(),
  source: z.enum(["CASHIER", "CUSTOMER"]).default("CASHIER"),
});

export const updateOrderSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED"]).optional(),
  customerNote: z.string().optional(),
  promotionId: z.string().optional(),
});

export const addOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  notes: z.string().optional(),
});

export const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(0, "Quantity cannot be negative").optional(),
  notes: z.string().optional(),
});

export const updateKdsStatusSchema = z.object({
  kdsStatus: z.enum(["PENDING", "TO_COOK", "PREPARING", "COMPLETED"]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type UpdateKdsStatusInput = z.infer<typeof updateKdsStatusSchema>;
