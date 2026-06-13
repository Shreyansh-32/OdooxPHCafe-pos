"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  ChefHat,
  Coffee,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  Table2,
  Tags,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";

type Props = {
  userName: string;
  userEmail: string;
  userRole: Role;
};

const nav = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pos", label: "POS", icon: ShoppingCart },
    { href: "/kds", label: "KDS", icon: ChefHat },
    { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/admin/tables", label: "Tables", icon: Table2 },
    { href: "/admin/promotions", label: "Promos", icon: Tags },
    { href: "/admin/staff", label: "Staff", icon: Users },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  ],
  CASHIER: [{ href: "/pos", label: "POS", icon: ShoppingCart }],
  KITCHEN: [{ href: "/kds", label: "KDS", icon: ChefHat }],
} satisfies Record<Role, { href: string; label: string; icon: typeof Coffee }[]>;

export function StaffSidebar({ userName, userEmail, userRole }: Props) {
  const pathname = usePathname();
  const items = nav[userRole] ?? [];

  return (
    <aside
      style={{
        width: 236,
        minWidth: 236,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--color-border)",
        background: "var(--color-bg-elevated)",
      }}
    >
      <div style={{ padding: 18, borderBottom: "1px solid var(--color-border-muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-info))",
            }}
          >
            <Coffee size={20} />
          </div>
          <div>
            <strong style={{ display: "block", lineHeight: 1.2 }}>CafePOS</strong>
            <span style={{ color: "var(--color-text-faint)", fontSize: 12 }}>Odoo Cafe</span>
          </div>
        </div>
      </div>

      <nav style={{ padding: 10, flex: 1, overflowY: "auto" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/pos" || item.href === "/kds"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 4,
                borderRadius: 8,
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                background: active ? "rgba(200, 121, 65, 0.12)" : "transparent",
                fontWeight: active ? 700 : 500,
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: 14, borderTop: "1px solid var(--color-border-muted)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(79, 140, 255, 0.16)",
              color: "#9cc0ff",
              fontWeight: 800,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName}
            </div>
            <div style={{ color: "var(--color-text-faint)", fontSize: 12 }}>{userRole}</div>
          </div>
        </div>
        <button
          className="app-button secondary"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", color: "var(--color-text-muted)" }}
          title={userEmail}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
