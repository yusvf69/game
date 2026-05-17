import { useState, useEffect } from "react";
import { AdminPage, AdminTable, AdminButton, AdminInput, AdminSelect, adminFetch } from "./AdminLayout";

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const categories = ["technology", "security", "history", "logic", "intelligence", "general"];

  function loadQuestions() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("category", search);
    adminFetch(`/admin/questions?${params}`).then(r => r.json()).then(d => {
      if (d.questions) { setQuestions(d.questions); setTotal(d.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadQuestions(); }, [page, search]);

  async function deleteQuestion(id: number) {
    if (!confirm("Delete this question?")) return;
    const r = await adminFetch(`/admin/questions/${id}`, { method: "DELETE" });
    const d = await r.json();
    setMsg(d.error || "Deleted");
    loadQuestions();
  }

  async function saveQuestion() {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/admin/questions/${editing.id}` : "/admin/questions";
    const r = await adminFetch(url, { method, body: JSON.stringify(editing) });
    const d = await r.json();
    setMsg(d.error || "Saved");
    setEditing(null);
    loadQuestions();
  }

  const headers = ["ID", "Text", "Category", "Difficulty", "Options", "Created", "Actions"];
  const rows = questions.map(q => [
    q.id, q.questionText?.substring(0, 50) || "", q.category, q.difficulty,
    q.options?.length || 0, new Date(q.created_at).toLocaleDateString(),
    <div style={{ display: "flex", gap: "4px" }}>
      <AdminButton onClick={() => setEditing(q)}>Edit</AdminButton>
      <AdminButton variant="danger" onClick={() => deleteQuestion(q.id)}>Del</AdminButton>
    </div>,
  ]);

  return (
    <AdminPage title="Question Management">
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
        <AdminInput value={search} onChange={setSearch} placeholder="Filter by category..." style={{ maxWidth: "200px" }} />
        <AdminButton onClick={() => setEditing({ type: "multiple_choice", difficulty: 3, category: "general", options: [], timeLimitSeconds: 30 })}>
          + New Question
        </AdminButton>
        {msg && <span style={{ color: "#00e5ff", fontSize: "0.8rem" }}>{msg}</span>}
      </div>

      {editing && (
        <div style={{
          background: "#0d1a2a", border: "1px solid #1a3a4a", borderRadius: "12px", padding: "20px", marginBottom: "20px",
        }}>
          <h3 style={{ color: "#00e5ff", marginBottom: "16px" }}>{editing.id ? "Edit Question" : "New Question"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", marginBottom: "4px" }}>Question Text</label>
              <textarea value={editing.questionText || ""} onChange={e => setEditing({ ...editing, questionText: e.target.value })}
                style={{ width: "100%", minHeight: "60px", padding: "8px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628", color: "#b8d4e3", fontSize: "0.875rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", marginBottom: "4px" }}>Category</label>
              <AdminSelect value={editing.category || "general"} onChange={v => setEditing({ ...editing, category: v })}
                options={categories.map(c => ({ label: c, value: c }))} />
              <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", margin: "8px 0 4px" }}>Difficulty (1-10)</label>
              <input type="number" min={1} max={10} value={editing.difficulty || 3} onChange={e => setEditing({ ...editing, difficulty: parseInt(e.target.value) })}
                style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628", color: "#b8d4e3" }} />
              <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", margin: "8px 0 4px" }}>Time Limit (sec)</label>
              <input type="number" value={editing.timeLimitSeconds || 30} onChange={e => setEditing({ ...editing, timeLimitSeconds: parseInt(e.target.value) })}
                style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628", color: "#b8d4e3" }} />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "block", marginBottom: "4px" }}>Options</label>
            {(editing.options || []).map((opt: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
                <input type="text" value={opt.text || ""} onChange={e => {
                  const opts = [...(editing.options || [])];
                  opts[i] = { ...opts[i], text: e.target.value };
                  setEditing({ ...editing, options: opts });
                }} style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #1a3a4a", background: "#0a1628", color: "#b8d4e3" }} />
                <label style={{ fontSize: "0.75rem", color: "#5a7a8a", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={opt.isCorrect || false} onChange={e => {
                    const opts = [...(editing.options || [])];
                    opts[i] = { ...opts[i], isCorrect: e.target.checked };
                    setEditing({ ...editing, options: opts });
                  }} /> Correct
                </label>
                <AdminButton variant="danger" onClick={() => {
                  setEditing({ ...editing, options: (editing.options || []).filter((_: any, j: number) => j !== i) });
                }}>✕</AdminButton>
              </div>
            ))}
            <AdminButton onClick={() => {
              setEditing({ ...editing, options: [...(editing.options || []), { text: "", isCorrect: false }] });
            }}>+ Add Option</AdminButton>
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <AdminButton onClick={saveQuestion}>Save</AdminButton>
            <AdminButton variant="ghost" onClick={() => setEditing(null)}>Cancel</AdminButton>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "#5a7a8a" }}>Loading...</p> : <AdminTable headers={headers} rows={rows} />}

      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "#5a7a8a" }}>
        <AdminButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</AdminButton>
        <span>Page {page} of {Math.ceil(total / 20)} ({total} total)</span>
        <AdminButton disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</AdminButton>
      </div>
    </AdminPage>
  );
}
