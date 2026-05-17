import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, adminFetch } from "./AdminLayout";

export default function AdminShop() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    adminFetch("/admin/shop/items").then(r => r.json()).then(d => {
      if (d.items) setItems(d.items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function deleteItem(id: number) {
    if (!confirm("Delete this item?")) return;
    const r = await adminFetch(`/admin/shop/items/${id}`, { method: "DELETE" });
    const d = await r.json();
    setMsg(d.error || "Deleted");
    adminFetch("/admin/shop/items").then(r => r.json()).then(d => { if (d.items) setItems(d.items); });
  }

  return (
    <AdminPage title="Shop Management">
      {msg && <p style={{ color: "#00e5ff", fontSize: "0.8rem", marginBottom: "12px" }}>{msg}</p>}
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : (
        <AdminTable headers={["ID", "Name", "Type", "Price (Coins)", "Rarity", "Limited", "Actions"]}
          rows={items.map(item => [
            item.id, item.name, item.type, item.priceCoins || "-", item.rarity || "-",
            item.isLimited ? "Yes" : "No",
            <AdminButton variant="danger" onClick={() => deleteItem(item.id)}>Delete</AdminButton>,
          ])} />
      )}
    </AdminPage>
  );
}
