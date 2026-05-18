import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminButton, AdminInput, adminFetch } from "./AdminLayout";
import { cn } from "@/lib/utils";
import { Settings, Plus, Save, Trash2, Edit3, X, RefreshCw } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [msg, setMsg] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    adminFetch("/admin/settings").then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else setSettings(d.settings || []);
    }).catch(() => setError("Failed to load settings")).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addSetting() {
    if (!newKey) return;
    const r = await adminFetch("/admin/settings", {
      method: "POST", body: JSON.stringify({ key: newKey, value: newValue }),
    });
    const d = await r.json();
    setMsg(d.error || "Saved");
    setNewKey("");
    setNewValue("");
    load();
  }

  async function deleteSetting(key: string) {
    if (!confirm(`Delete setting "${key}"?`)) return;
    const r = await adminFetch(`/admin/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
    const d = await r.json();
    setMsg(d.error || "Deleted");
    setEditingKey(null);
    load();
  }

  async function updateSetting(key: string) {
    const r = await adminFetch(`/admin/settings/${encodeURIComponent(key)}`, {
      method: "PUT", body: JSON.stringify({ value: editValue }),
    });
    const d = await r.json();
    setMsg(d.error || "Updated");
    setEditingKey(null);
    load();
  }

  function startEdit(key: string, value: any) {
    setEditingKey(key);
    setEditValue(typeof value === "string" ? value : JSON.stringify(value));
  }

  return (
    <AdminPage title="Settings" description="Application configuration key-value store">
      <div className="flex items-center gap-2 mb-4">
        <AdminButton onClick={load} variant="ghost">
          <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Refresh
        </AdminButton>
        {msg && <span className="text-xs text-cyan-400 animate-pulse">{msg}</span>}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          {error}
          <button onClick={load} className="ml-3 text-blue-400 hover:text-blue-300">RETRY</button>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-900/50 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {settings.map((s, i) => {
              const valueStr = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
              const isEditing = editingKey === s.key;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 hover:border-zinc-700/60 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono text-primary block mb-1">{s.key}</span>
                        <AdminInput value={editValue} onChange={setEditValue} placeholder="Value (JSON)" />
                      </div>
                      <AdminButton onClick={() => updateSetting(s.key)}><Save className="w-3 h-3" /></AdminButton>
                      <AdminButton variant="ghost" onClick={() => setEditingKey(null)}><X className="w-3 h-3" /></AdminButton>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono text-primary block">{s.key}</span>
                        <span className="text-sm text-foreground font-mono truncate block">{valueStr}</span>
                      </div>
                      <AdminButton onClick={() => startEdit(s.key, s.value)}><Edit3 className="w-3 h-3" /></AdminButton>
                      <AdminButton variant="danger" onClick={() => deleteSetting(s.key)}><Trash2 className="w-3 h-3" /></AdminButton>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {settings.length === 0 && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-12 text-sm text-muted-foreground">
              No settings configured.
            </motion.div>
          )}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-primary" /> Add Setting
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Key</label>
            <AdminInput value={newKey} onChange={setNewKey} placeholder="e.g. maintenance_mode" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Value (JSON)</label>
            <AdminInput value={newValue} onChange={setNewValue} placeholder='e.g. "true"' />
          </div>
          <AdminButton onClick={addSetting}>
            <Save className="w-4 h-4 mr-1" /> Add
          </AdminButton>
        </div>
      </motion.div>
    </AdminPage>
  );
}
