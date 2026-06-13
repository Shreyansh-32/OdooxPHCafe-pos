"use client";

import { useState, useEffect } from "react";
import { CustomerAuth } from "./customer-auth";
import { CustomerMenu } from "./customer-menu";

interface Props {
  tableId: string;
  tableToken: string;
  tableNumber: string;
  floorName: string;
}

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  tableId: string;
}

export function CustomerOrderGate({ tableId, tableToken, tableNumber, floorName }: Props) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if customer already has a session
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.data.tableId === tableId) {
          setSession(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f13",
        }}
      >
        <div style={{ textAlign: "center", color: "#8a8a9a" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>☕</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <CustomerAuth
        tableId={tableId}
        tableNumber={tableNumber}
        floorName={floorName}
        onSuccess={setSession}
      />
    );
  }

  return (
    <CustomerMenu
      tableId={tableId}
      tableNumber={tableNumber}
      floorName={floorName}
      customer={session}
      onLogout={() => setSession(null)}
    />
  );
}
