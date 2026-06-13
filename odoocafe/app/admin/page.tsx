"use client";

import { motion } from "framer-motion";
import {
  TrendingUp, ShoppingBag, Users, Coffee,
  LayoutDashboard, UtensilsCrossed, QrCode,
  Settings, LogOut, ChevronRight, ArrowUpRight,
  Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Link from "next/link";

// ─── Demo data ────────────────────────────────────────────────────
const kpiCards = [
  {
    title: "Revenue Today",
    value: "₹12,480",
    change: "+18.2%",
    icon: TrendingUp,
    color: "text-green-400",
    glow: "glow-green",
    bg: "bg-green-400/10",
  },
  {
    title: "Orders Today",
    value: "84",
    change: "+12.5%",
    icon: ShoppingBag,
    color: "text-primary",
    glow: "glow-amber",
    bg: "bg-primary/10",
  },
  {
    title: "Active Tables",
    value: "6 / 16",
    change: "Occupied",
    icon: Coffee,
    color: "text-blue-400",
    glow: "",
    bg: "bg-blue-400/10",
  },
  {
    title: "Avg. Order Value",
    value: "₹148",
    change: "+4.8%",
    icon: Users,
    color: "text-purple-400",
    glow: "",
    bg: "bg-purple-400/10",
  },
];

const revenueData = [
  { day: "Mon", revenue: 9200 },
  { day: "Tue", revenue: 11400 },
  { day: "Wed", revenue: 8700 },
  { day: "Thu", revenue: 13200 },
  { day: "Fri", revenue: 15800 },
  { day: "Sat", revenue: 18400 },
  { day: "Sun", revenue: 12480 },
];

const recentOrders = [
  { id: "#2301", table: "T3", items: 4, total: "₹640", status: "PAID", time: "2 min ago" },
  { id: "#2302", table: "T7", items: 2, total: "₹280", status: "SENT", time: "5 min ago" },
  { id: "#2303", table: "Walk-in", items: 1, total: "₹120", status: "PAID", time: "8 min ago" },
  { id: "#2304", table: "T2", items: 6, total: "₹920", status: "DRAFT", time: "11 min ago" },
  { id: "#2305", table: "T5", items: 3, total: "₹450", status: "SENT", time: "15 min ago" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", active: true },
  { icon: Coffee, label: "Menu", href: "/admin/menu", active: false },
  { icon: QrCode, label: "Tables & QR", href: "/admin/tables", active: false },
  { icon: UtensilsCrossed, label: "KDS", href: "/kds", active: false },
  { icon: ShoppingBag, label: "Orders", href: "/admin/orders", active: false },
  { icon: Users, label: "Staff", href: "/admin/staff", active: false },
  { icon: Settings, label: "Settings", href: "/admin/settings", active: false },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PAID: { label: "Paid", color: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  SENT: { label: "Sent", color: "bg-primary/15 text-primary border-primary/20", icon: Clock },
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center glow-amber">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">CafePOS</p>
            <p className="text-xs text-muted-foreground mt-0.5">Admin Portal</p>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((n) => (
            <Link key={n.href} href={n.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                  n.active
                    ? "bg-primary/15 text-primary border border-primary/20 glow-amber"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <n.icon className="w-4 h-4 flex-shrink-0" />
                {n.label}
                {n.active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-primary/60" />
                )}
              </div>
            </Link>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User */}
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-all cursor-pointer group">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Admin</p>
              <p className="text-xs text-muted-foreground truncate">admin@cafe.com</p>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 px-8 py-5 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Sunday, 13 June 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
              Live
            </Badge>
            <Link href="/pos">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-amber">
                Open POS
              </Button>
            </Link>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* KPI Cards */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {kpiCards.map((card) => (
              <motion.div key={card.title} variants={item}>
                <Card className={`border-border/40 bg-card/80 hover:${card.glow} transition-all duration-300 group`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-green-400" />
                        {card.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-3 gap-6">

            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-2"
            >
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Weekly Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData} barSize={28}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "oklch(0.60 0.01 240)", fontSize: 12 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.16 0.01 240)",
                          border: "1px solid oklch(1 0 0 / 10%)",
                          borderRadius: "10px",
                          color: "oklch(0.96 0.005 240)",
                          fontSize: "12px",
                        }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {revenueData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              i === revenueData.length - 1
                                ? "oklch(0.78 0.16 65)"
                                : "oklch(0.78 0.16 65 / 35%)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="border-border/40 bg-card/80 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Add Menu Item", icon: Coffee, href: "/admin/menu/new" },
                    { label: "Generate QR", icon: QrCode, href: "/admin/tables" },
                    { label: "View KDS", icon: UtensilsCrossed, href: "/kds" },
                    { label: "Open Cashier POS", icon: ShoppingBag, href: "/pos" },
                  ].map((action) => (
                    <Link key={action.label} href={action.href}>
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <action.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {action.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent Orders
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  View all
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentOrders.map((order) => {
                    const s = statusConfig[order.status];
                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{order.id}</span>
                            <span className="text-xs text-muted-foreground">{order.table}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{order.items} items · {order.time}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{order.total}</span>
                        <Badge className={`text-xs border ${s.color}`}>
                          {s.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
