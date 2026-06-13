"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Search, Settings, User, Bell, LogOut, Clock, Users, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

// ─── Demo Data ──────────────────────────────────────────────────
const floors = [
  { id: "f1", name: "Ground Floor" },
  { id: "f2", name: "Rooftop" },
];

const tables = [
  { id: "t1", number: "T1", seats: 2, status: "AVAILABLE", floorId: "f1" },
  { id: "t2", number: "T2", seats: 4, status: "OCCUPIED", floorId: "f1", time: "45m", amount: "₹840" },
  { id: "t3", number: "T3", seats: 4, status: "BILLED", floorId: "f1", time: "1h 10m", amount: "₹1,250" },
  { id: "t4", number: "T4", seats: 6, status: "AVAILABLE", floorId: "f1" },
  { id: "t5", number: "T5", seats: 2, status: "OCCUPIED", floorId: "f1", time: "12m", amount: "₹320" },
  { id: "t6", number: "T6", seats: 8, status: "AVAILABLE", floorId: "f1" },
  { id: "t7", number: "T7", seats: 4, status: "OCCUPIED", floorId: "f2", time: "25m", amount: "₹650" },
  { id: "t8", number: "T8", seats: 4, status: "AVAILABLE", floorId: "f2" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "AVAILABLE": return "bg-card border-border/40 hover:border-primary/50 text-muted-foreground";
    case "OCCUPIED": return "bg-primary/10 border-primary/30 text-primary glow-amber";
    case "BILLED": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    default: return "bg-card border-border";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "AVAILABLE": return <Badge variant="outline" className="bg-transparent text-muted-foreground border-border">Available</Badge>;
    case "OCCUPIED": return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Occupied</Badge>;
    case "BILLED": return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Billed</Badge>;
    default: return null;
  }
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

export default function POSPage() {
  const [activeFloor, setActiveFloor] = useState(floors[0].id);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter(
    (t) => t.floorId === activeFloor && t.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Main POS Area ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center glow-amber">
                <Coffee className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Table Map</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tables..."
                className="pl-9 bg-muted/50 border-border/50 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 border-l border-border/40 pl-4">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              </Button>
              <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                  CA
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Floor Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-border/20 z-10 flex gap-2 overflow-x-auto custom-scrollbar">
          {floors.map((floor) => (
            <Button
              key={floor.id}
              variant={activeFloor === floor.id ? "default" : "outline"}
              className={`rounded-full px-6 transition-all ${
                activeFloor === floor.id 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-amber border-transparent" 
                  : "bg-transparent text-muted-foreground hover:text-foreground border-border/50"
              }`}
              onClick={() => setActiveFloor(floor.id)}
            >
              {floor.name}
            </Button>
          ))}
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <motion.div 
            variants={container} 
            initial="hidden" 
            animate="show"
            key={activeFloor} // Re-trigger animation on floor change
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {filteredTables.map((table) => (
              <motion.div variants={item} key={table.id}>
                <button
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${getStatusColor(table.status)}`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-0 w-full h-1 opacity-50 ${
                    table.status === "OCCUPIED" ? "bg-primary" : table.status === "BILLED" ? "bg-blue-400" : "bg-transparent"
                  }`} />
                  
                  <div className="flex items-start justify-between mb-4">
                    <h3 className={`text-2xl font-bold ${table.status === "AVAILABLE" ? "text-foreground" : ""}`}>
                      {table.number}
                    </h3>
                    <div className="flex items-center text-xs opacity-70">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {table.seats}
                    </div>
                  </div>

                  <div className="mb-4">
                    {getStatusBadge(table.status)}
                  </div>

                  {/* Active Order Info */}
                  <div className={`h-10 flex items-end justify-between ${table.status === "AVAILABLE" ? "opacity-0" : "opacity-100"}`}>
                    {table.time && (
                      <div className="flex items-center text-xs opacity-80">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {table.time}
                      </div>
                    )}
                    {table.amount && (
                      <div className="text-sm font-bold">
                        {table.amount}
                      </div>
                    )}
                  </div>
                </button>
              </motion.div>
            ))}
            
            {/* Empty state if no tables match */}
            {filteredTables.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Coffee className="w-12 h-12 mb-4 opacity-20" />
                <p>No tables found matching your search.</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ── Side Panel (Quick Actions / Stats) ────────────────── */}
      <aside className="w-80 flex-shrink-0 bg-sidebar border-l border-border/40 hidden lg:flex flex-col">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Session Overview</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border/40">
              <span className="text-sm text-muted-foreground">Active Orders</span>
              <span className="text-lg font-bold text-foreground">12</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border/40">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-lg font-bold text-green-400">₹4,250</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/20 glow-amber">
              <span className="text-sm text-primary">Pending KDS</span>
              <span className="text-lg font-bold text-primary">3</span>
            </div>
          </div>

          <Separator className="bg-border/40 mb-6" />
          
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 border-border/40 bg-card hover:bg-muted/50">
              <Coffee className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Takeaway</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 border-border/40 bg-card hover:bg-muted/50">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Merge Tables</span>
            </Button>
          </div>
        </div>

        <div className="mt-auto p-6">
          <Button variant="destructive" className="w-full bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30">
            <LogOut className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </div>
      </aside>
    </div>
  );
}
