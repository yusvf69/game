import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, Save, X, Calendar, Clock, Users, Zap } from "lucide-react";
import { AdminPage, AdminButton, AdminInput, AdminSelect, adminFetch } from "./AdminLayout";

const EVENT_TYPES = [
  { label: "Double XP", value: "double_xp" },
  { label: "Special Match", value: "special_match" },
  { label: "Global Buff", value: "global_buff" },
  { label: "Challenge", value: "challenge" },
  { label: "Seasonal", value: "seasonal" },
];

const EVENT_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  draft: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TYPE_ICONS: Record<string, any> = {
  double_xp: Zap,
  special_match: Users,
  global_buff: Globe,
  challenge: Zap,
  seasonal: Calendar,
};

interface Event {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  conditions: any;
  rewards: any;
  narrative: string;
  created_at: string;
}

const emptyForm = {
  title: "", description: "", type: "double_xp", status: "draft",
  startAt: "", endAt: "", conditions: "{}", rewards: "{}", narrative: "",
};

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/events")
      .then(r => r.json())
      .then(d => { if (d.events) setEvents(d.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (key: string) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const openNew = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (e: Event) => {
    setForm({
      title: e.title,
      description: e.description,
      type: e.type,
      status: e.status,
      startAt: e.startAt || "",
      endAt: e.endAt || "",
      conditions: typeof e.conditions === "object" ? JSON.stringify(e.conditions, null, 2) : e.conditions || "{}",
      rewards: typeof e.rewards === "object" ? JSON.stringify(e.rewards, null, 2) : e.rewards || "{}",
      narrative: e.narrative || "",
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        conditions: JSON.parse(form.conditions),
        rewards: JSON.parse(form.rewards),
      };
      const res = await adminFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        load();
      }
    } catch {}
    setSaving(false);
  };

  const cancel = () => { setShowForm(false); setEditingId(null); };

  return (
    <AdminPage title="World Events" description="Manage global events, buffs, and seasonal content">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4 text-primary" />
          <span>{events.length} event{events.length !== 1 ? "s" : ""}</span>
        </div>
        <AdminButton onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> New Event
        </AdminButton>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingId ? "Edit Event" : "Create Event"}
                </h3>
                <button onClick={cancel} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Title</label>
                  <AdminInput value={form.title} onChange={set("title")} placeholder="Event title" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Type</label>
                  <AdminSelect value={form.type} onChange={set("type")} options={EVENT_TYPES} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <AdminSelect value={form.status} onChange={set("status")} options={EVENT_STATUSES} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <AdminInput value={form.startAt} onChange={set("startAt")} placeholder="2025-01-01T00:00:00Z" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <AdminInput value={form.endAt} onChange={set("endAt")} placeholder="2025-01-07T00:00:00Z" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => set("description")(e.target.value)}
                  placeholder="Event description"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Conditions (JSON)</label>
                  <textarea value={form.conditions} onChange={e => set("conditions")(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Rewards (JSON)</label>
                  <textarea value={form.rewards} onChange={e => set("rewards")(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Narrative</label>
                <textarea value={form.narrative} onChange={e => set("narrative")(e.target.value)}
                  placeholder="Story narrative for this event"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton onClick={cancel}>Cancel</AdminButton>
                <AdminButton onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Event"}
                </AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/30">
          <Globe className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No events yet</p>
          <AdminButton onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Create Event</AdminButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {events.map((e, i) => {
              const TypeIcon = TYPE_ICONS[e.type] || Globe;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => openEdit(e)}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 space-y-3 cursor-pointer transition-all hover:border-zinc-700/60 hover:bg-zinc-900/80 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_COLORS[e.status] || "bg-muted text-muted-foreground border-border"}`}>
                        {e.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-zinc-700/40 bg-zinc-800/40 text-xs text-zinc-300 flex items-center gap-1 capitalize">
                        <TypeIcon className="w-3 h-3" />
                        {e.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{e.startAt ? new Date(e.startAt).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{e.title}</h3>
                  {e.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                  )}
                  {e.endAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <Clock className="w-3 h-3" />
                      <span>Ends {new Date(e.endAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </AdminPage>
  );
}
