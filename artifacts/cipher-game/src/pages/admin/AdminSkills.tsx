import { useState, useEffect } from "react";
import { AdminPage, AdminTable, adminFetch } from "./AdminLayout";

export default function AdminSkills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/admin/skills").then(r => r.json()).then(d => {
      if (d.skills) setSkills(d.skills);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminPage title="Skill Tree">
      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : (
        <AdminTable headers={["ID", "Name", "Branch", "Level", "Max Level", "XP Cost"]}
          rows={skills.map(s => [s.id, s.name, s.branch, s.level, s.maxLevel, s.xpCost])} />
      )}
    </AdminPage>
  );
}
