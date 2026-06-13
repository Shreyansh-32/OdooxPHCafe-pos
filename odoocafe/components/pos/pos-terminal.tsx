"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  Table2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { useSocket } from "@/components/providers/socket-provider";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  taxRate: string | number;
  isAvailable: boolean;
  category: { id: string; name: string; color: string };
};

type Category = { id: string; name: string; color: string };
type Table = {
  id: string;
  tableNumber: string;
  seats: number;
  floor: { name: string };
  orders: { id: string; status: string; orderNumber: number }[];
};
type Session = { id: string; closedAt: string | null };
type PaymentMethod = { id: string; name: string; type: "CASH" | "UPI" | "CARD" };
type ActiveOrder = { id: string; orderNumber: number; grandTotal: string | number };

export function POSTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("");

  const cart = useCartStore();
  const { isConnected } = useSocket();

  const openSession = sessions.find((session) => !session.closedAt);

  async function loadData() {
    setLoading(true);
    const [productData, categoryData, tableData, sessionData, methodData] = await Promise.all([
      fetch("/api/products").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
      fetch("/api/tables").then((res) => res.json()),
      fetch("/api/sessions").then((res) => res.json()).catch(() => []),
      fetch("/api/payment-methods").then((res) => res.json()).catch(() => []),
    ]);
    setProducts(Array.isArray(productData) ? productData : []);
    setCategories(Array.isArray(categoryData) ? categoryData : []);
    setTables(Array.isArray(tableData) ? tableData : []);
    setSessions(Array.isArray(sessionData) ? sessionData : []);
    setPaymentMethods(Array.isArray(methodData) ? methodData : []);
    setPaymentMethodId(Array.isArray(methodData) && methodData[0]?.id ? methodData[0].id : "");
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData().catch((error) => {
        setStatus(error.message);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = !selectedCategory || product.category.id === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch && product.isAvailable;
    });
  }, [products, search, selectedCategory]);

  async function openPosSession() {
    setSubmitting(true);
    setStatus("");
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingAmount: 0 }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Could not open session.");
    } else {
      setSessions((current) => [data, ...current]);
      setStatus("Session opened.");
    }
    setSubmitting(false);
  }

  async function sendToKitchen() {
    if (!openSession || cart.items.length === 0) return;
    setSubmitting(true);
    setStatus("");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "CASHIER",
          tableId: selectedTableId || undefined,
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || "Order creation failed.");

      for (const item of cart.items) {
        const itemResponse = await fetch(`/api/orders/${order.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes || undefined,
          }),
        });
        const itemData = await itemResponse.json();
        if (!itemResponse.ok) throw new Error(itemData.error || "Could not add item.");
      }

      const sentResponse = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      const sentOrder = await sentResponse.json();
      if (!sentResponse.ok) throw new Error(sentOrder.error || "Could not send order.");

      setActiveOrder({
        id: sentOrder.id,
        orderNumber: sentOrder.orderNumber,
        grandTotal: sentOrder.grandTotal,
      });
      cart.clearCart();
      setStatus(`Order #${sentOrder.orderNumber} sent to kitchen.`);
      loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Order failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function recordPayment() {
    if (!activeOrder || !paymentMethodId) return;
    setSubmitting(true);
    setStatus("");
    const response = await fetch(`/api/orders/${activeOrder.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        methodId: paymentMethodId,
        amount: Number(activeOrder.grandTotal),
        transactionRef: `POS-${Date.now()}`,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Payment failed.");
    } else {
      setStatus(`Payment captured. Order is ${data.orderStatus}.`);
      setActiveOrder(null);
      loadData();
    }
    setSubmitting(false);
  }

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "280px 1fr 380px" }}>
      <section style={{ borderRight: "1px solid var(--color-border)", background: "var(--color-bg-elevated)", overflow: "auto" }}>
        <Header title="Tables" subtitle={`${tables.length} configured`} icon={<Table2 size={18} />} />
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          {tables.map((table) => {
            const busy = table.orders.length > 0;
            const selected = selectedTableId === table.id;
            return (
              <button
                key={table.id}
                onClick={() => setSelectedTableId(selected ? "" : table.id)}
                style={{
                  justifyContent: "space-between",
                  border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: selected ? "rgba(200,121,65,0.14)" : "var(--color-bg-overlay)",
                  color: "var(--color-text)",
                  padding: 12,
                }}
              >
                <span>
                  <strong>{table.tableNumber}</strong>
                  <span style={{ display: "block", color: "var(--color-text-faint)", fontSize: 12 }}>
                    {table.floor.name} · {table.seats} seats
                  </span>
                </span>
                <span className="badge" style={{ color: busy ? "#fbbf24" : "#4ade80", background: busy ? "rgba(245,158,11,0.14)" : "rgba(34,197,94,0.14)" }}>
                  {busy ? "Active" : "Free"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>POS Terminal</h1>
          <span style={{ marginLeft: "auto", color: isConnected ? "#4ade80" : "#f87171", display: "inline-flex", gap: 6, alignItems: "center" }}>
            {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>

        {!openSession && (
          <div style={{ padding: 16, borderBottom: "1px solid var(--color-border)" }}>
            <button className="app-button" onClick={openPosSession} disabled={submitting}>
              <ReceiptText size={16} />
              Open POS Session
            </button>
          </div>
        )}

        <div style={{ padding: 16, display: "flex", gap: 10, borderBottom: "1px solid var(--color-border-muted)" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--color-text-faint)" }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" style={{ paddingLeft: 38 }} />
          </div>
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, alignContent: "start" }}>
          {loading ? (
            <p className="muted">Loading menu...</p>
          ) : (
            visibleProducts.map((product) => (
              <button
                key={product.id}
                onClick={() =>
                  cart.addItem({
                    productId: product.id,
                    name: product.name,
                    price: Number(product.price),
                    taxRate: Number(product.taxRate),
                  })
                }
                className="surface"
                style={{ minHeight: 126, alignItems: "stretch", flexDirection: "column", textAlign: "left", color: "var(--color-text)", padding: 14 }}
              >
                <span style={{ color: product.category.color, fontSize: 12, fontWeight: 800 }}>{product.category.name}</span>
                <strong style={{ fontSize: 15, lineHeight: 1.25 }}>{product.name}</strong>
                <span style={{ color: "var(--color-text-muted)", fontSize: 12, flex: 1 }}>{product.description || "Ready to add"}</span>
                <span style={{ color: "var(--color-primary)", fontWeight: 800 }}>{formatCurrency(product.price)}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside style={{ borderLeft: "1px solid var(--color-border)", background: "var(--color-bg-elevated)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Header title="Current Order" subtitle={`${cart.totalItems()} items`} icon={<ShoppingCart size={18} />} />
        <div style={{ flex: 1, overflow: "auto", padding: 12, display: "grid", gap: 10, alignContent: "start" }}>
          {cart.items.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", marginTop: 48 }}>Select products to start an order.</p>
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="surface" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <strong>{item.name}</strong>
                  <button className="app-button danger" style={{ minHeight: 28, padding: 6 }} onClick={() => cart.removeItem(item.productId)}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className="app-button secondary" style={{ minHeight: 28, padding: 6 }} onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}>
                      <Minus size={13} />
                    </button>
                    <strong style={{ minWidth: 22, textAlign: "center" }}>{item.quantity}</strong>
                    <button className="app-button secondary" style={{ minHeight: 28, padding: 6 }} onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(item.price * item.quantity)}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--color-border)", display: "grid", gap: 10 }}>
          <TotalRow label="Subtotal" value={cart.subtotal()} />
          <TotalRow label="Tax" value={cart.taxTotal()} />
          <TotalRow label="Total" value={cart.grandTotal()} strong />
          <button className="app-button" onClick={sendToKitchen} disabled={!openSession || cart.items.length === 0 || submitting}>
            <Send size={16} />
            Send to Kitchen
          </button>
          {activeOrder && (
            <div className="surface" style={{ padding: 12, display: "grid", gap: 10 }}>
              <strong>Bill #{activeOrder.orderNumber}: {formatCurrency(activeOrder.grandTotal)}</strong>
              <select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>{method.name}</option>
                ))}
              </select>
              <button className="app-button" onClick={recordPayment} disabled={submitting || !paymentMethodId}>
                {paymentMethods.find((method) => method.id === paymentMethodId)?.type === "CASH" ? <Banknote size={16} /> : <CreditCard size={16} />}
                Capture Payment
              </button>
            </div>
          )}
          {status && (
            <p style={{ margin: 0, color: status.includes("failed") || status.includes("Could") ? "#fca5a5" : "#9ae6b4" }}>
              <CheckCircle2 size={14} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
              {status}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div style={{ padding: 16, borderBottom: "1px solid var(--color-border)", display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ color: "var(--color-primary)" }}>{icon}</span>
      <div>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--color-text-faint)", fontSize: 12 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: strong ? "var(--color-text)" : "var(--color-text-muted)", fontSize: strong ? 18 : 13, fontWeight: strong ? 800 : 500 }}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
