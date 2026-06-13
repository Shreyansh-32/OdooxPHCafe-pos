"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, QrCode, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-dashboard";
import { formatCurrency } from "@/lib/utils";

type Resource = "menu" | "tables" | "promotions" | "staff" | "reports";

const copy: Record<Resource, { title: string; subtitle: string }> = {
  menu: { title: "Menu", subtitle: "Products and categories visible to POS" },
  tables: { title: "Tables", subtitle: "Floors, seating, and QR generation" },
  promotions: { title: "Promotions", subtitle: "Discount codes and campaign controls" },
  staff: { title: "Staff", subtitle: "Create staff accounts from the signup API" },
  reports: { title: "Reports", subtitle: "Revenue, products, payments, and tables" },
};

export function AdminResourcePage({ resource }: { resource: Resource }) {
  const [data, setData] = useState<unknown[]>([]);
  const [aux, setAux] = useState<unknown[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const endpoint = useMemo(() => {
    if (resource === "menu") return "/api/products?includeUnavailable=true";
    if (resource === "tables") return "/api/tables";
    if (resource === "promotions") return "/api/promotions";
    if (resource === "reports") return "/api/reports?type=products";
    return "";
  }, [resource]);

  async function load() {
    setLoading(true);
    if (!endpoint) {
      setData([]);
      setLoading(false);
      return;
    }
    const primary = await fetch(endpoint).then((res) => res.json()).catch(() => []);
    setData(Array.isArray(primary) ? primary : primary.topProducts ?? []);
    if (resource === "menu") {
      const categories = await fetch("/api/categories").then((res) => res.json()).catch(() => []);
      setAux(Array.isArray(categories) ? categories : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [endpoint]);

  return (
    <AdminShell title={copy[resource].title} subtitle={copy[resource].subtitle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <button className="app-button secondary" onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {resource === "menu" && <MenuQuickCreate categories={aux as Category[]} onDone={load} />}
      {resource === "tables" && <TablesQuickCreate onDone={load} />}
      {resource === "promotions" && <PromotionQuickCreate onDone={load} />}
      {resource === "staff" && <StaffQuickCreate onDone={(message) => setStatus(message)} />}

      {status && <p style={{ color: "#9ae6b4" }}>{status}</p>}

      <div className="surface" style={{ overflow: "hidden", marginTop: 14 }}>
        {loading ? (
          <p className="muted" style={{ padding: 18 }}>Loading...</p>
        ) : (
          <ResourceTable resource={resource} rows={data} onRefresh={load} />
        )}
      </div>
    </AdminShell>
  );
}

type Category = { id: string; name: string };

function MenuQuickCreate({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("120");
  const [categoryId, setCategoryId] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!categoryId) return;
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), categoryId, taxRate: 0.05 }),
    });
    setName("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 110px 180px auto", gap: 10 }}>
      <input placeholder="Product name" value={name} onChange={(event) => setName(event.target.value)} />
      <input placeholder="Price" value={price} onChange={(event) => setPrice(event.target.value)} />
      <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
        <option value="">Category</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <button className="app-button" disabled={!name || !categoryId}><Plus size={15} /> Add</button>
    </form>
  );
}

function TablesQuickCreate({ onDone }: { onDone: () => void }) {
  const [floorName, setFloorName] = useState("Ground Floor");
  const [tableNumber, setTableNumber] = useState("");
  const [seats, setSeats] = useState("4");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const floor = await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: floorName }),
    }).then((res) => res.json());
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorId: floor.id, tableNumber, seats: Number(seats) }),
    });
    setTableNumber("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 120px 90px auto", gap: 10 }}>
      <input value={floorName} onChange={(event) => setFloorName(event.target.value)} />
      <input placeholder="Table no." value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} />
      <input value={seats} onChange={(event) => setSeats(event.target.value)} />
      <button className="app-button" disabled={!tableNumber}><Plus size={15} /> Add</button>
    </form>
  );
}

function PromotionQuickCreate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${code} promo`,
        code,
        discountType: "PERCENTAGE",
        discountValue: Number(value),
        isActive: true,
      }),
    });
    setCode("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 10 }}>
      <input placeholder="Coupon code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
      <input value={value} onChange={(event) => setValue(event.target.value)} />
      <button className="app-button" disabled={!code}><Plus size={15} /> Add</button>
    </form>
  );
}

function StaffQuickCreate({ onDone }: { onDone: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("CASHIER");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: "changeme123", role }),
    });
    onDone(res.ok ? "Staff account created with password changeme123." : "Could not create staff account.");
  }

  return (
    <form onSubmit={submit} className="surface" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 140px auto", gap: 10 }}>
      <input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <select value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="CASHIER">Cashier</option>
        <option value="KITCHEN">Kitchen</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button className="app-button" disabled={!email || !name}><Plus size={15} /> Add</button>
    </form>
  );
}

function ResourceTable({ resource, rows, onRefresh }: { resource: Resource; rows: unknown[]; onRefresh: () => void }) {
  if (resource === "staff") {
    return <p className="muted" style={{ padding: 18 }}>Staff listing API is not present on this branch yet. Creation is wired through signup.</p>;
  }

  if (rows.length === 0) {
    return <p className="muted" style={{ padding: 18 }}>No records yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map((row, index) => {
          const value = row as Record<string, unknown>;
          return (
            <tr key={String(value.id ?? value.productId ?? index)} style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
              <td style={{ padding: 14, fontWeight: 800 }}>
                {String(value.name ?? value.tableNumber ?? value.code ?? "Record")}
                <span style={{ display: "block", color: "var(--color-text-faint)", fontWeight: 500, fontSize: 12 }}>
                  {String(value.category ? (value.category as { name?: string }).name : value.floor ? (value.floor as { name?: string }).name : value.type ?? "")}
                </span>
              </td>
              <td style={{ padding: 14, color: "var(--color-text-muted)" }}>
                {value.price ? formatCurrency(String(value.price)) : value.totalRevenue ? formatCurrency(String(value.totalRevenue)) : value.discountValue ? `${String(value.discountValue)} off` : value.seats ? `${String(value.seats)} seats` : ""}
              </td>
              <td style={{ padding: 14, textAlign: "right" }}>
                {resource === "tables" && value.id ? (
                  <button
                    className="app-button secondary"
                    onClick={async () => {
                      await fetch(`/api/tables/${String(value.id)}/qr`, { method: "POST" });
                      onRefresh();
                    }}
                  >
                    <QrCode size={15} />
                    QR
                  </button>
                ) : (
                  <span className="badge" style={{ background: "rgba(79,140,255,0.14)", color: "#9cc0ff" }}>Active</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
