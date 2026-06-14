"use client";

import { useState, useEffect } from "react";
import { Plus, QrCode, Download, Trash2 } from "lucide-react";
import Image from "next/image";

interface Floor {
  id: string;
  name: string;
}

interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  floorId: string;
  qrToken: string | null;
  qrGeneratedAt: string | null;
  floor: { id: string; name: string };
  orders: { id: string; status: string }[];
}

export function TablesManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<{ url: string; imgUrl: string; tableNumber: string } | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [addForm, setAddForm] = useState({ tableNumber: "", seats: "4", floorId: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/tables").then((r) => r.json()),
      fetch("/api/floors").then((r) => r.json()),
    ]).then(([t, f]) => {
      setTables(t.data || []);
      const fData = f.data || [];
      setFloors(fData);
      if (fData.length > 0) setAddForm((prev) => ({ ...prev, floorId: fData[0].id }));
      setLoading(false);
    });
  }, []);

  const generateQR = async (tableId: string, tableNumber: string) => {
    setGeneratingQR(tableId);
    const res = await fetch(`/api/tables/${tableId}/qr`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      setQrResult({ url: data.data.qrUrl, imgUrl: data.data.qrImageUrl, tableNumber });
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, qrToken: data.data.token, qrGeneratedAt: new Date().toISOString() } : t))
      );
    }
    setGeneratingQR(null);
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, seats: parseInt(addForm.seats) }),
    });
    const data = await res.json();
    if (data.ok) {
      setTables((prev) => [...prev, data.data]);
      setShowAddTable(false);
    }
  };

  const deactivateTable = async (id: string) => {
    if (!confirm("Deactivate this table?")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTables = selectedFloor
    ? tables.filter((t) => t.floorId === selectedFloor)
    : tables;

  // Group by floor
  const floorGroups = floors.map((floor) => ({
    floor,
    tables: filteredTables.filter((t) => t.floorId === floor.id),
  })).filter((g) => g.tables.length > 0 || !selectedFloor);

  return (
    <div style={{ padding: "28px", maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800" }}>Tables & Floors</h1>
        <button
          id="add-table-btn"
          onClick={() => setShowAddTable(true)}
          style={{
            background: "linear-gradient(135deg, #B46B7A, #5A2D34)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(180, 107, 122,0.3)",
          }}
        >
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Floor filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedFloor(null)}
          style={{
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: "600",
            background: !selectedFloor ? "var(--color-primary)" : "var(--color-bg-overlay)",
            color: !selectedFloor ? "#fff" : "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          All Floors
        </button>
        {floors.map((f) => (
          <button
            key={f.id}
            id={`floor-filter-${f.id}`}
            onClick={() => setSelectedFloor(f.id === selectedFloor ? null : f.id)}
            style={{
              padding: "6px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              background: selectedFloor === f.id ? "rgba(180, 107, 122,0.15)" : "var(--color-bg-overlay)",
              color: selectedFloor === f.id ? "#B46B7A" : "var(--color-text-muted)",
              border: `1px solid ${selectedFloor === f.id ? "#B46B7A44" : "var(--color-border)"}`,
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Table Grid by Floor */}
      {floorGroups.map(({ floor, tables: floorTables }) => (
        <div key={floor.id} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "14px", color: "var(--color-text-muted)" }}>
            📍 {floor.name}
            <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: "500", color: "var(--color-text-faint)" }}>
              {floorTables.length} tables
            </span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
            {floorTables.map((table) => {
              const hasActiveOrder = table.orders && table.orders.length > 0;
              const hasQR = !!table.qrToken;
              return (
                <div
                  key={table.id}
                  style={{
                    background: "var(--color-bg-elevated)",
                    border: `1px solid ${hasActiveOrder ? "#f59e0b44" : "var(--color-border)"}`,
                    borderRadius: "14px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Table Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#B46B7A" }}>
                        {table.tableNumber}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>
                        {table.seats} seats
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: "700",
                        background: hasActiveOrder ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.12)",
                        color: hasActiveOrder ? "#fbbf24" : "#4ade80",
                      }}
                    >
                      {hasActiveOrder ? "Occupied" : "Free"}
                    </span>
                  </div>

                  {/* QR Status */}
                  <div style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>
                    {hasQR ? "✅ QR Active" : "⚠️ No QR"}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      id={`gen-qr-${table.id}`}
                      onClick={() => generateQR(table.id, table.tableNumber)}
                      disabled={generatingQR === table.id}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(180, 107, 122,0.12)",
                        border: "1px solid rgba(180, 107, 122,0.3)",
                        color: "#B46B7A",
                        fontSize: "12px",
                        fontWeight: "600",
                        justifyContent: "center",
                      }}
                    >
                      <QrCode size={13} />
                      {generatingQR === table.id ? "..." : hasQR ? "Regen" : "Gen QR"}
                    </button>
                    <button
                      id={`del-table-${table.id}`}
                      onClick={() => deactivateTable(table.id)}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* QR Result Modal */}
      {qrResult && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={(e) => e.target === e.currentTarget && setQrResult(null)}
        >
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "380px",
              width: "100%",
              textAlign: "center",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "800" }}>
              Table {qrResult.tableNumber}
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "var(--color-text-muted)" }}>
              QR code generated! Print or download.
            </p>

            {/* QR Image */}
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "16px",
                display: "inline-block",
                marginBottom: "20px",
              }}
            >
              <img
                src={qrResult.imgUrl}
                alt={`QR for ${qrResult.tableNumber}`}
                width={200}
                height={200}
                style={{ display: "block" }}
              />
            </div>

            <p style={{ fontSize: "12px", color: "var(--color-text-faint)", marginBottom: "20px", wordBreak: "break-all" }}>
              {qrResult.url}
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={qrResult.imgUrl}
                download={`table-${qrResult.tableNumber}-qr.png`}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #B46B7A, #5A2D34)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Download size={15} />
                Download
              </a>
              <button
                onClick={() => setQrResult(null)}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", justifyContent: "center" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTable && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={(e) => e.target === e.currentTarget && setShowAddTable(false)}
        >
          <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", animation: "fadeIn 0.2s ease" }}>
            <h3 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: "700" }}>Add Table</h3>
            <form onSubmit={addTable} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Table Number *</label>
                <input id="add-table-number" value={addForm.tableNumber} onChange={(e) => setAddForm((f) => ({ ...f, tableNumber: e.target.value }))} placeholder="e.g. T9 or VIP-1" required />
              </div>
              <div>
                <label>Seats</label>
                <input id="add-table-seats" type="number" min="1" max="20" value={addForm.seats} onChange={(e) => setAddForm((f) => ({ ...f, seats: e.target.value }))} />
              </div>
              <div>
                <label>Floor *</label>
                <select id="add-table-floor" value={addForm.floorId} onChange={(e) => setAddForm((f) => ({ ...f, floorId: e.target.value }))} required>
                  {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setShowAddTable(false)} style={{ flex: 1, background: "var(--color-bg-overlay)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", padding: "11px", justifyContent: "center" }}>Cancel</button>
                <button id="add-table-submit" type="submit" style={{ flex: 1, background: "linear-gradient(135deg, #B46B7A, #5A2D34)", color: "#fff", padding: "11px", justifyContent: "center", fontWeight: "600" }}>Add Table</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
