import { useState, useEffect } from "react";
import { AdminPage, AdminButton, AdminTable, AdminInput, adminFetch } from "./AdminLayout";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    adminFetch("/admin/settings").then(r => r.json()).then(d => {
      if (d.settings) setSettings(d.settings);
    }).catch(() => {}).finally(() => setLoading(false));
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

  return (
    <AdminPage title="Settings">
      {msg && <p style={{ color: "#00e5ff", fontSize: "0.8rem", marginBottom: "12px" }}>{msg}</p>}
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : (
        <>
          <AdminTable headers={["Key", "Value"]} rows={settings.map(s => [s.key, JSON.stringify(s.value)])} />
          <div style={{ marginTop: "20px", background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ color: "#00e5ff", fontSize: "0.9rem", marginBottom: "12px" }}>Add Setting</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", marginBottom: "4px" }}>Key</label>
                <AdminInput value={newKey} onChange={setNewKey} placeholder="e.g. maintenance_mode" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", marginBottom: "4px" }}>Value (JSON)</label>
                <AdminInput value={newValue} onChange={setNewValue} placeholder='e.g. "true"' />
              </div>
              <AdminButton onClick={addSetting}>Add</AdminButton>
            </div>
          </div>
        </>
      )}
    </AdminPage>
  );
}
