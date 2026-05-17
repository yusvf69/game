import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AdminPage, adminFetch } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Users, TrendingUp, Clock, Target, Zap, AlertTriangle, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

interface AnalyticsData {
  dailyUsers: { date: string; registrations: string }[];
  eventCounts: { event_type: string; count: string }[];
  categoryStats: { category: string; correct: string; total: string }[];
  hourlyActivity: { hour: number; actions: string }[];
}

const COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];
const PIE_COLORS = ["#06b6d4", "#0ea5e9", "#10b981", "#84cc16", "#eab308", "#f97316", "#ef4444", "#8b5cf6"];

function StatCard({ icon: Icon, label, value, sub, color, delay }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700/60 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, delay, children }: {
  title: string; icon: any; delay: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="bg-zinc-900/50 border-zinc-800/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
            <Icon className="w-4 h-4" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/admin/analytics").then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); return; }
      setData(d);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminPage title="Analytics" description="Platform metrics and user activity"><LoadingSkeleton /></AdminPage>;
  if (error) return (
    <AdminPage title="Analytics" description="Platform metrics and user activity">
      <Card className="bg-zinc-900/50 border-red-800/60">
        <CardContent className="flex items-center gap-3 p-6 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Failed to load analytics: {error}</p>
        </CardContent>
      </Card>
    </AdminPage>
  );
  if (!data) return (
    <AdminPage title="Analytics" description="Platform metrics and user activity">
      <Card className="bg-zinc-900/50 border-zinc-800/60">
        <CardContent className="p-6 text-muted-foreground text-sm">No analytics data available.</CardContent>
      </Card>
    </AdminPage>
  );

  const daily = (data.dailyUsers || []).slice(-30);
  const hourly = data.hourlyActivity || [];
  const categories = data.categoryStats || [];
  const events = data.eventCounts || [];
  const totalEvents = events.reduce((s, e) => s + Number(e.count), 0);
  const totalCategories = categories.length;
  const avgRate = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + (Number(c.total) > 0 ? Number(c.correct) / Number(c.total) : 0), 0) / categories.length * 100)
    : 0;
  const totalHours = hourly.reduce((s, h) => s + Number(h.actions), 0);
  const dailyChart = daily.map(d => ({ date: d.date.slice(5), registrations: Number(d.registrations) }));
  const maxReg = Math.max(...dailyChart.map(d => d.registrations), 1);

  return (
    <AdminPage title="Analytics" description="Platform metrics and user activity">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Zap} label="Total Events" value={totalEvents.toLocaleString()} sub="All event types" color="text-cyan-400" delay={0} />
        <StatCard icon={Target} label="Categories" value={totalCategories} sub="Active question categories" color="text-emerald-400" delay={0.1} />
        <StatCard icon={TrendingUp} label="Avg Success Rate" value={`${avgRate}%`} sub="Correct answers" color="text-amber-400" delay={0.2} />
        <StatCard icon={Clock} label="Total Actions" value={totalHours.toLocaleString()} sub="Hourly activity volume" color="text-violet-400" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Daily Registrations (30 days)" icon={Users} delay={0.1}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} domain={[0, maxReg + 2]} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e4e4e7" }}
              />
              <Area type="monotone" dataKey="registrations" stroke="#06b6d4" strokeWidth={2} fill="url(#regGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Activity (7 days)" icon={Activity} delay={0.2}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false}
                tickFormatter={h => `${h}h`} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(v: number) => [v.toLocaleString(), "Actions"]}
                labelFormatter={l => `${l}:00`}
              />
              <Bar dataKey="actions" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Event Distribution" icon={BarChart3} delay={0.3}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={events.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="event_type" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(v: number) => [v.toLocaleString(), "Count"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {events.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category Success Rate" icon={Target} delay={0.4}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categories.map(c => ({ name: c.category, value: Number(c.correct) }))}
                cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                dataKey="value"
              >
                {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e4e4e7" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {categories.map((c, i) => (
              <span key={c.category} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {c.category}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="bg-zinc-900/50 border-zinc-800/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((c, i) => {
                const correct = Number(c.correct);
                const total = Number(c.total);
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-foreground capitalize">{c.category}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}% ({correct}/{total})</span>
                    </div>
                    <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.08, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No category data available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AdminPage>
  );
}
