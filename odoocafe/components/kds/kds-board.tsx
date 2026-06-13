"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChefHat, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";

type KdsStatus = "PENDING" | "TO_COOK" | "PREPARING" | "COMPLETED";
type Ticket = {
  id: string;
  orderNumber: number;
  source: string;
  createdAt: string;
  table: { tableNumber: string; floor: { name: string } } | null;
  items: {
    id: string;
    quantity: number;
    notes: string | null;
    kdsStatus: KdsStatus;
    product: { name: string; category: { name: string } };
  }[];
};

const nextStatus: Record<KdsStatus, KdsStatus | null> = {
  PENDING: "TO_COOK",
  TO_COOK: "PREPARING",
  PREPARING: "COMPLETED",
  COMPLETED: null,
};

const statusColor: Record<KdsStatus, string> = {
  PENDING: "#9ca3af",
  TO_COOK: "#fbbf24",
  PREPARING: "#60a5fa",
  COMPLETED: "#4ade80",
};

export function KDSBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<KdsStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  async function loadTickets() {
    setLoading(true);
    const data = await fetch("/api/kds/tickets").then((res) => res.json());
    setTickets(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.JOIN_KITCHEN);
    socket.on(SOCKET_EVENTS.KDS_NEW_TICKET, loadTickets);
    socket.on(SOCKET_EVENTS.KDS_ITEM_UPDATED, loadTickets);
    socket.on(SOCKET_EVENTS.KDS_ORDER_COMPLETE, loadTickets);
    return () => {
      socket.off(SOCKET_EVENTS.KDS_NEW_TICKET);
      socket.off(SOCKET_EVENTS.KDS_ITEM_UPDATED);
      socket.off(SOCKET_EVENTS.KDS_ORDER_COMPLETE);
    };
  }, [socket]);

  const visibleTickets = useMemo(() => {
    if (filter === "ALL") return tickets;
    return tickets.filter((ticket) => ticket.items.some((item) => item.kdsStatus === filter));
  }, [filter, tickets]);

  async function advanceItem(itemId: string, current: KdsStatus) {
    const next = nextStatus[current];
    if (!next) return;
    setTickets((currentTickets) =>
      currentTickets.map((ticket) => ({
        ...ticket,
        items: ticket.items.map((item) =>
          item.id === itemId ? { ...item, kdsStatus: next } : item
        ),
      }))
    );
    await fetch(`/api/kds/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kdsStatus: next }),
    });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: 18, borderBottom: "1px solid var(--color-border)", display: "flex", gap: 14, alignItems: "center", background: "var(--color-bg-elevated)" }}>
        <ChefHat color="var(--color-primary)" />
        <h1 style={{ margin: 0, fontSize: 22 }}>Kitchen Display</h1>
        <span className="badge" style={{ background: "rgba(200,121,65,0.14)", color: "var(--color-primary)" }}>{visibleTickets.length} tickets</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {(["ALL", "PENDING", "TO_COOK", "PREPARING", "COMPLETED"] as const).map((value) => (
            <button
              key={value}
              className="app-button secondary"
              onClick={() => setFilter(value)}
              style={{
                minHeight: 32,
                padding: "6px 10px",
                color: filter === value ? "var(--color-primary)" : "var(--color-text-muted)",
              }}
            >
              {value.replace("_", " ")}
            </button>
          ))}
          <button className="app-button secondary" onClick={loadTickets} style={{ minHeight: 32, padding: 8 }}>
            <RefreshCw size={15} />
          </button>
          <span style={{ color: isConnected ? "#4ade80" : "#f87171", display: "inline-flex", gap: 6, alignItems: "center" }}>
            {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14, alignContent: "start" }}>
        {loading && <p className="muted">Loading tickets...</p>}
        {!loading && visibleTickets.length === 0 && (
          <div className="surface" style={{ gridColumn: "1 / -1", padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
            <ChefHat size={42} style={{ opacity: 0.4 }} />
            <p>No active kitchen tickets.</p>
          </div>
        )}
        {visibleTickets.map((ticket) => {
          const complete = ticket.items.every((item) => item.kdsStatus === "COMPLETED");
          return (
            <article key={ticket.id} className="surface" style={{ overflow: "hidden", borderColor: complete ? "rgba(34,197,94,0.45)" : "var(--color-border)" }}>
              <div style={{ padding: 14, background: "var(--color-bg-overlay)", borderBottom: "1px solid var(--color-border-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "var(--color-primary)", fontSize: 18 }}>#{ticket.orderNumber}</strong>
                  <span style={{ marginLeft: 8, color: "var(--color-text-muted)" }}>
                    {ticket.table ? `${ticket.table.floor.name} / ${ticket.table.tableNumber}` : ticket.source}
                  </span>
                </div>
                <span className="badge" style={{ background: "rgba(79,140,255,0.14)", color: "#9cc0ff" }}>
                  <Clock size={12} />
                  {new Date(ticket.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div style={{ padding: 10, display: "grid", gap: 8 }}>
                {ticket.items.map((item) => {
                  const next = nextStatus[item.kdsStatus];
                  return (
                    <button
                      key={item.id}
                      onClick={() => advanceItem(item.id, item.kdsStatus)}
                      disabled={!next}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        textAlign: "left",
                        border: `1px solid ${statusColor[item.kdsStatus]}55`,
                        background: `${statusColor[item.kdsStatus]}18`,
                        color: "var(--color-text)",
                        padding: 12,
                      }}
                    >
                      <span>
                        <strong>{item.quantity} x {item.product.name}</strong>
                        <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12 }}>
                          {item.product.category.name}{item.notes ? ` · ${item.notes}` : ""}
                        </span>
                      </span>
                      <span style={{ color: statusColor[item.kdsStatus], fontWeight: 800 }}>
                        {next ? next.replace("_", " ") : <CheckCircle2 size={18} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
