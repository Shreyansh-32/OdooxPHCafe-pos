"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coffee, Clock, CheckCircle2, ChevronRight, 
  UtensilsCrossed, AlertCircle, PlayCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

// ─── Demo Data ──────────────────────────────────────────────────
type KdsOrder = {
  id: string;
  table: string;
  time: string;
  elapsed: number; // minutes
  status: "PENDING" | "PREPARING" | "COMPLETED";
  type: "DINE_IN" | "TAKEAWAY";
  items: { name: string; qty: number; notes?: string; isDone: boolean }[];
};

const initialOrders: KdsOrder[] = [
  {
    id: "#2302",
    table: "T7",
    time: "10:24 AM",
    elapsed: 14, // getting late
    status: "PREPARING",
    type: "DINE_IN",
    items: [
      { name: "Cappuccino", qty: 2, isDone: true },
      { name: "Avocado Toast", qty: 1, notes: "No onions, extra chili flakes", isDone: false },
      { name: "Blueberry Muffin", qty: 1, isDone: false },
    ],
  },
  {
    id: "#2305",
    table: "T5",
    time: "10:32 AM",
    elapsed: 6,
    status: "PENDING",
    type: "DINE_IN",
    items: [
      { name: "Iced Latte", qty: 1, isDone: false },
      { name: "Croissant", qty: 2, isDone: false },
    ],
  },
  {
    id: "#2306",
    table: "Takeaway",
    time: "10:35 AM",
    elapsed: 3,
    status: "PENDING",
    type: "TAKEAWAY",
    items: [
      { name: "Espresso", qty: 1, isDone: false },
    ],
  },
];

export default function KDSPage() {
  const [orders, setOrders] = useState<KdsOrder[]>(initialOrders);

  const pendingOrders = orders.filter(o => o.status === "PENDING");
  const preparingOrders = orders.filter(o => o.status === "PREPARING");
  
  // Handlers for demo interactivity
  const startOrder = (id: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "PREPARING" } : o));
  };

  const completeOrder = (id: string) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "COMPLETED" } : o).filter(o => o.status !== "COMPLETED"));
  };

  const toggleItem = (orderId: string, itemIndex: number) => {
    setOrders(orders.map(o => {
      if (o.id !== orderId) return o;
      const newItems = [...o.items];
      newItems[itemIndex].isDone = !newItems[itemIndex].isDone;
      return { ...o, items: newItems };
    }));
  };

  // Status colors based on elapsed time
  const getTimeColor = (elapsed: number) => {
    if (elapsed > 12) return "text-destructive bg-destructive/10 border-destructive/20";
    if (elapsed > 8) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    return "text-green-400 bg-green-400/10 border-green-400/20";
  };

  // Helper component for an Order Card
  const OrderCard = ({ order }: { order: KdsOrder }) => {
    const allDone = order.items.every(i => i.isDone);
    
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className="flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg h-[400px]"
      >
        {/* Card Header */}
        <div className={`p-4 border-b border-border/40 flex justify-between items-start ${
          order.status === "PREPARING" ? "bg-primary/5" : "bg-card"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-foreground">{order.table}</span>
              <span className="text-sm font-medium text-muted-foreground">{order.id}</span>
              {order.type === "TAKEAWAY" && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px]">
                  TAKEAWAY
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{order.time}</div>
          </div>
          
          <div className={`px-2.5 py-1 rounded-lg border flex items-center font-bold text-sm ${getTimeColor(order.elapsed)}`}>
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {order.elapsed}m
          </div>
        </div>

        {/* Card Body - Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="space-y-1">
            {order.items.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => order.status === "PREPARING" && toggleItem(order.id, idx)}
                className={`flex gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                  item.isDone 
                    ? "opacity-50 line-through bg-muted/20" 
                    : "hover:bg-muted/30 bg-card"
                }`}
              >
                <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center font-bold text-sm border ${
                  item.isDone ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-foreground"
                }`}>
                  {item.qty}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${item.isDone ? "text-muted-foreground" : "text-foreground"}`}>
                    {item.name}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-destructive mt-1 font-medium bg-destructive/10 px-2 py-0.5 rounded-md inline-block">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer - Action Button */}
        <div className="p-3 border-t border-border/40 bg-muted/10">
          {order.status === "PENDING" ? (
            <Button 
              onClick={() => startOrder(order.id)}
              className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 h-12 text-base font-bold"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Preparing
            </Button>
          ) : (
            <Button 
              onClick={() => completeOrder(order.id)}
              disabled={!allDone}
              className={`w-full h-12 text-base font-bold transition-all ${
                allDone 
                  ? "bg-green-500 text-white hover:bg-green-600 glow-green border-transparent" 
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {allDone ? "Mark Ready" : "Complete Items First"}
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Admin <ChevronRight className="w-4 h-4 mx-1" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center glow-amber">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Kitchen Display (KDS)</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-7 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2 animate-pulse" />
            Live Sync
          </Badge>
          <div className="text-sm font-medium text-muted-foreground">
            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </header>

      {/* ── Main KDS Board ────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Preparing Column (Left, takes more space) */}
        <div className="flex-[3] flex flex-col border-r border-border/40">
          <div className="p-4 border-b border-border/20 bg-muted/10 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center">
              <span className="w-2 h-2 rounded-full bg-primary mr-2" />
              Preparing Now
            </h2>
            <Badge variant="secondary">{preparingOrders.length}</Badge>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-background/50 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {preparingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </AnimatePresence>
              
              {preparingOrders.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No orders currently being prepared.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Column (Right, incoming queue) */}
        <div className="flex-[2] lg:flex-[1.5] xl:flex-1 flex flex-col bg-sidebar">
          <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/50 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center">
              <AlertCircle className="w-4 h-4 text-muted-foreground mr-2" />
              Incoming Queue
            </h2>
            <Badge variant="outline" className="bg-background text-muted-foreground">{pendingOrders.length}</Badge>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </AnimatePresence>
              
              {pendingOrders.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <Coffee className="w-10 h-10 mb-3" />
                  <p className="text-sm">Queue is empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
