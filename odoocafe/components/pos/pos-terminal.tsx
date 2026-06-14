"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  Users,
  MapPin,
  ShoppingBag,
  ArrowLeft,
  Check
} from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptPrinter } from "@/components/shared/receipt-printer";

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

interface Floor {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { tables: number };
}

interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  floorId: string;
  floor?: { id: string; name: string };
  orders?: { id: string; status: string; grandTotal: number }[];
}

function CollapsibleFloor({
  floor,
  tables,
  isOpen,
  onToggle,
  onSelectTable,
  selectedTableId,
  handleFreeTable,
  isFreeing,
}: {
  floor: Floor;
  tables: Table[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectTable: (tableId: string) => void;
  selectedTableId: string;
  handleFreeTable: (tableId: string) => void;
  isFreeing: boolean;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--color-border)", marginBottom: "8px" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--color-bg-overlay)",
          border: "none",
          textAlign: "left",
          borderRadius: "8px",
          color: "var(--color-text)",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: "600", fontSize: "15px" }}>{floor.name}</span>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            ({tables.length} tables)
          </span>
        </div>
        <div>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "16px 8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "10px",
              }}
            >
              {tables.map((table) => {
                const hasActiveOrder = !!(table.orders && table.orders.length > 0);
                const activeOrder = table.orders?.[0] || null;
                const isSelected = selectedTableId === table.id;

                return (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                      background: isSelected
                        ? "rgba(180, 107, 122, 0.1)"
                        : "var(--color-bg-elevated)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      position: "relative",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: "700" }}>
                      T-{table.tableNumber}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <Users size={10} /> {table.seats} seats
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        marginTop: "6px",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "999px",
                        fontWeight: "600",
                        background: hasActiveOrder
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                        color: hasActiveOrder ? "#f59e0b" : "#4ade80",
                      }}
                    >
                      {hasActiveOrder ? "Occupied" : "Available"}
                    </span>

                    {hasActiveOrder && activeOrder && (
                      <span style={{ fontSize: "10px", color: "var(--color-primary)", fontWeight: "600", marginTop: "2px" }}>
                        {formatCurrency(Number(activeOrder.grandTotal))}
                      </span>
                    )}

                    {hasActiveOrder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFreeing) return;
                          handleFreeTable(table.id);
                        }}
                        style={{
                          marginTop: "8px",
                          fontSize: "10px",
                          fontWeight: "600",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        Free Table
                      </button>
                    )}
                  </div>
                );
              })}
              {tables.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--color-text-faint)",
                    fontSize: "13px",
                  }}
                >
                  No active tables on this floor
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function POSTerminal() {
  const [step, setStep] = useState<"TABLE_SELECTION" | "MENU">("TABLE_SELECTION");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; type: string }[]>([]);
  const [receipt, setReceipt] = useState<{
    orderId: string;
    orderNumber: number;
    paymentMethod: string;
    snapshotItems: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
    snapshotSubtotal: number;
    snapshotTax: number;
    snapshotGrandTotal: number;
  } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const { items, addItem, removeItem, updateQuantity, clearCart, subtotal, taxTotal, grandTotal, totalItems } = useCartStore();
  const { socket, isConnected } = useSocket();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/floors").then((r) => r.json()),
    ]).then(([prod, cat, sess, tbls, flrs]) => {
      setProducts(prod.data || []);
      setCategories(cat.data || []);
      setTables(tbls.data || []);
      setFloors(flrs.data || []);
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

  // Real-time updates for table occupancy status
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_CASHIER);

    const handleRefresh = async () => {
      try {
        const tblsRes = await fetch("/api/tables");
        const tblsData = await tblsRes.json();
        if (tblsData.ok) {
          setTables(tblsData.data || []);
        }
      } catch (err) {
        console.error("Failed to refresh tables:", err);
      }
    };

    socket.on(SOCKET_EVENTS.ORDER_STATUS, handleRefresh);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleRefresh);
    socket.on(SOCKET_EVENTS.PAYMENT_RECEIVED, handleRefresh);
    socket.on(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleRefresh);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS, handleRefresh);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleRefresh);
      socket.off(SOCKET_EVENTS.PAYMENT_RECEIVED, handleRefresh);
      socket.off(SOCKET_EVENTS.KDS_ORDER_COMPLETE, handleRefresh);
    };
  }, [socket]);


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

  const [isFreeing, setIsFreeing] = useState(false);

  const handleFreeTable = async (tableId: string) => {
    setIsFreeing(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/free`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Table freed successfully");
        // Refresh tables
        const tblsRes = await fetch("/api/tables");
        const tblsData = await tblsRes.json();
        if (tblsData.ok) {
          setTables(tblsData.data || []);
        }
      } else {
        toast.error(data.error || "Failed to free table");
      }
    } catch (err) {
      toast.error("Failed to free table");
    } finally {
      setIsFreeing(false);
    }
  };

  const changeTable = (newTableId: string) => {
    if (selectedTableId !== newTableId) {
      clearCart();
    }
    setSelectedTableId(newTableId);
    setIsTableModalOpen(false);
    setStep("MENU");
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const hasActiveOrders = selectedTable && selectedTable.orders && selectedTable.orders.length > 0;

  // Render modal for table selection
  const renderTableModal = () => {
    return (
      <AnimatePresence>
        {isTableModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: "90%",
                maxWidth: "600px",
                maxHeight: "80vh",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "12px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                    Select Table
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Choose a table to begin taking order items.
                  </p>
                </div>
                <button
                  onClick={() => setIsTableModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-muted)",
                    padding: "6px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-bg-overlay)";
                    e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                {floors.map((floor) => {
                  const floorTables = tables.filter((t) => t.floorId === floor.id);
                  const isOpen = selectedFloorId === floor.id;
                  return (
                    <CollapsibleFloor
                      key={floor.id}
                      floor={floor}
                      tables={floorTables}
                      isOpen={isOpen}
                      onToggle={() => setSelectedFloorId(isOpen ? null : floor.id)}
                      onSelectTable={changeTable}
                      selectedTableId={selectedTableId}
                      handleFreeTable={handleFreeTable}
                      isFreeing={isFreeing}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  if (step === "TABLE_SELECTION") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text)",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            maxWidth: "1000px",
            width: "100%",
            margin: "0 auto 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              ☕ <span className="gradient-text">CafePOS Terminal</span>
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
              Select a floor layout to view tables or place a direct counter order.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "600",
              color: isConnected ? "#22c55e" : "#ef4444",
              background: isConnected ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              padding: "4px 12px",
              borderRadius: "999px",
            }}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? "Live" : "Offline"}
          </div>
        </div>

        {/* Dashboard Content */}
        <div
          style={{
            maxWidth: "1000px",
            width: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          {/* Quick Actions (Takeaway) */}
          <div>
            <h3 style={{ fontSize: "16px", color: "var(--color-text-muted)", marginBottom: "12px", fontWeight: "600" }}>
              Quick Service
            </h3>
            <button
              onClick={() => changeTable("")}
              style={{
                width: "100%",
                maxWidth: "320px",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "8px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = "1px solid var(--color-primary)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = "1px solid var(--color-border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <ShoppingBag size={20} />
              </div>
              <div style={{ marginTop: "12px" }}>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>
                  Takeaway / Quick Order
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
                  Create direct counter order without assigning a table.
                </p>
              </div>
            </button>
          </div>

          {/* Floors Section */}
          <div>
            <h3 style={{ fontSize: "16px", color: "var(--color-text-muted)", marginBottom: "16px", fontWeight: "600" }}>
              Floor Layouts
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {floors.map((floor) => {
                const floorTables = tables.filter((t) => t.floorId === floor.id);
                const occupiedCount = floorTables.filter((t) => t.orders && t.orders.length > 0).length;

                return (
                  <button
                    key={floor.id}
                    onClick={() => {
                      setSelectedFloorId(floor.id);
                      setIsTableModalOpen(true);
                    }}
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "16px",
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: "rgba(180, 107, 122, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Layers size={20} />
                    </div>
                    <div>
                      <span style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>
                        {floor.name}
                      </span>
                      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                        <span style={{ fontSize: "13px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Users size={12} /> {floorTables.length} Tables
                        </span>
                        {occupiedCount > 0 && (
                          <span style={{ fontSize: "13px", color: "var(--color-warning)", fontWeight: "600" }}>
                            {occupiedCount} Occupied
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Overlay rendered here */}
        {renderTableModal()}

      </div>
    );
  }

  // Otherwise, render MENU view
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Image src="/CafePOS.png" alt="CafePOS Logo" width={28} height={28} style={{ objectFit: "contain" }} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
              Menu
            </h2>
          </div>
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

        {/* Table Banner */}
        <div
          style={{
            padding: "10px 16px",
            background: "var(--color-bg-overlay)",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "var(--color-text)" }}>
            <MapPin size={14} color="var(--color-primary)" />
            {selectedTableId && selectedTable ? (
              <span>
                Table {selectedTable.tableNumber} ({selectedTable.floor?.name || "Floor"})
              </span>
            ) : (
              <span>Takeaway / Quick Order</span>
            )}
          </div>
          <button
            onClick={() => setStep("TABLE_SELECTION")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-primary)",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Switch Table
          </button>
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
              cursor: "pointer",
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
                cursor: "pointer",
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
                border: `1px solid ${product.category.color ? product.category.color + "33" : "var(--color-border)"}`,
                borderRadius: "12px",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = product.category.color || "var(--color-primary)";
                e.currentTarget.style.background = "var(--color-bg-overlay)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = product.category.color ? product.category.color + "33" : "var(--color-border)";
                e.currentTarget.style.background = "var(--color-bg-elevated)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
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
                  color: product.category.color || "var(--color-primary)",
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
                  background: product.category.color || "var(--color-primary)",
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
          {mounted && totalItems() > 0 && (
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

        {/* Table Selection - Read Only display */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            color: "var(--color-text-muted)",
          }}
        >
          <span>Serving Target:</span>
          <span style={{ fontWeight: "700", color: "var(--color-text)" }}>
            {selectedTableId && selectedTable
              ? `Table ${selectedTable.tableNumber}`
              : "Takeaway / Counter"}
          </span>
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
                        cursor: "pointer",
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
                          cursor: "pointer",
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
                          cursor: "pointer",
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
              {/* Checkout (pay-first for counter customers) */}
              <button
                id="checkout-pay-btn"
                onClick={() => setShowCheckout(true)}
                disabled={items.length === 0}
                style={{
                  background: "linear-gradient(135deg, #B46B7A, #5A2D34)",
                  color: "#fff",
                  padding: "13px",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(180, 107, 122, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <CreditCard size={16} />
                Checkout &amp; Pay
              </button>

              <button
                id="clear-cart-btn"
                onClick={() => {
                  clearCart();
                  setSelectedTableId("");
                  setStep("TABLE_SELECTION");
                }}
                style={{
                  background: "transparent",
                  color: "var(--color-text-faint)",
                  padding: "10px",
                  justifyContent: "center",
                  fontSize: "13px",
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Clear Order
              </button>
            </div>
          </div>
        )}


      </div>

      {/* ── Checkout Payment Dialog ── */}
      {showCheckout && (
        <PaymentDialog
          grandTotal={grandTotal()}
          subtotal={subtotal()}
          taxTotal={taxTotal()}
          items={items}
          tableId={selectedTableId || null}
          onSuccess={async (orderId, method) => {
            // Capture snapshot BEFORE clearing cart
            const snap = {
              items: items.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.price,
                lineTotal: i.price * i.quantity,
              })),
              subtotal: subtotal(),
              tax: taxTotal(),
              grand: grandTotal(),
            };
            setShowCheckout(false);
            const res = await fetch(`/api/orders/${orderId}`);
            const data = await res.json();
            if (data.ok) {
              setReceipt({
                orderId,
                orderNumber: data.data.orderNumber,
                paymentMethod: method,
                snapshotItems: snap.items,
                snapshotSubtotal: snap.subtotal,
                snapshotTax: snap.tax,
                snapshotGrandTotal: snap.grand,
              });
            }
            clearCart();
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* ── Receipt Printer ── */}
      {receipt && (
        <ReceiptPrinter
          orderNumber={receipt.orderNumber}
          items={receipt.snapshotItems}
          subtotal={receipt.snapshotSubtotal}
          taxTotal={receipt.snapshotTax}
          discountTotal={0}
          grandTotal={receipt.snapshotGrandTotal}
          paymentMethod={receipt.paymentMethod}
          paidAt={new Date()}
          onClose={() => {
            setReceipt(null);
          }}
        />
      )}
    </div>
  );
}
