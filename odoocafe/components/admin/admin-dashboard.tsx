"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Table2,
  IndianRupee,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface KPIs {
  ordersToday: number;
  revenueToday: number;
  activeTables: number;
  totalOrdersPeriod: number;
  totalRevenuePeriod: number;
}

interface ReportData {
  kpis: KPIs;
  revenueChart: { date: string; revenue: number }[];
  topProducts: { productId: string; name: string; totalQty: number; totalRevenue: number }[];
  paymentBreakdown: { method: string; type: string; total: number; count: number }[];
}

const PIE_COLORS = ["#c87941", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

export function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const kpis = data?.kpis;

  return (
    <div style={{ padding: "28px", maxWidth: "1400px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Last updated: {format(lastUpdated, "HH:mm:ss")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Period selector */}
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              id={`period-${p}`}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                background: period === p ? "var(--color-primary)" : "var(--color-bg-overlay)",
                color: period === p ? "#fff" : "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
          <button
            id="refresh-btn"
            onClick={fetchData}
            style={{
              padding: "8px",
              borderRadius: "8px",
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            id: "kpi-orders-today",
            label: "Orders Today",
            value: kpis?.ordersToday ?? "—",
            icon: ShoppingBag,
            color: "#c87941",
            subtitle: `${kpis?.totalOrdersPeriod ?? 0} in period`,
          },
          {
            id: "kpi-revenue-today",
            label: "Revenue Today",
            value: kpis ? formatCurrency(kpis.revenueToday) : "—",
            icon: IndianRupee,
            color: "#22c55e",
            subtitle: kpis ? `${formatCurrency(kpis.totalRevenuePeriod)} in period` : "",
          },
          {
            id: "kpi-active-tables",
            label: "Active Tables",
            value: kpis?.activeTables ?? "—",
            icon: Table2,
            color: "#3b82f6",
            subtitle: "Currently serving",
          },
          {
            id: "kpi-avg-order",
            label: "Avg. Order Value",
            value:
              kpis && kpis.totalOrdersPeriod > 0
                ? formatCurrency(kpis.totalRevenuePeriod / kpis.totalOrdersPeriod)
                : "—",
            icon: TrendingUp,
            color: "#8b5cf6",
            subtitle: "Per order in period",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              id={kpi.id}
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: `1px solid ${kpi.color}22`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: `${kpi.color}10`,
                }}
              />
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${kpi.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={kpi.color} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-muted)" }}>{kpi.label}</p>
                <p style={{ margin: "4px 0 2px", fontSize: "26px", fontWeight: "800", color: "var(--color-text)" }}>
                  {loading ? <span style={{ opacity: 0.3 }}>...</span> : kpi.value}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-faint)" }}>{kpi.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Revenue Chart */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <BarChart3 size={18} color="#c87941" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Revenue Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.revenueChart || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c87941" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c87941" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(parseISO(d), "MMM d")}
                tick={{ fill: "#8a8a9a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fill: "#8a8a9a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a24",
                  border: "1px solid #2a2a3a",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={(d) => format(parseISO(String(d)), "MMM dd, yyyy")}
                formatter={(v: any) => [formatCurrency(Number(v)), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#c87941"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown */}
        <div className="card">
          <h3 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: "700" }}>
            Payment Methods
          </h3>
          {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.paymentBreakdown}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {data.paymentBreakdown.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1a1a24",
                    border: "1px solid #2a2a3a",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(v: any) => [formatCurrency(Number(v))]}
                />
                <Legend
                  formatter={(value) => <span style={{ color: "#8a8a9a", fontSize: "12px" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-faint)", fontSize: "14px" }}>
              No payment data yet
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card">
        <h3 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: "700" }}>
          🏆 Top Selling Products
        </h3>
        {data?.topProducts && data.topProducts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topProducts.slice(0, 8).map((p, idx) => {
              const maxQty = data.topProducts[0]?.totalQty || 1;
              const pct = (p.totalQty / maxQty) * 100;
              return (
                <div key={p.productId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: idx < 3 ? "rgba(200,121,65,0.2)" : "var(--color-bg-overlay)",
                      color: idx < 3 ? "#c87941" : "var(--color-text-faint)",
                      fontSize: "12px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--color-text-muted)", flexShrink: 0, marginLeft: "12px" }}>
                        {p.totalQty} sold · {formatCurrency(p.totalRevenue)}
                      </span>
                    </div>
                    <div style={{ height: "4px", borderRadius: "999px", background: "var(--color-bg-overlay)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: "999px",
                          background: `linear-gradient(90deg, #c87941, #a06030)`,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "var(--color-text-faint)", margin: 0, fontSize: "14px" }}>
            No sales data yet
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
