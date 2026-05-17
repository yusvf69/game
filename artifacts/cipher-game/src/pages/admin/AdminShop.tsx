import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Save, X, Trash2, Coins, Tag, Star } from "lucide-react";
import { AdminPage, AdminTable, AdminButton, AdminInput, AdminSelect, adminFetch } from "./AdminLayout";

const ITEM_TYPES = ["skin", "module", "boost", "cosmetic", "emblem", "title"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_COLORS: Record<string, string> = {
  common: "text-zinc-400", uncommon: "text-green-400", rare: "text-blue-400",
  epic: "text-purple-400", legendary: "text-orange-400",
};

const emptyForm = {
  name: "", description: "", type: "skin", rarity: "common",
  priceCoins: "0", pricePremium: "0", iconUrl: "",
  isLimited: false, availableUntil: "",
};

type Form = typeof emptyForm;

export default function AdminShop() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/shop/items").then(r => r.json()).then(d => { if (d.items) setItems(d.items); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (f: keyof Form) => (v: string | boolean) => setForm(p => ({ ...p, [f]: v }));

  const startNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };

  const startEdit = (item: any) => {
    setForm({
      name: item.name, description: item.description || "", type: item.type,
      rarity: item.rarity || "common", priceCoins: String(item.priceCoins ?? 0),
      pricePremium: String(item.pricePremium ?? 0), iconUrl: item.iconUrl || "",
      isLimited: item.isLimited, availableUntil: item.availableUntil || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const cancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const save = async () => {
    setSaving(true);
    const body = {
      name: form.name, description: form.description, type: form.type, rarity: form.rarity,
      priceCoins: parseInt(form.priceCoins) || 0, pricePremium: parseInt(form.pricePremium) || 0,
      iconUrl: form.iconUrl, isLimited: form.isLimited, availableUntil: form.availableUntil || null,
    };
    try {
      if (editingId) {
        await adminFetch(`/admin/shop/items/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await adminFetch("/admin/shop/items", { method: "POST", body: JSON.stringify(body) });
      }
      cancel();
      load();
    } catch {}
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this shop item?")) return;
    await adminFetch(`/admin/shop/items/${id}`, { method: "DELETE" });
    load();
  };

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "-";

  return (
    <AdminPage title="Shop Management" description="Create and manage in-game shop items">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="w-4 h-4" />
          <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
        </div>
        <AdminButton onClick={startNew}>
          <Plus className="w-4 h-4 mr-1" /> New Item
        </AdminButton>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {editingId ? <><Tag className="w-4 h-4 text-primary" /> Edit Item #{editingId}</> : <><Plus className="w-4 h-4 text-primary" /> New Item</>}
                </span>
                <button onClick={cancel} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AdminInput value={form.name} onChange={set("name")} placeholder="Item name" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AdminSelect value={form.type} onChange={set("type")} options={ITEM_TYPES.map(t => ({ label: capitalize(t), value: t }))} />
                  </div>
                  <div className="flex-1">
                    <AdminSelect value={form.rarity} onChange={set("rarity")} options={RARITIES.map(r => ({ label: capitalize(r), value: r }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <AdminInput value={form.priceCoins} onChange={set("priceCoins")} placeholder="Coins" style={{ paddingLeft: "2rem" }} />
                  </div>
                  <div className="flex-1 relative">
                    <Star className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <AdminInput value={form.pricePremium} onChange={set("pricePremium")} placeholder="Premium" style={{ paddingLeft: "2rem" }} />
                  </div>
                </div>
                <AdminInput value={form.iconUrl} onChange={set("iconUrl")} placeholder="Icon URL" />
                <AdminInput value={form.availableUntil} onChange={set("availableUntil")} placeholder="Available until (YYYY-MM-DD)" />
              </div>

              <div className="flex flex-col gap-1">
                <textarea value={form.description} onChange={e => set("description")(e.target.value)} placeholder="Description..."
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-1">
                  <input type="checkbox" checked={form.isLimited} onChange={e => set("isLimited")(e.target.checked)}
                    className="rounded border-border bg-transparent accent-primary" />
                  Limited time item
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <AdminButton onClick={save} disabled={saving || !form.name.trim()}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </AdminButton>
                <AdminButton variant="ghost" onClick={cancel}>Cancel</AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <AdminTable
          headers={["ID", "Name", "Type", "Rarity", "Coins", "Premium", "Limited", "Actions"]}
          rows={items.map(item => [
            <span className="font-mono text-xs text-muted-foreground">{item.id}</span>,
            <span className="font-medium text-foreground">{item.name}</span>,
            <span className="text-xs text-muted-foreground">{item.type}</span>,
            <span className={`text-xs font-semibold ${RARITY_COLORS[item.rarity] || "text-zinc-400"}`}>{capitalize(item.rarity)}</span>,
            <span className="flex items-center gap-1 text-xs"><Coins className="w-3 h-3 text-yellow-400" />{item.priceCoins ?? 0}</span>,
            <span className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 text-purple-400" />{item.pricePremium ?? 0}</span>,
            item.isLimited ? <span className="text-xs text-orange-400 font-semibold">Yes</span> : <span className="text-xs text-muted-foreground">No</span>,
            <div className="flex gap-1">
              <AdminButton onClick={() => startEdit(item)}><Tag className="w-3 h-3 mr-1" /> Edit</AdminButton>
              <AdminButton variant="danger" onClick={() => remove(item.id)}><Trash2 className="w-3 h-3" /></AdminButton>
            </div>,
          ])}
        />
      )}
    </AdminPage>
  );
}
