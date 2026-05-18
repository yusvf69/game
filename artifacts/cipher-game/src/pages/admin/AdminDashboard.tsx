import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AdminPage, adminFetch } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Users, Activity, BookOpen, Zap, Play, BarChart3,
  TrendingUp, Target, Gamepad2, Clock,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalUsers: number; onlineNow: number; totalMatches: number;
    xpToday: number; activeMatches: number; questionsCount: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    adminFetch("/admin/dashboard")
      .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => { if (!d.error) setData(d); else setError(d.error); })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { title: "Total Users", value: data?.stats.totalUsers || 0, icon: Users, subtitle: "Registered accounts", color: "text-blue-400" },
    { title: "Online Now", value: data?.stats.onlineNow || 0, icon: Activity, subtitle: "Active sessions", color: "text-green-400" },
    { title: "Active Matches", value: data?.stats.activeMatches || 0, icon: Play, subtitle: "In progress", color: "text-purple-400" },
    { title: "Total Matches", value: data?.stats.totalMatches || 0, icon: Gamepad2, subtitle: "All time", color: "text-orange-400" },
    { title: "Questions", value: data?.stats.questionsCount || 0, icon: BookOpen, subtitle: "In database", color: "text-cyan-400" },
    { title: "XP Today", value: (data?.stats.xpToday || 0).toLocaleString(), icon: Zap, subtitle: "Earned in 24h", color: "text-red-400" },
  ];

  const quickActions = [
    { href: "/admin/matches", icon: Play, label: "Live Matches", color: "text-primary" },
    { href: "/admin/questions", icon: BookOpen, label: "Questions", color: "text-cyan-400" },
    { href: "/admin/users", icon: Users, label: "Users", color: "text-green-400" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics", color: "text-orange-400" },
  ];

  const statusItems = [
    { label: "API Status", value: "Operational", color: "text-green-400" },
    { label: "Database", value: "Connected", color: "text-green-400" },
    { label: "Active Matches", value: data?.stats.activeMatches ? `${data.stats.activeMatches} running` : "None", color: data?.stats.activeMatches ? "text-primary" : "text-muted-foreground" },
    { label: "Players Online", value: `${data?.stats.onlineNow || 0} connected`, color: "text-primary" },
  ];

  return (
    <AdminPage title="Control Center" description="System overview and live monitoring">
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
          {error}
          <button onClick={() => window.location.reload()} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-[10px] text-zinc-600 font-mono tracking-widest">{stat.subtitle}</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
              <p className="text-xs text-zinc-600 mt-1">{stat.title}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-zinc-800/60 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <motion.div key={action.href} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline"
                    onClick={() => setLocation(action.href)}
                    className="w-full h-20 flex flex-col items-center justify-center gap-2 border-zinc-700/50 hover:border-primary/50 bg-zinc-900/30">
                    <action.icon className={cn("w-5 h-5", action.color)} />
                    <span className="text-xs text-zinc-400">{action.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/60 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <Target className="w-4 h-4" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusItems.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="text-sm text-zinc-500">{s.label}</span>
                  <span className={cn("text-sm font-semibold", s.color)}>{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
