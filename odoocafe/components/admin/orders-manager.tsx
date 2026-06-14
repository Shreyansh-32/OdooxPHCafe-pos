"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Search, ShoppingBag, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";

interface Order {
  id: string;
  orderNumber: number;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  source: "CUSTOMER" | "CASHIER";
  createdAt: string;
  grandTotal: number;
  table: { tableNumber: string; floor: { name: string } } | null;
  items: { id: string; quantity: number; product: { name: string } }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  SENT: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  PAID: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  CANCELLED: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { socket, isConnected } = useSocket();

  const fetchOrdersRef = useRef<() => void>(null as any);

  const fetchOrders = useCallback(() => {
    fetch("/api/orders?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setOrders(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time: join admin room & refresh on order changes
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_ADMIN);

    const handleOrderUpdate = () => {
      fetchOrdersRef.current?.();
    };

    socket.on(SOCKET_EVENTS.ORDER_STATUS, handleOrderUpdate);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleOrderUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS, handleOrderUpdate);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleOrderUpdate);
    };
  }, [socket]); // Only depends on socket


  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      o.orderNumber.toString().includes(query) ||
      o.table?.tableNumber.toLowerCase().includes(query) ||
      o.items.some((i) => i.product.name.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ padding: "28px", maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Order History</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "600",
              color: isConnected ? "#22c55e" : "#ef4444",
              padding: "3px 10px",
              borderRadius: "999px",
              background: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            }}
          >
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div style={{ position: "relative", width: "300px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
          <input
            placeholder="Search by order #, table, or item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: "36px", background: "var(--color-bg-elevated)" }}
          />
        </div>
      </div>

      {/* Orders List */}
      <div style={{ background: "var(--color-bg-elevated)", borderRadius: "16px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--color-text-faint)" }}>
            <ShoppingBag size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p>No orders found matching your search.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-bg-overlay)", borderBottom: "1px solid var(--color-border-muted)", textAlign: "left", fontSize: "13px", color: "var(--color-text-muted)" }}>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Order #</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Table</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Items</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Total</th>
                <th style={{ padding: "16px 20px", fontWeight: "600" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.DRAFT;
                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--color-border-muted)", transition: "background 0.2s" }}>
                    <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: "700", color: "#B46B7A" }}>
                      #{order.orderNumber}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "var(--color-text)" }}>
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {order.table ? (
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>{order.table.tableNumber}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>{order.table.floor.name}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "14px", color: "var(--color-text-faint)" }}>Takeaway</span>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "13px", color: "var(--color-text-muted)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ")}
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: "600" }}>
                      {formatCurrency(Number(order.grandTotal))}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", background: statusStyle.bg, color: statusStyle.text }}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
