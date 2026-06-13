"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coffee, IndianRupee, ReceiptText, Table2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type RevenueReport = {
  totalRevenue: string;
  byDay: Record<string, number>;
};

export function AdminDashboard() {
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [tables, setTables] = useState<unknown[]>([]);
  const [products, setProducts] = useState<unknown[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports?type=revenue").then((res) => res.json()).catch(() => null),
      fetch("/api/orders").then((res) => res.json()).catch(() => []),
      fetch("/api/tables").then((res) => res.json()).catch(() => []),
      fetch("/api/products").then((res) => res.json()).catch(() => []),
    ]).then(([revenueData, orderData, tableData, productData]) => {
      setRevenue(revenueData);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setTables(Array.isArray(tableData) ? tableData : []);
      setProducts(Array.isArray(productData) ? productData : []);
    });
  }, []);

  return (
    <AdminShell title="Dashboard" subtitle="Live operating overview">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        <Metric icon={<IndianRupee />} label="Revenue" value={formatCurrency(revenue?.totalRevenue ?? 0)} />
        <Metric icon={<ReceiptText />} label="Orders" value={String(orders.length)} />
        <Metric icon={<Table2 />} label="Tables" value={String(tables.length)} />
        <Metric icon={<Coffee />} label="Products" value={String(products.length)} />
      </div>

      <section className="surface" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart3 color="var(--color-primary)" size={18} />
          <h2 style={{ margin: 0, fontSize: 17 }}>Revenue Trend</h2>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(revenue?.byDay ?? {}).slice(-10).map(([day, amount]) => (
            <div key={day} style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 12, alignItems: "center" }}>
              <span className="muted">{day}</span>
              <div style={{ height: 10, borderRadius: 999, background: "var(--color-bg-overlay)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, amount / 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--color-primary), var(--color-info))" }} />
              </div>
              <strong style={{ textAlign: "right" }}>{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!revenue && <p className="muted">Reports will appear once orders are paid.</p>}
        </div>
      </section>
    </AdminShell>
  );
}

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", padding: 22 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
        <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)" }}>{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-primary)" }}>
        {icon}
        <span style={{ color: "var(--color-text-muted)", fontWeight: 700 }}>{label}</span>
      </div>
      <strong style={{ display: "block", fontSize: 26, marginTop: 12 }}>{value}</strong>
    </div>
  );
}
