import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AdminPage, AdminTable, AdminButton, AdminInput, AdminSelect, adminFetch,
} from "./AdminLayout";
import {
  BookOpen, GitBranch, FileText, Plus, Save, X, Lock, Unlock,
} from "lucide-react";

type Tab = "chapters" | "graph" | "lore";

interface Chapter {
  id: number; title: string; description: string; orderIndex: number;
  unlockLevel: number; coverImageUrl: string | null; created_at: string;
}
interface Node {
  id: number; chapterId: number; type: string; content: string;
  speakerName: string; mediaUrl: string | null; orderIndex: number;
}
interface LoreEntry {
  id: number; title: string; content: string; category: string;
  isSecret: boolean; unlockCondition: string; created_at: string;
}

export default function AdminStory() {
  const [tab, setTab] = useState<Tab>("chapters");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editing, setEditing] = useState<Partial<Chapter> | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(true);

  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  const [lore, setLore] = useState<LoreEntry[]>([]);
  const [loreLoading, setLoreLoading] = useState(true);

  useEffect(() => { loadChapters(); loadLore(); }, []);

  async function loadChapters() {
    setChaptersLoading(true);
    try { const d = await (await adminFetch("/admin/story/chapters")).json();
      if (d.chapters) setChapters(d.chapters); } catch {} finally { setChaptersLoading(false); }
  }

  async function loadLore() {
    setLoreLoading(true);
    try { const d = await (await adminFetch("/admin/story/lore")).json();
      if (d.lore) setLore(d.lore); } catch {} finally { setLoreLoading(false); }
  }

  async function loadNodes(id: number) {
    setGraphLoading(true);
    try { const d = await (await adminFetch(`/admin/story/nodes?chapterId=${id}`)).json();
      if (d.nodes) setNodes(d.nodes); } catch {} finally { setGraphLoading(false); }
  }

  useEffect(() => {
    if (selectedChapterId) loadNodes(Number(selectedChapterId));
    else setNodes([]);
  }, [selectedChapterId]);

  async function saveChapter() {
    if (!editing) return;
    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/admin/story/chapters/${editing.id}` : "/admin/story/chapters";
    try { const d = await (await adminFetch(url, { method, body: JSON.stringify({
      title: editing.title, description: editing.description,
      orderIndex: editing.orderIndex, unlockLevel: editing.unlockLevel,
    }) })).json(); } catch {}
    setEditing(null);
    loadChapters();
  }

  async function deleteChapter(id: number) {
    try { await adminFetch(`/admin/story/chapters/${id}`, { method: "DELETE" }); } catch {}
    loadChapters();
  }

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: "chapters", label: "Chapters", icon: BookOpen },
    { key: "graph", label: "Story Graph", icon: GitBranch },
    { key: "lore", label: "Lore", icon: FileText },
  ];

  return (
    <AdminPage title="Story Management" description="Manage story chapters, narrative graph, and lore entries">
      <div className="flex gap-2 mb-6 border-b border-zinc-800/60 pb-3">
        {tabs.map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key} onClick={() => setTab(key)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 border border-transparent"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "chapters" && (
          <motion.div key="chapters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                      {editing.id ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editing.id ? "Edit Chapter" : "New Chapter"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AdminInput value={editing.title || ""} onChange={v => setEditing({ ...editing, title: v })} placeholder="Chapter title" />
                      <AdminInput value={String(editing.orderIndex ?? "")} onChange={v => setEditing({ ...editing, orderIndex: Number(v) || 0 })} placeholder="Order index" type="number" />
                      <AdminInput value={String(editing.unlockLevel ?? "")} onChange={v => setEditing({ ...editing, unlockLevel: Number(v) || 0 })} placeholder="Unlock level" type="number" />
                      <div className="sm:col-span-2">
                        <textarea
                          value={editing.description || ""}
                          onChange={e => setEditing({ ...editing, description: e.target.value })}
                          placeholder="Description" rows={3}
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <AdminButton onClick={saveChapter}><Save className="w-3.5 h-3.5 mr-1.5" />Save</AdminButton>
                      <AdminButton variant="ghost" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5 mr-1.5" />Cancel</AdminButton>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{chapters.length} chapter{chapters.length !== 1 ? "s" : ""}</span>
              <AdminButton onClick={() => setEditing({ orderIndex: chapters.length + 1, unlockLevel: 1 })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Chapter
              </AdminButton>
            </div>

            {chaptersLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading chapters...</div>
            ) : (
              <AdminTable
                headers={["ID", "Title", "Order", "Unlock Level", "Cover Image", "Actions"]}
                rows={chapters.map(c => [
                  <span key="id" className="font-mono text-xs text-muted-foreground">{c.id}</span>,
                  <span key="title" className="font-medium">{c.title}</span>,
                  <span key="order" className="font-mono text-xs">{c.orderIndex}</span>,
                  <span key="ul" className="font-mono text-xs">{c.unlockLevel ?? "-"}</span>,
                  <span key="cov" className="text-xs text-muted-foreground truncate max-w-[120px] block">{c.coverImageUrl || "-"}</span>,
                  <div key="act" className="flex gap-1.5">
                    <AdminButton onClick={() => setEditing(c)}>Edit</AdminButton>
                    <AdminButton variant="danger" onClick={() => deleteChapter(c.id)}>Del</AdminButton>
                  </div>,
                ])}
              />
            )}
          </motion.div>
        )}

        {tab === "graph" && (
          <motion.div key="graph" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 mb-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Select Chapter</label>
              <AdminSelect
                value={selectedChapterId}
                onChange={setSelectedChapterId}
                options={[
                  { label: "Choose a chapter...", value: "" },
                  ...chapters.map(c => ({ label: `${c.orderIndex}. ${c.title}`, value: String(c.id) })),
                ]}
              />
            </div>

            {!selectedChapterId ? (
              <div className="text-sm text-muted-foreground py-12 text-center flex flex-col items-center gap-2">
                <GitBranch className="w-8 h-8 opacity-30" />
                Select a chapter to browse its narrative nodes
              </div>
            ) : graphLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading nodes...</div>
            ) : nodes.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No nodes found for this chapter.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nodes.map((node, i) => (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-primary/70">#{node.orderIndex}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {node.type}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2">{node.content}</p>
                    {node.speakerName && (
                      <p className="text-xs text-muted-foreground mt-2 italic">— {node.speakerName}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "lore" && (
          <motion.div key="lore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {loreLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading lore...</div>
            ) : (
              <AdminTable
                headers={["ID", "Title", "Category", "Secret", "Created"]}
                rows={lore.map(l => [
                  <span key="id" className="font-mono text-xs text-muted-foreground">{l.id}</span>,
                  <span key="title" className="font-medium">{l.title}</span>,
                  <span key="cat" className="text-xs">{l.category || "-"}</span>,
                  l.isSecret
                    ? <span key="sec" className="flex items-center gap-1 text-xs text-orange-400"><Lock className="w-3 h-3" />Secret</span>
                    : <span key="sec" className="flex items-center gap-1 text-xs text-green-400"><Unlock className="w-3 h-3" />Public</span>,
                  <span key="date" className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>,
                ])}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}
