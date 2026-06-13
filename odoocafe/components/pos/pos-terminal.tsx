"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, CreditCard, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxRate: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export function POSTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; type: string }[]>([]);
  const [tables, setTables] = useState<{ id: string; tableNumber: string }[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const { items, addItem, removeItem, updateQuantity, clearCart, subtotal, taxTotal, grandTotal, totalItems } = useCartStore();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/tables").then((r) => r.json()),
    ]).then(([prod, cat, sess, tbls]) => {
      setProducts(prod.data || []);
      setCategories(cat.data || []);
      setTables(tbls.data || []);
    });

    // Fetch payment methods
    fetch("/api/payment-methods").then((r) => r.json()).then((d) => {
      if (d.ok) setPaymentMethods(d.data || []);
    }).catch(() => {
      setPaymentMethods([
        { id: "pm-cash", name: "Cash", type: "CASH" },
        { id: "pm-upi", name: "UPI / QR", type: "UPI" },
        { id: "pm-card", name: "Credit/Debit Card", type: "CARD" },
      ]);
    });
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || p.category.id === selectedCategory;
    return matchesSearch && matchesCat && p.isAvailable;
  });

  const handleAddProduct = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      taxRate: Number(product.taxRate),
      imageUrl: product.imageUrl,
    });
  };

  const handleSendToKitchen = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "CASHIER", tableId: selectedTableId || null }),
      });
      const orderData = await orderRes.json();
      const orderId = orderData.data.id;

      // Add items
      for (const item of items) {
        await fetch(`/api/orders/${orderId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          }),
        });
      }

      // Send to kitchen
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });

      setActiveOrderId(orderId);
      clearCart();
      setSelectedTableId("");
    } catch (err) {
      console.error(err);
    }

    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-bg)",
      }}
    >
      {/* === LEFT: Menu Panel === */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-elevated)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
            ☕ Menu
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginLeft: "auto",
              fontSize: "12px",
              color: isConnected ? "#22c55e" : "#ef4444",
            }}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
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
              id="pos-search"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>

        {/* Categories */}
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <button
            id="cat-all"
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "6px 16px",
              borderRadius: "999px",
              background: !selectedCategory
                ? "var(--color-primary)"
                : "var(--color-bg-overlay)",
              color: !selectedCategory ? "#fff" : "var(--color-text-muted)",
              fontSize: "13px",
              fontWeight: "500",
              flexShrink: 0,
              border: "1px solid transparent",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                background:
                  selectedCategory === cat.id
                    ? `${cat.color}22`
                    : "var(--color-bg-overlay)",
                color:
                  selectedCategory === cat.id ? cat.color : "var(--color-text-muted)",
                border: `1px solid ${selectedCategory === cat.id ? cat.color + "44" : "transparent"}`,
                fontSize: "13px",
                fontWeight: "500",
                flexShrink: 0,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
            alignContent: "start",
          }}
        >
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              id={`product-${product.id}`}
              onClick={() => handleAddProduct(product)}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.background = "var(--color-bg-overlay)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-bg-elevated)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: product.category.color || "var(--color-primary)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                }}
              >
                {product.category.name}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--color-text)",
                  lineHeight: "1.3",
                }}
              >
                {product.name}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--color-primary)",
                  marginTop: "4px",
                }}
              >
                {formatCurrency(Number(product.price))}
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.7,
                }}
              >
                <Plus size={12} color="#fff" />
              </div>
            </button>
          ))}

          {filteredProducts.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--color-text-faint)",
              }}
            >
              No products found
            </div>
          )}
        </div>
      </div>

      {/* === RIGHT: Cart === */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          background: "var(--color-bg-elevated)",
        }}
      >
        {/* Cart Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ShoppingCart size={18} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
            Current Order
          </h3>
          {totalItems() > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {totalItems()}
            </span>
          )}
        </div>

        {/* Table Selection */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-muted)" }}>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border-muted)",
              color: "var(--color-text)",
              fontSize: "13px",
            }}
          >
            <option value="">No Table (Takeaway/Counter)</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>Table {t.tableNumber}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--color-text-faint)",
              }}
            >
              <ShoppingCart size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: "14px" }}>
                Select items from the menu
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    background: "var(--color-bg-overlay)",
                    border: "1px solid var(--color-border-muted)",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", flex: 1, paddingRight: "8px" }}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId)}
                      style={{
                        padding: "4px",
                        background: "transparent",
                        color: "var(--color-text-faint)",
                        borderRadius: "4px",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        id={`minus-${item.productId}`}
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "6px",
                          background: "var(--color-border)",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: "15px", fontWeight: "700", minWidth: "20px", textAlign: "center" }}>
                        {item.quantity}
                      </span>
                      <button
                        id={`plus-${item.productId}`}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "6px",
                          background: "var(--color-primary)",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={12} color="#fff" />
                      </button>
                    </div>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--color-primary)" }}>
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        {items.length > 0 && (
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Totals */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--color-text-muted)" }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal())}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--color-text-muted)" }}>
                <span>Tax</span>
                <span>{formatCurrency(taxTotal())}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--color-text)",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--color-border-muted)",
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--color-primary)" }}>{formatCurrency(grandTotal())}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                id="send-to-kitchen-btn"
                onClick={handleSendToKitchen}
                disabled={isSubmitting}
                style={{
                  background: "linear-gradient(135deg, #c87941, #a06030)",
                  color: "#fff",
                  padding: "13px",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(200, 121, 65, 0.3)",
                }}
              >
                <Send size={16} />
                {isSubmitting ? "Sending..." : "Send to Kitchen"}
              </button>
              <button
                id="clear-cart-btn"
                onClick={() => clearCart()}
                style={{
                  background: "transparent",
                  color: "var(--color-text-faint)",
                  padding: "10px",
                  justifyContent: "center",
                  fontSize: "13px",
                  border: "1px solid var(--color-border-muted)",
                }}
              >
                Clear Order
              </button>
            </div>
          </div>
        )}

        {/* Success message */}
        {activeOrderId && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "12px",
              padding: "16px 20px",
              color: "#4ade80",
              fontSize: "14px",
              fontWeight: "600",
              animation: "fadeIn 0.3s ease",
              zIndex: 100,
            }}
          >
            ✓ Order sent to kitchen!
          </div>
        )}
      </div>
    </div>
  );
}
