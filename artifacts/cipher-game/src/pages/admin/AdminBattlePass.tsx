import { useState, useEffect } from "react";
import { AdminPage, AdminTable, adminFetch } from "./AdminLayout";

export default function AdminBattlePass() {
  const [bp, setBp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/battle-pass").then(r => r.json()).then(d => {
      if (d.battlePass) setBp(d.battlePass);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminPage title="Battle Pass Management">
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : (
        <AdminTable headers={["Level", "Name", "XP Required", "Free Reward", "Premium Reward"]}
          rows={bp.map(b => [b.level, b.name, b.xpRequired, b.freeReward ? "Yes" : "-", b.premiumReward ? "Yes" : "-"])} />
      )}
    </AdminPage>
  );
}
