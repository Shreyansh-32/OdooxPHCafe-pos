"use client";

import QRCode from "react-qr-code";
import { buildUPILink } from "@/lib/utils";
import { Smartphone } from "lucide-react";

interface Props {
  upiId: string;
  amount: number;
  merchantName?: string;
}

export function UpiQrDisplay({ upiId, amount, merchantName = "Café Odoo" }: Props) {
  const upiLink = buildUPILink(upiId, amount, merchantName);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* QR Code */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "16px",
          display: "inline-block",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <QRCode value={upiLink} size={180} />
      </div>

      {/* UPI ID */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#8a8a9a", marginBottom: "4px" }}>
          UPI ID
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "#f0eee8",
            letterSpacing: "0.02em",
          }}
        >
          {upiId}
        </div>
      </div>

      {/* Open UPI App Button */}
      <a
        href={upiLink}
        id="open-upi-app-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "11px 24px",
          borderRadius: "10px",
          background: "rgba(200,121,65,0.15)",
          border: "1px solid rgba(200,121,65,0.4)",
          color: "#c87941",
          fontWeight: "600",
          fontSize: "14px",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        <Smartphone size={15} />
        Open UPI App
      </a>

      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: "#8a8a9a",
          textAlign: "center",
          maxWidth: "220px",
          lineHeight: "1.5",
        }}
      >
        Scan with any UPI app — GPay, PhonePe, Paytm, etc.
      </p>
    </div>
  );
}
