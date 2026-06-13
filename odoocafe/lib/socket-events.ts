// =============================================
// CafePOS — Socket.IO Event Name Constants
// =============================================

export const SOCKET_EVENTS = {
  // ---- Connection Room Joins ----
  JOIN_TABLE: "join:table",
  JOIN_KITCHEN: "join:kitchen",
  JOIN_CASHIER: "join:cashier",
  JOIN_ADMIN: "join:admin",

  // ---- Orders (Customer → Server → Kitchen + Cashier) ----
  ORDER_PLACED: "order:placed",       // New order from QR
  ORDER_UPDATED: "order:updated",     // Item added/removed
  ORDER_STATUS: "order:status",       // DRAFT→SENT→PAID

  // ---- KDS (Kitchen → Server → Cashier + Customer) ----
  KDS_NEW_TICKET: "kds:new_ticket",       // New order arrives in kitchen
  KDS_ITEM_UPDATED: "kds:item_updated",   // TO_COOK/PREPARING/COMPLETED
  KDS_ORDER_COMPLETE: "kds:order_complete", // All items COMPLETED

  // ---- Table (Server → Cashier) ----
  TABLE_STATUS: "table:status",
  TABLE_LOCK_ACQUIRED: "table:lock:acquired",
  TABLE_LOCK_RELEASED: "table:lock:released",

  // ---- Payments ----
  PAYMENT_RECEIVED: "payment:received",

  // ---- Notifications ----
  NOTIFY_TOAST: "notify:toast",
  BILL_REQUESTED: "table:bill_request",
} as const;

export type SocketEventKey = keyof typeof SOCKET_EVENTS;
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey];
