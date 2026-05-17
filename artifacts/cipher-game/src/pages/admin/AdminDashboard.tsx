import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AdminPage, AdminCard, adminFetch } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Activity, BookOpen, Zap, Play, BarChart3,
  TrendingUp, Clock, Gamepad2, Target,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalUsers: number; onlineNow: number; totalMatches: number;
    xpToday: number; activeMatches: number; questionsCount: number;
  };
  dailyUsers?: { day: string; registrations: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    adminFetch("/admin/dashboard").then(r => r.json()).then(d => {
      if (!d.error) setData(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminPage title="Control Center" description="System overview and quick actions">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </AdminPage>
  );

  return (
    <AdminPage title="Control Center" description="System overview and live monitoring">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <AdminCard title="Total Users" value={data?.stats.totalUsers || 0} icon={Users} subtitle="Registered accounts" />
        <AdminCard title="Online Now" value={data?.stats.onlineNow || 0} icon={Activity} color="green" subtitle="Active sessions" />
        <AdminCard title="Active Matches" value={data?.stats.activeMatches || 0} icon={Play} color="purple" subtitle="In progress" />
        <AdminCard title="Total Matches" value={data?.stats.totalMatches || 0} icon={Gamepad2} color="orange" subtitle="All time" />
        <AdminCard title="Questions" value={data?.stats.questionsCount || 0} icon={BookOpen} color="cyan" subtitle="In database" />
        <AdminCard title="XP Today" value={(data?.stats.xpToday || 0).toLocaleString()} icon={Zap} color="red" subtitle="Earned in 24h" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/admin/matches", icon: Play, label: "Live Matches", color: "text-primary" },
                { href: "/admin/questions", icon: BookOpen, label: "Questions", color: "text-secondary" },
                { href: "/admin/users", icon: Users, label: "Users", color: "text-green-400" },
                { href: "/admin/analytics", icon: BarChart3, label: "Analytics", color: "text-orange-400" },
              ].map((action) => (
                <motion.div key={action.href} whileHover={{ scale: 1.03 }}>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(action.href)}
                    className="w-full h-20 flex flex-col items-center justify-center gap-2 border-border/50 hover:border-primary/50"
                  >
                    <action.icon className={cn("w-5 h-5", action.color)} />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <Target className="w-4 h-4" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "API Status", value: "Operational", color: "text-green-400" },
                { label: "Database", value: "Connected", color: "text-green-400" },
                { label: "Last Match", value: data?.stats.activeMatches ? `${data.stats.activeMatches} active` : "No active matches", color: data?.stats.activeMatches ? "text-primary" : "text-muted-foreground" },
                { label: "Players Online", value: `${data?.stats.onlineNow || 0} connected`, color: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
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

import { cn } from "@/lib/utils";
