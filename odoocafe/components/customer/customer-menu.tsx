"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, Trash2, Send, Clock, CheckCircle2, ChefHat, CreditCard, X } from "lucide-react";
import { CustomerPaymentSheet } from "@/components/customer/customer-payment-sheet";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
  category: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
  notes?: string;
}

interface OrderStatus {
  orderId: string;
  orderNumber: number;
  status: string;
  items: { productName: string; quantity: number; kdsStatus: string }[];
  grandTotal: number;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string;
}

interface Props {
  tableId: string;
  tableNumber: string;
  floorName: string;
  customer: CustomerSession;
}

const KDS_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Queued",     color: "#9ca3af" },
  TO_COOK:   { label: "Starting",   color: "#fbbf24" },
  PREPARING: { label: "Cooking",    color: "#60a5fa" },
  COMPLETED: { label: "Ready",      color: "#4ade80" },
};

export function CustomerMenu({ tableId, tableNumber, floorName, customer }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderStatus | null>(null);
  const [view, setView] = useState<"menu" | "status">("menu");
  const { socket } = useSocket();

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([p, c]) => {
      setProducts(p.data || []);
      setCategories(c.data || []);
    });

    // Check for existing order
    fetch(`/api/orders?tableId=${tableId}&status=SENT`).then((r) => r.json()).then((d) => {
      if (d.ok && d.data?.length > 0) {
        const o = d.data[0];
        setActiveOrder({
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          grandTotal: Number(o.grandTotal),
          items: o.items.map((i: any) => ({
            productName: i.product.name,
            quantity: i.quantity,
            kdsStatus: i.kdsStatus,
          })),
        });
        setView("status");
      }
    });
  }, [tableId]);

  // Socket for live order updates
  useEffect(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.JOIN_TABLE, tableId);

    socket.on(SOCKET_EVENTS.ORDER_STATUS, (payload: any) => {
      if (activeOrder && payload.orderId === activeOrder.orderId) {
        setActiveOrder((prev) => prev ? { ...prev, status: payload.status } : null);
      }
    });

    socket.on(SOCKET_EVENTS.KDS_ITEM_UPDATED, (payload: any) => {
      setActiveOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.productName === payload.productName ? { ...i, kdsStatus: payload.kdsStatus } : i
          ),
        };
      });
    });

    socket.on(SOCKET_EVENTS.PAYMENT_RECEIVED, (payload: any) => {
      if (activeOrder && payload.orderId === activeOrder.orderId) {
        setActiveOrder((prev) => prev ? { ...prev, status: "PAID" } : null);
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS);
      socket.off(SOCKET_EVENTS.KDS_ITEM_UPDATED);
      socket.off(SOCKET_EVENTS.PAYMENT_RECEIVED);
    };
  }, [socket, tableId, activeOrder]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id);
      if (ex) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), taxRate: Number(product.taxRate), quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.productId !== productId));
    else setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartTax = cart.reduce((sum, i) => sum + i.price * i.quantity * (i.taxRate / 100), 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const placeOrder = async () => {
    // Now just opens the payment sheet
    setShowCart(false);
    setShowPayment(true);
  };

  const filteredProducts = products.filter(
    (p) => !selectedCat || p.category.id === selectedCat
  );

  const styleVars = {
    bg: "#0f0f13",
    card: "#1a1a24",
    border: "#2a2a3a",
    primary: "#c87941",
    text: "#f0eee8",
    muted: "#8a8a9a",
  };

  return (
    <div style={{ minHeight: "100vh", background: styleVars.bg, color: styleVars.text, fontFamily: "inherit" }}>
      {/* Mobile Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,15,19,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${styleVars.border}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: styleVars.text }}>☕ Café Odoo</div>
          <div style={{ fontSize: "12px", color: styleVars.muted }}>{floorName} · Table {tableNumber} · {customer.name}</div>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: "6px" }}>
          {activeOrder && (
            <button
              id="view-status-btn"
              onClick={() => setView("status")}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: view === "status" ? "rgba(200,121,65,0.2)" : "transparent",
                border: `1px solid ${view === "status" ? "#c87941" : styleVars.border}`,
                color: view === "status" ? "#c87941" : styleVars.muted,
              }}
            >
              <ChefHat size={13} /> Order
            </button>
          )}
          <button
            id="view-menu-btn"
            onClick={() => setView("menu")}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background: view === "menu" ? "rgba(200,121,65,0.2)" : "transparent",
              border: `1px solid ${view === "menu" ? "#c87941" : styleVars.border}`,
              color: view === "menu" ? "#c87941" : styleVars.muted,
            }}
          >
            Menu
          </button>
          {cartCount > 0 && view === "menu" && (
            <button
              id="show-cart-btn"
              onClick={() => setShowCart(true)}
              style={{ padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", background: styleVars.primary, color: "#fff", border: "none" }}
            >
              <ShoppingCart size={13} /> {cartCount}
            </button>
          )}
        </div>
      </div>

      {/* ===== ORDER STATUS VIEW ===== */}
      {view === "status" && activeOrder && (
        <div style={{ padding: "20px 16px", maxWidth: "500px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>
              {activeOrder.status === "PAID" ? "✅" : activeOrder.status === "SENT" ? "👨‍🍳" : "⏳"}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800" }}>
              Order #{activeOrder.orderNumber}
            </h2>
            <div style={{ display: "inline-flex", padding: "4px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: "700", background: activeOrder.status === "PAID" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: activeOrder.status === "PAID" ? "#4ade80" : "#fbbf24" }}>
              {activeOrder.status === "PAID" ? "Paid ✓" : "In Kitchen"}
            </div>
          </div>

          {/* Item status list */}
          <div style={{ background: styleVars.card, border: `1px solid ${styleVars.border}`, borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
            {activeOrder.items.map((item, idx) => {
              const s = KDS_STATUS_LABEL[item.kdsStatus] || { label: item.kdsStatus, color: "#9ca3af" };
              return (
                <div key={idx} style={{ padding: "12px 16px", borderBottom: idx < activeOrder.items.length - 1 ? `1px solid ${styleVars.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px" }}>×{item.quantity} {item.productName}</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: s.color, background: `${s.color}20`, padding: "3px 10px", borderRadius: "999px" }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ background: styleVars.card, border: `1px solid ${styleVars.border}`, borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px" }}>
              <span>Total</span>
              <span style={{ color: styleVars.primary }}>{formatCurrency(activeOrder.grandTotal)}</span>
            </div>
            {activeOrder.status !== "PAID" && (
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: styleVars.muted }}>Payment will be processed by your server or at the counter.</p>
            )}
          </div>

          <button
            id="add-more-btn"
            onClick={() => setView("menu")}
            style={{ width: "100%", padding: "13px", borderRadius: "12px", background: "transparent", border: `1px solid ${styleVars.border}`, color: styleVars.muted, fontWeight: "600", justifyContent: "center" }}
          >
            Browse Menu
          </button>
        </div>
      )}

      {/* ===== MENU VIEW ===== */}
      {view === "menu" && (
        <div style={{ paddingBottom: "120px" }}>
          {/* Category tabs */}
          <div style={{ padding: "12px 16px", display: "flex", gap: "8px", overflowX: "auto", borderBottom: `1px solid ${styleVars.border}` }}>
            <button
              id="menu-cat-all"
              onClick={() => setSelectedCat(null)}
              style={{ padding: "7px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", background: !selectedCat ? styleVars.primary : "transparent", color: !selectedCat ? "#fff" : styleVars.muted, border: `1px solid ${!selectedCat ? styleVars.primary : styleVars.border}`, flexShrink: 0 }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`menu-cat-${cat.id}`}
                onClick={() => setSelectedCat(cat.id === selectedCat ? null : cat.id)}
                style={{ padding: "7px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", background: selectedCat === cat.id ? `${cat.color}22` : "transparent", color: selectedCat === cat.id ? cat.color : styleVars.muted, border: `1px solid ${selectedCat === cat.id ? cat.color + "44" : styleVars.border}`, flexShrink: 0 }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products */}
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <div
                  key={product.id}
                  style={{ background: styleVars.card, border: `1px solid ${styleVars.border}`, borderRadius: "14px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: product.category.color, fontWeight: "700", marginBottom: "2px" }}>{product.category.name}</div>
                    <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "2px" }}>{product.name}</div>
                    {product.description && <div style={{ fontSize: "12px", color: styleVars.muted }}>{product.description}</div>}
                    <div style={{ fontSize: "16px", fontWeight: "800", color: styleVars.primary, marginTop: "6px" }}>{formatCurrency(Number(product.price))}</div>
                  </div>
                  <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                    {inCart ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button id={`dec-${product.id}`} onClick={() => updateQty(product.id, inCart.quantity - 1)} style={{ width: "30px", height: "30px", borderRadius: "8px", background: styleVars.border, color: styleVars.text, padding: 0, justifyContent: "center", border: "none" }}><Minus size={13} /></button>
                        <span style={{ fontWeight: "700", fontSize: "16px", minWidth: "20px", textAlign: "center" }}>{inCart.quantity}</span>
                        <button id={`inc-${product.id}`} onClick={() => addToCart(product)} style={{ width: "30px", height: "30px", borderRadius: "8px", background: styleVars.primary, color: "#fff", padding: 0, justifyContent: "center", border: "none" }}><Plus size={13} /></button>
                      </div>
                    ) : (
                      <button id={`add-${product.id}`} onClick={() => addToCart(product)} style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${styleVars.primary}22`, color: styleVars.primary, border: `1px solid ${styleVars.primary}44`, padding: 0, justifyContent: "center" }}>
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart bottom bar */}
      {cartCount > 0 && view === "menu" && !showCart && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: "rgba(15,15,19,0.98)", backdropFilter: "blur(12px)", borderTop: `1px solid ${styleVars.border}` }}>
          <button
            id="view-cart-bottom"
            onClick={() => setShowCart(true)}
            style={{ width: "100%", padding: "15px", borderRadius: "12px", background: `linear-gradient(135deg, ${styleVars.primary}, #a06030)`, color: "#fff", fontWeight: "700", fontSize: "16px", justifyContent: "space-between", boxShadow: "0 8px 24px rgba(200,121,65,0.3)" }}
          >
            <span style={{ background: "rgba(0,0,0,0.2)", padding: "2px 10px", borderRadius: "999px" }}>{cartCount}</span>
            <span>View Cart</span>
            <span>{formatCurrency(cartTotal + cartTax)}</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} onClick={() => setShowCart(false)} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: styleVars.card, borderRadius: "20px 20px 0 0", padding: "20px", maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>Your Cart</h3>
              <button onClick={() => setShowCart(false)} style={{ background: styleVars.border, color: styleVars.muted, padding: "8px", borderRadius: "8px" }}><X size={16} /></button>
            </div>
            {cart.map((item) => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${styleVars.border}` }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.name}</div>
                  <div style={{ fontSize: "13px", color: styleVars.primary }}>{formatCurrency(item.price)} ea.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button id={`cart-dec-${item.productId}`} onClick={() => updateQty(item.productId, item.quantity - 1)} style={{ width: "28px", height: "28px", borderRadius: "7px", background: styleVars.border, color: styleVars.text, padding: 0, justifyContent: "center", border: "none" }}><Minus size={12} /></button>
                  <span style={{ fontWeight: "700" }}>{item.quantity}</span>
                  <button id={`cart-inc-${item.productId}`} onClick={() => updateQty(item.productId, item.quantity + 1)} style={{ width: "28px", height: "28px", borderRadius: "7px", background: styleVars.primary, color: "#fff", padding: 0, justifyContent: "center", border: "none" }}><Plus size={12} /></button>
                </div>
              </div>
            ))}
            <div style={{ padding: "16px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: styleVars.muted, marginBottom: "4px" }}><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: styleVars.muted, marginBottom: "12px" }}><span>Tax</span><span>{formatCurrency(cartTax)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800", marginBottom: "20px" }}><span>Total</span><span style={{ color: styleVars.primary }}>{formatCurrency(cartTotal + cartTax)}</span></div>
              <button
                id="place-order-btn"
                onClick={placeOrder}
                disabled={submitting}
                style={{ width: "100%", padding: "15px", borderRadius: "12px", background: submitting ? "#5a3a20" : `linear-gradient(135deg, ${styleVars.primary}, #a06030)`, color: "#fff", fontWeight: "700", fontSize: "16px", justifyContent: "center", boxShadow: "0 8px 24px rgba(200,121,65,0.3)" }}
              >
                <Send size={16} />
                {submitting ? "Sending order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* ── Payment Sheet ── */}
      {showPayment && (
        <CustomerPaymentSheet
          tableId={tableId}
          cart={cart}
          grandTotal={cartTotal + cartTax}
          subtotal={cartTotal}
          taxTotal={cartTax}
          customerName={customer.name}
          onSuccess={async (orderId, orderNumber, paymentMethod) => {
            setShowPayment(false);
            // Fetch full order for tracking
            const res = await fetch(`/api/orders/${orderId}`);
            const data = await res.json();
            if (data.ok) {
              setActiveOrder({
                orderId,
                orderNumber,
                status: "SENT",
                grandTotal: Number(data.data.grandTotal),
                items: data.data.items.map((i: any) => ({
                  productName: i.product.name,
                  quantity: i.quantity,
                  kdsStatus: i.kdsStatus,
                })),
              });
            }
            setCart([]);
            setView("status");
          }}
          onBack={() => {
            setShowPayment(false);
            setShowCart(true);
          }}
        />
      )}
    </div>
  );
}
