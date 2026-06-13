"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { ChefHat, Clock, CheckCircle2, Flame, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";

type KDSStatus = "PENDING" | "TO_COOK" | "PREPARING" | "COMPLETED";

interface KDSItem {
  id: string;
  productName: string;
  quantity: number;
  notes: string | null;
  kdsStatus: KDSStatus;
}

interface KDSTicket {
  orderId: string;
  orderNumber: number;
  tableId: string | null;
  tableNumber: string | null;
  source: string;
  createdAt: string;
  items: KDSItem[];
}

const STATUS_COLORS: Record<KDSStatus, { bg: string; border: string; text: string; label: string }> = {
  PENDING:    { bg: "rgba(107,114,128,0.15)", border: "#6b7280", text: "#9ca3af", label: "Pending" },
  TO_COOK:    { bg: "rgba(245,158,11,0.15)",  border: "#f59e0b", text: "#fbbf24", label: "To Cook" },
  PREPARING:  { bg: "rgba(59,130,246,0.15)",  border: "#3b82f6", text: "#60a5fa", label: "Preparing" },
  COMPLETED:  { bg: "rgba(34,197,94,0.15)",   border: "#22c55e", text: "#4ade80", label: "Done" },
};

const NEXT_STATUS: Record<KDSStatus, KDSStatus | null> = {
  PENDING: "TO_COOK",
  TO_COOK: "PREPARING",
  PREPARING: "COMPLETED",
  COMPLETED: null,
};

function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setElapsed(secs);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const secs = useElapsed(createdAt);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const isUrgent = secs > 600; // 10+ min
  const isWarning = secs > 300; // 5+ min

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700",
        background: isUrgent
          ? "rgba(239,68,68,0.2)"
          : isWarning
          ? "rgba(245,158,11,0.15)"
          : "rgba(107,114,128,0.15)",
        color: isUrgent ? "#f87171" : isWarning ? "#fbbf24" : "#9ca3af",
        animation: isUrgent ? "pulse 1s infinite" : "none",
      }}
    >
      <Clock size={11} />
      {mins}:{s.toString().padStart(2, "0")}
    </span>
  );
}

export function KDSBoard() {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<"ALL" | KDSStatus>("ALL");
  const { socket, isConnected } = useSocket();
  const audioRef = useRef<AudioContext | null>(null);
  const completionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeTicket = useCallback((orderId: string) => {
    setTickets((prev) => prev.filter((ticket) => ticket.orderId !== orderId));
  }, []);

  const scheduleTicketRemoval = useCallback((orderId: string) => {
    const existingTimer = completionTimersRef.current[orderId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    completionTimersRef.current[orderId] = setTimeout(() => {
      removeTicket(orderId);
      delete completionTimersRef.current[orderId];
    }, 5000);
  }, [removeTicket]);

  const cancelTicketRemoval = useCallback((orderId: string) => {
    const existingTimer = completionTimersRef.current[orderId];
    if (existingTimer) {
      clearTimeout(existingTimer);
      delete completionTimersRef.current[orderId];
    }
  }, []);

  const scheduleCompletedTickets = useCallback((ticket: KDSTicket) => {
    if (ticket.items.length > 0 && ticket.items.every((item) => item.kdsStatus === "COMPLETED")) {
      scheduleTicketRemoval(ticket.orderId);
    }
  }, [scheduleTicketRemoval]);

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [soundEnabled]);

  // Fetch initial tickets
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?status=SENT&limit=20");
      const data = await res.json();
      if (data.ok) {
        const mapped: KDSTicket[] = (data.data || []).map((o: any) => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          tableId: o.tableId,
          tableNumber: o.table?.tableNumber ?? null,
          source: o.source,
          createdAt: o.createdAt,
          items: o.items.map((i: any) => ({
            id: i.id,
            productName: i.product.name,
            quantity: i.quantity,
            notes: i.notes,
            kdsStatus: i.kdsStatus,
          })),
        }));
        setTickets(mapped);
        mapped.forEach((ticket) => scheduleCompletedTickets(ticket));
      }
    } finally {
      setLoading(false);
    }
  }, [scheduleCompletedTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_KITCHEN);

    socket.on(SOCKET_EVENTS.KDS_NEW_TICKET, (payload: KDSTicket) => {
      playChime();
      setTickets((prev) => {
        const exists = prev.find((t) => t.orderId === payload.orderId);
        if (exists) return prev;
        return [payload, ...prev];
      });
    });

    socket.on(SOCKET_EVENTS.KDS_ITEM_UPDATED, (payload: { orderId: string; itemId: string; kdsStatus: KDSStatus }) => {
      setTickets((prev) =>
        prev.map((ticket) => {
          if (ticket.orderId !== payload.orderId) return ticket;

          const updatedTicket = {
            ...ticket,
            items: ticket.items.map((item) =>
              item.id === payload.itemId ? { ...item, kdsStatus: payload.kdsStatus } : item
            ),
          };

          if (updatedTicket.items.length > 0 && updatedTicket.items.every((item) => item.kdsStatus === "COMPLETED")) {
            scheduleTicketRemoval(updatedTicket.orderId);
          } else {
            cancelTicketRemoval(updatedTicket.orderId);
          }

          return updatedTicket;
        })
      );
    });

    socket.on(SOCKET_EVENTS.KDS_ORDER_COMPLETE, (payload: { orderId: string }) => {
      scheduleTicketRemoval(payload.orderId);
    });

    return () => {
      socket.off(SOCKET_EVENTS.KDS_NEW_TICKET);
      socket.off(SOCKET_EVENTS.KDS_ITEM_UPDATED);
      socket.off(SOCKET_EVENTS.KDS_ORDER_COMPLETE);
    };
  }, [socket, playChime, scheduleTicketRemoval, cancelTicketRemoval]);

  useEffect(() => {
    return () => {
      Object.values(completionTimersRef.current).forEach((timer) => clearTimeout(timer));
      completionTimersRef.current = {};
    };
  }, []);

  const advanceItem = async (itemId: string, currentStatus: KDSStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((i) =>
          i.id === itemId ? { ...i, kdsStatus: nextStatus } : i
        ),
      }))
    );

    await fetch(`/api/kds/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kdsStatus: nextStatus }),
    });
  };

  const visibleTickets = tickets.filter((t) => {
    if (filter === "ALL") return true;
    return t.items.some((i) => i.kdsStatus === filter);
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 24px",
          background: "var(--color-bg-elevated)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ChefHat size={22} color="#c87941" />
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
            Kitchen Display
          </h1>
          <span
            style={{
              background: "rgba(200,121,65,0.15)",
              color: "#c87941",
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {visibleTickets.length} tickets
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "6px", marginLeft: "16px" }}>
          {(["ALL", "PENDING", "TO_COOK", "PREPARING", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              id={`kds-filter-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                background: filter === f
                  ? f === "ALL" ? "var(--color-primary)" : STATUS_COLORS[f as KDSStatus]?.bg
                  : "transparent",
                color: filter === f
                  ? f === "ALL" ? "#fff" : STATUS_COLORS[f as KDSStatus]?.text
                  : "var(--color-text-muted)",
                border: `1px solid ${
                  filter === f
                    ? f === "ALL" ? "var(--color-primary)" : STATUS_COLORS[f as KDSStatus]?.border
                    : "var(--color-border)"
                }`,
              }}
            >
              {f === "ALL" ? "All" : STATUS_COLORS[f as KDSStatus]?.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            id="kds-sound-toggle"
            onClick={() => setSoundEnabled((s) => !s)}
            title={soundEnabled ? "Mute alerts" : "Enable alerts"}
            style={{
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: isConnected ? "#22c55e" : "#ef4444" }}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? "Live" : "Reconnecting..."}
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          alignContent: "start",
          overflowY: "auto",
        }}
      >
        {loading && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px", color: "var(--color-text-faint)" }}>
            Loading tickets...
          </div>
        )}

        {!loading && visibleTickets.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--color-text-faint)",
            }}
          >
            <ChefHat size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: "16px" }}>No active tickets</p>
            <p style={{ margin: "8px 0 0", fontSize: "13px" }}>Orders sent to kitchen will appear here</p>
          </div>
        )}

        {visibleTickets.map((ticket) => {
          const allDone = ticket.items.length > 0 && ticket.items.every((i) => i.kdsStatus === "COMPLETED");
          return (
            <div
              key={ticket.orderId}
              id={`ticket-${ticket.orderId}`}
              style={{
                background: "var(--color-bg-elevated)",
                border: `1px solid ${allDone ? "#22c55e44" : "var(--color-border)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                transition: "all 0.3s ease",
                opacity: allDone ? 0.7 : 1,
                animation: "fadeIn 0.3s ease",
              }}
            >
              {/* Ticket Header */}
              <div
                style={{
                  padding: "12px 16px",
                  background: allDone ? "rgba(34,197,94,0.08)" : "var(--color-bg-overlay)",
                  borderBottom: "1px solid var(--color-border-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#c87941" }}>
                    #{ticket.orderNumber}
                  </span>
                  {ticket.tableNumber && (
                    <span
                      style={{
                        background: "rgba(200,121,65,0.15)",
                        color: "#c87941",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {ticket.tableNumber}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-faint)",
                      background: "var(--color-bg-elevated)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-muted)",
                    }}
                  >
                    {ticket.source === "CUSTOMER" ? "📱 QR" : "🖥️ POS"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ElapsedBadge createdAt={ticket.createdAt} />
                  {allDone && (
                    <span style={{ color: "#4ade80" }}>
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div style={{ padding: "10px" }}>
                {ticket.items.map((item) => {
                  const statusStyle = STATUS_COLORS[item.kdsStatus];
                  const canAdvance = NEXT_STATUS[item.kdsStatus] !== null;
                  return (
                    <button
                      key={item.id}
                      id={`kds-item-${item.id}`}
                      onClick={() => canAdvance && advanceItem(item.id, item.kdsStatus)}
                      disabled={!canAdvance}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        marginBottom: "6px",
                        borderRadius: "8px",
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}33`,
                        cursor: canAdvance ? "pointer" : "default",
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (canAdvance) e.currentTarget.style.borderColor = statusStyle.border;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${statusStyle.border}33`;
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              background: "var(--color-bg-elevated)",
                              color: "var(--color-text)",
                              borderRadius: "6px",
                              padding: "1px 8px",
                              fontSize: "14px",
                              fontWeight: "800",
                            }}
                          >
                            ×{item.quantity}
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text)" }}>
                            {item.productName}
                          </span>
                        </div>
                        {item.notes && (
                          <p style={{ margin: "4px 0 0 36px", fontSize: "12px", color: "#fbbf24", fontStyle: "italic" }}>
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: statusStyle.text,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: "rgba(0,0,0,0.2)",
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}
                      >
                        {canAdvance ? `→ ${STATUS_COLORS[NEXT_STATUS[item.kdsStatus]!].label}` : statusStyle.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
