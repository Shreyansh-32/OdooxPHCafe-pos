"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, calculateChange, generateRef } from "@/lib/utils";
import { UpiQrDisplay } from "@/components/shared/upi-qr-display";
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  Loader2,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
  notes?: string;
}

interface AppliedPromo {
  id: string;
  name: string;
  code: string | null;
  discountType: string;
  discountValue: number;
  discountAmount: number;
}

interface PaymentDialogProps {
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
  items: CartItem[];
  tableId?: string | null;
  sessionId?: string | null;
  onSuccess: (orderId: string, paymentMethod: string) => void;
  onClose: () => void;
}

type PaymentTab = "cash" | "upi" | "razorpay";

export function PaymentDialog({
  grandTotal: originalGrandTotal,
  subtotal,
  taxTotal,
  items,
  tableId,
  sessionId,
  onSuccess,
  onClose,
}: PaymentDialogProps) {
  const [tab, setTab] = useState<PaymentTab>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [upiRef, setUpiRef] = useState(generateRef());
  const [upiId, setUpiId] = useState<string | null>(null);
  const [upiMethodId, setUpiMethodId] = useState<string | null>(null);
  const [cashMethodId, setCashMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [autoPromos, setAutoPromos] = useState<AppliedPromo[]>([]);

  // Computed totals with discount
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const grandTotal = Math.max(0, originalGrandTotal - discountAmount);

  const change = calculateChange(grandTotal, parseFloat(cashReceived) || 0);
  const cashInsufficient =
    cashReceived !== "" && parseFloat(cashReceived) < grandTotal;

  const sv = {
    bg: "var(--color-bg)",
    card: "var(--color-bg-elevated)",
    border: "var(--color-border)",
    primary: "var(--color-primary)",
    text: "var(--color-text)",
    muted: "var(--color-text-muted)",
  };

  // Load payment methods, Razorpay script, and auto-promotions
  useEffect(() => {
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const upiMethod = d.data.find((m: any) => m.type === "UPI");
          const cashMethod = d.data.find((m: any) => m.type === "CASH");
          if (upiMethod) {
            setUpiId(upiMethod.upiId || "cafeodoo@upi");
            setUpiMethodId(upiMethod.id);
          }
          if (cashMethod) setCashMethodId(cashMethod.id);
        }
      });

    // Load Razorpay script
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
    }

    // Fetch auto-applicable promotions
    fetch(`/api/promotions/auto?orderTotal=${originalGrandTotal}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data.length > 0) {
          setAutoPromos(d.data);
          // Auto-apply the best promotion
          const best = d.data[0];
          setAppliedPromo({
            id: best.id,
            name: best.name,
            code: null,
            discountType: best.discountType,
            discountValue: best.discountValue,
            discountAmount: best.discountAmount,
          });
          setCouponSuccess(`🎉 "${best.name}" automatically applied! Save ${formatCurrency(best.discountAmount)}`);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply promo code manually
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), orderTotal: originalGrandTotal }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCouponError(data.error || "Invalid coupon code");
        return;
      }
      setAppliedPromo({
        id: data.data.id,
        name: data.data.name,
        code: data.data.code,
        discountType: data.data.discountType,
        discountValue: data.data.discountValue,
        discountAmount: data.data.discountAmount,
      });
      setCouponSuccess(`✅ Coupon applied! Save ${formatCurrency(data.data.discountAmount)}`);
      setShowCouponInput(false);
    } catch {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, originalGrandTotal]);

  const removePromo = () => {
    setAppliedPromo(null);
    setCouponCode("");
    setCouponError(null);
    setCouponSuccess(null);
  };

  // ── Create order + items helper ──
  async function createCafeOrder(): Promise<string> {
    const body: Record<string, unknown> = { source: "CASHIER" };
    if (tableId) body.tableId = tableId;
    if (sessionId) body.sessionId = sessionId;
    if (appliedPromo) {
      body.promotionId = appliedPromo.id;
      body.discountTotal = appliedPromo.discountAmount;
    }

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const orderData = await orderRes.json();
    if (!orderData.ok) throw new Error(orderData.error || "Failed to create order");
    const orderId = orderData.data.id;

    for (const item of items) {
      const itemBody: Record<string, unknown> = {
        productId: item.productId,
        quantity: item.quantity,
      };
      if (item.notes) itemBody.notes = item.notes;

      await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemBody),
      });
    }
    return orderId;
  }

  // ── Cash payment ──
  async function handleCashPayment() {
    if (!cashMethodId) return setError("Cash payment method not configured");
    if (cashInsufficient) return;
    setLoading(true);
    setError(null);
    try {
      const orderId = await createCafeOrder();

      // Record payment → marks PAID
      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodId: cashMethodId,
          amount: grandTotal,
          transactionRef: `CASH-${generateRef()}`,
          notes: cashReceived ? `Received: ₹${cashReceived}, Change: ₹${change.toFixed(2)}` : undefined,
        }),
      });
      const payData = await payRes.json();
      if (!payData.ok) throw new Error(payData.error);

      // Send to kitchen
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });

      onSuccess(orderId, "Cash");
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  // ── UPI manual confirm ──
  async function handleUpiConfirm() {
    if (!upiMethodId) return setError("UPI payment method not configured");
    setLoading(true);
    setError(null);
    try {
      const orderId = await createCafeOrder();

      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodId: upiMethodId,
          amount: grandTotal,
          transactionRef: upiRef,
          notes: "UPI payment confirmed by cashier",
        }),
      });
      const payData = await payRes.json();
      if (!payData.ok) throw new Error(payData.error);

      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });

      onSuccess(orderId, "UPI");
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Razorpay checkout ──
  async function handleRazorpay() {
    setLoading(true);
    setError(null);
    try {
      // Create Razorpay order
      const rzpRes = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: grandTotal, receipt: `pos_${Date.now()}` }),
      });
      const rzpData = await rzpRes.json();
      if (!rzpData.ok) throw new Error(rzpData.error);

      // Create café order
      const cafeOrderId = await createCafeOrder();

      // Launch Razorpay checkout
      const options = {
        key: rzpData.data.keyId,
        amount: rzpData.data.amount,
        currency: "INR",
        name: "Café Odoo",
        description: `Order #POS`,
        order_id: rzpData.data.orderId,
        theme: { color: "var(--color-primary)" },
        handler: async (response: any) => {
          // Verify with server
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              cafeOrderId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.ok) {
            setError("Payment verification failed. Contact staff.");
            setLoading(false);
            return;
          }

          // Send to kitchen
          await fetch(`/api/orders/${cafeOrderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SENT" }),
          });

          onSuccess(cafeOrderId, "Razorpay");
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Razorpay failed to load");
      setLoading(false);
    }
  }

  const tabs: { key: PaymentTab; label: string; icon: React.ReactNode }[] = [
    { key: "cash", label: "Cash", icon: <Banknote size={15} /> },
    { key: "upi", label: "UPI QR", icon: <QrCode size={15} /> },
    { key: "razorpay", label: "Razorpay", icon: <CreditCard size={15} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: sv.card,
          border: `1px solid ${sv.border}`,
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: `1px solid ${sv.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: sv.muted, marginBottom: "2px" }}>
              CHECKOUT
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <div style={{ fontSize: "26px", fontWeight: "800", color: sv.primary }}>
                {formatCurrency(grandTotal)}
              </div>
              {discountAmount > 0 && (
                <div style={{ fontSize: "14px", color: sv.muted, textDecoration: "line-through" }}>
                  {formatCurrency(originalGrandTotal)}
                </div>
              )}
            </div>
            <div style={{ fontSize: "12px", color: sv.muted, marginTop: "2px" }}>
              {items.length} item{items.length !== 1 ? "s" : ""} · Tax {formatCurrency(taxTotal)}
              {discountAmount > 0 && (
                <span style={{ color: "#4ade80", marginLeft: "6px", fontWeight: "600" }}>
                  · Save {formatCurrency(discountAmount)}
                </span>
              )}
            </div>
          </div>
          <button
            id="close-payment-dialog"
            onClick={onClose}
            style={{
              padding: "8px",
              background: sv.border,
              borderRadius: "8px",
              color: sv.muted,
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* ── COUPON SECTION ── */}
          <div style={{ padding: "14px 16px 0" }}>
            {/* Auto-applied or applied promo banner */}
            {appliedPromo && (
              <div
                style={{
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {appliedPromo.code ? <Tag size={14} style={{ color: "#4ade80" }} /> : <Sparkles size={14} style={{ color: "#4ade80" }} />}
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#4ade80" }}>
                      {appliedPromo.code ? `Code: ${appliedPromo.code}` : "Auto-applied"} — {appliedPromo.name}
                    </div>
                    <div style={{ fontSize: "11px", color: sv.muted }}>
                      {appliedPromo.discountType === "PERCENTAGE"
                        ? `${appliedPromo.discountValue}% off`
                        : `₹${appliedPromo.discountValue} off`}
                      {" · "}Saving {formatCurrency(appliedPromo.discountAmount)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={removePromo}
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#f87171",
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {/* Promo code entry toggle */}
            {!appliedPromo && (
              <button
                id="toggle-coupon-input"
                onClick={() => setShowCouponInput((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(var(--color-primary-rgb),0.06)",
                  border: `1px solid rgba(var(--color-primary-rgb),0.2)`,
                  borderRadius: "10px",
                  color: sv.primary,
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Tag size={14} />
                  Have a promo code?
                </div>
                {showCouponInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            {/* Promo code input */}
            {showCouponInput && !appliedPromo && (
              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    id="coupon-code-input"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter promo code"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${couponError ? "#ef4444" : sv.border}`,
                      color: sv.text,
                      fontSize: "14px",
                      fontWeight: "600",
                      letterSpacing: "0.05em",
                      outline: "none",
                    }}
                  />
                  <button
                    id="apply-coupon-btn"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: couponLoading || !couponCode.trim()
                        ? sv.border
                        : "var(--color-primary)",
                      color: couponLoading || !couponCode.trim() ? sv.muted : "#fff",
                      border: "none",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: couponLoading || !couponCode.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {couponLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p style={{ color: "#f87171", fontSize: "12px", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} /> {couponError}
                  </p>
                )}
              </div>
            )}

            {/* Dismissed auto-promos notice */}
            {!appliedPromo && autoPromos.length > 0 && (
              <div
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "10px",
                  fontSize: "12px",
                  color: "#fbbf24",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}>
                  <Sparkles size={13} /> Eligible offer removed
                </div>
                <div style={{ color: sv.muted, marginTop: "2px" }}>
                  Re-apply &ldquo;{autoPromos[0].name}&rdquo; to save {formatCurrency(autoPromos[0].discountAmount)}
                </div>
                <button
                  onClick={() => {
                    setAppliedPromo(autoPromos[0]);
                    setCouponSuccess(`🎉 "${autoPromos[0].name}" applied!`);
                  }}
                  style={{
                    marginTop: "6px",
                    background: "rgba(251,191,36,0.15)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fbbf24",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Re-apply
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Tabs */}
          <div style={{ display: "flex", gap: "6px", padding: "4px 16px 0" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                id={`payment-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "9px 6px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  border: `1px solid ${tab === t.key ? sv.primary : sv.border}`,
                  background:
                    tab === t.key ? `rgba(var(--color-primary-rgb),0.15)` : "transparent",
                  color: tab === t.key ? sv.primary : sv.muted,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: "16px 16px 20px" }}>
            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#f87171",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            {/* ── CASH ── */}
            {tab === "cash" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: sv.muted,
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Amount Received (₹)
                  </label>
                  <input
                    id="cash-received-input"
                    type="number"
                    min={grandTotal}
                    step="0.5"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={grandTotal.toFixed(2)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${cashInsufficient ? "#ef4444" : sv.border}`,
                      color: sv.text,
                      fontSize: "18px",
                      fontWeight: "700",
                    }}
                  />
                  {cashInsufficient && (
                    <p style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>
                      Amount must be at least {formatCurrency(grandTotal)}
                    </p>
                  )}
                </div>

                {/* Change Display */}
                <div
                  style={{
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "14px", color: sv.muted }}>Change to return</span>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "#4ade80" }}>
                    {formatCurrency(change)}
                  </span>
                </div>

                {/* Quick amounts */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    Math.ceil(grandTotal / 50) * 50,
                    Math.ceil(grandTotal / 100) * 100,
                    Math.ceil(grandTotal / 500) * 500,
                  ]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((amt) => (
                      <button
                        key={amt}
                        id={`quick-cash-${amt}`}
                        onClick={() => setCashReceived(amt.toString())}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "8px",
                          background: sv.border,
                          color: sv.text,
                          fontSize: "13px",
                          fontWeight: "600",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                </div>

                <button
                  id="confirm-cash-payment"
                  onClick={handleCashPayment}
                  disabled={loading || cashInsufficient}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background:
                      loading || cashInsufficient
                        ? "var(--color-bg-overlay)"
                        : "var(--color-primary)",
                    color: loading || cashInsufficient ? "var(--color-text-muted)" : "#fff",
                    fontWeight: "700",
                    fontSize: "15px",
                    border: "none",
                    cursor: loading || cashInsufficient ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(var(--color-primary-rgb),0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {loading ? "Processing..." : `Confirm Cash Payment${discountAmount > 0 ? ` — ${formatCurrency(grandTotal)}` : ""}`}
                </button>
              </div>
            )}

            {/* ── UPI QR ── */}
            {tab === "upi" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                {upiId ? (
                  <UpiQrDisplay upiId={upiId} amount={grandTotal} />
                ) : (
                  <div style={{ color: sv.muted, fontSize: "14px" }}>
                    No UPI ID configured. Set it in Payment Methods settings.
                  </div>
                )}

                {/* Txn Ref */}
                <div style={{ width: "100%" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: sv.muted,
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    UPI Transaction Reference (optional)
                  </label>
                  <input
                    id="upi-ref-input"
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="e.g. 123456789012"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${sv.border}`,
                      color: sv.text,
                      fontSize: "14px",
                    }}
                  />
                </div>

                <button
                  id="confirm-upi-payment"
                  onClick={handleUpiConfirm}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: loading ? "var(--color-bg-overlay)" : "var(--color-primary)",
                    color: loading ? "var(--color-text-muted)" : "#fff",
                    fontWeight: "700",
                    fontSize: "15px",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(var(--color-primary-rgb),0.3)",
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {loading ? "Processing..." : `Payment Received — ${formatCurrency(grandTotal)}`}
                </button>
              </div>
            )}

            {/* ── RAZORPAY ── */}
            {tab === "razorpay" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${sv.border}`,
                    borderRadius: "14px",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>💳</div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: sv.text,
                      marginBottom: "6px",
                    }}
                  >
                    Pay via Razorpay
                  </div>
                  <div style={{ fontSize: "13px", color: sv.muted, lineHeight: "1.5" }}>
                    Card, Net Banking, Wallets, UPI — all supported via a secure Razorpay checkout.
                  </div>
                </div>

                <button
                  id="open-razorpay-checkout"
                  onClick={handleRazorpay}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    background: loading
                      ? "var(--color-bg-overlay)"
                      : "linear-gradient(135deg, #072654, #1a3c7e)",
                    color: loading ? "var(--color-text-muted)" : "#fff",
                    fontWeight: "700",
                    fontSize: "15px",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(7,38,84,0.4)",
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  {loading ? "Opening Razorpay..." : `Pay ${formatCurrency(grandTotal)}`}
                </button>

                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: sv.muted,
                    textAlign: "center",
                  }}
                >
                  Secured by Razorpay · SSL Encrypted
                </p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
