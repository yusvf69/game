import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, AdminInput, adminFetch } from "./AdminLayout";

export default function AdminStory() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [lore, setLore] = useState<any[]>([]);
  const [tab, setTab] = useState<"chapters" | "lore">("chapters");
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState("");

  function load() {
    adminFetch("/admin/story/chapters").then(r => r.json()).then(d => {
      if (d.chapters) setChapters(d.chapters);
    }).catch(() => {});
    adminFetch("/admin/story/lore").then(r => r.json()).then(d => {
      if (d.lore) setLore(d.lore);
    }).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/admin/story/chapters/${editing.id}` : "/admin/story/chapters";
    const r = await adminFetch(url, { method, body: JSON.stringify(editing) });
    const d = await r.json();
    setMsg(d.error || "Saved");
    setEditing(null);
    load();
  }

  return (
    <AdminPage title="Story Management">
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <AdminButton onClick={() => setTab("chapters")} style={{ opacity: tab === "chapters" ? 1 : 0.5 }}>Chapters</AdminButton>
        <AdminButton onClick={() => setTab("lore")} style={{ opacity: tab === "lore" ? 1 : 0.5 }}>Lore</AdminButton>
        {tab === "chapters" && <AdminButton onClick={() => setEditing({ orderIndex: (chapters.length || 0) + 1 })}>+ New Chapter</AdminButton>}
        {msg && <span style={{ color: "#00e5ff", fontSize: "0.8rem" }}>{msg}</span>}
      </div>

      {tab === "chapters" && (
        <>
          {editing && (
            <div style={{ background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <h3 style={{ color: "#00e5ff", marginBottom: "12px" }}>{editing.id ? "Edit" : "New"} Chapter</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <AdminInput value={editing.title || ""} onChange={v => setEditing({ ...editing, title: v })} placeholder="Title" />
                <AdminInput value={String(editing.orderIndex || "")} onChange={v => setEditing({ ...editing, orderIndex: parseInt(v) || 0 })} placeholder="Order" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Description" style={{ width: "100%", minHeight: "60px", padding: "8px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628", color: "#b8d4e3" }} />
                </div>
              </div>
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <AdminButton onClick={save}>Save</AdminButton>
                <AdminButton variant="ghost" onClick={() => setEditing(null)}>Cancel</AdminButton>
              </div>
            </div>
          )}
          <AdminTable headers={["ID", "Title", "Order", "Unlock Level", "Created"]}
            rows={chapters.map(c => [c.id, c.title, c.orderIndex, c.unlockLevel || "-", new Date(c.created_at).toLocaleDateString()])} />
        </>
      )}

      {tab === "lore" && (
        <AdminTable headers={["ID", "Title", "Category", "Secret", "Created"]}
          rows={lore.map(l => [l.id, l.title, l.category, l.isSecret ? "🔒" : "🔓", new Date(l.created_at).toLocaleDateString()])} />
      )}
    </AdminPage>
  );
}
