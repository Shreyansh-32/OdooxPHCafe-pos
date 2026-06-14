"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Smile, ShoppingBag, Calendar, Users, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastOrderAt: string | null;
  createdAt: string;
  orderCount: number;
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load customers:", err);
        setLoading(false);
      });
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    });
  }, [search, customers]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.orderCount > 0).length;
    return { total, active };
  }, [customers]);

  return (
    <div style={{ padding: "28px", maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Customer Database</h1>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-faint)",
                }}
              />
              <input
                id="customer-search"
                type="text"
                value={search}
                placeholder="Search by name, email, or phone"
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: "320px", paddingLeft: "36px" }}
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  background: "var(--color-bg-overlay)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            {stats.total} total registered accounts
            {search ? ` · showing ${filteredCustomers.length} result${filteredCustomers.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", marginBottom: "28px" }}>
        {/* Card 1: Total Customers */}
        <div className="card" style={{ padding: "18px", border: "1px solid rgba(180, 107, 122, 0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(180, 107, 122, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
              }}
            >
              <Smile size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>{stats.total}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>Total Signups</p>
            </div>
          </div>
        </div>

        {/* Card 2: Active Customers */}
        <div className="card" style={{ padding: "18px", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(34, 197, 94, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-success)",
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>{stats.active}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>Ordered at Least Once</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Customer", "Contact", "Orders Placed", "Last Order", "Signed Up"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-faint)" }}>
                  No customer records found.
                </td>
              </tr>
            )}
            {filteredCustomers.map((c) => {
              const hue = (c.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360);
              const avatarBg = `hsla(${hue}, 70%, 40%, 0.15)`;
              const avatarColor = `hsl(${hue}, 70%, 65%)`;

              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid var(--color-border-muted)", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-overlay)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Name column */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: avatarBg,
                          border: `2px solid ${avatarColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: avatarColor,
                          flexShrink: 0,
                        }}
                      >
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "600" }}>{c.name}</span>
                    </div>
                  </td>

                  {/* Contact details */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "13px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Mail size={12} color="var(--color-text-faint)" /> {c.email}
                      </span>
                      {c.phone && (
                        <span style={{ fontSize: "12px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} color="var(--color-text-faint)" /> {c.phone}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Orders Placed */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: c.orderCount > 0 ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 255, 255, 0.04)",
                        color: c.orderCount > 0 ? "#4ade80" : "var(--color-text-muted)",
                      }}
                    >
                      {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                    </span>
                  </td>

                  {/* Last Order Date */}
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {c.lastOrderAt ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} /> {format(new Date(c.lastOrderAt), "dd MMM yyyy HH:mm")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-faint)" }}>Never</span>
                    )}
                  </td>

                  {/* Signed Up Date */}
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--color-text-faint)" }}>
                    {format(new Date(c.createdAt), "dd MMM yyyy")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
