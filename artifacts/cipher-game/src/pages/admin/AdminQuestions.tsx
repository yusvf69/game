import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPage, AdminTable, AdminButton, AdminInput, AdminSelect, adminFetch } from "./AdminLayout";
import {
  ListChecks, ToggleLeft, CheckSquare, Shield, Image, Music, Video,
  GripVertical, Eye, X, Trash2, ChevronUp, ChevronDown, Plus,
  Download, Upload, Sparkles, Tag, FolderTree,
} from "lucide-react";

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  type: string;
  questionText: string;
  difficulty: number;
  category: string;
  mediaUrl: string | null;
  correctAnswer: string;
  timeLimitSeconds: number;
  explanation: string;
  options: { id: number; text: string; isCorrect?: number }[];
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  displayName: string;
  domain: string;
}

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice", icon: ListChecks, color: "blue" },
  { value: "true_false", label: "True/False", icon: ToggleLeft, color: "green" },
  { value: "multi_answer", label: "Multi Answer", icon: CheckSquare, color: "purple" },
  { value: "cipher", label: "Cipher", icon: Shield, color: "cyan" },
  { value: "image", label: "Image", icon: Image, color: "orange" },
  { value: "audio", label: "Audio", icon: Music, color: "emerald" },
  { value: "video", label: "Video", icon: Video, color: "red" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  multiple_choice: "#3b82f6",
  true_false: "#22c55e",
  multi_answer: "#a855f7",
  cipher: "#06b6d4",
  image: "#f97316",
  audio: "#10b981",
  video: "#ef4444",
};

function TypeCard({ type, selected, onSelect }: {
  type: typeof QUESTION_TYPES[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
        selected
          ? "border-white/40 bg-white/10 shadow-lg shadow-white/5"
          : "border-zinc-800/60 bg-zinc-900/50 hover:border-zinc-600/60 hover:bg-zinc-800/40"
      }`}
    >
      <div className={`p-2.5 rounded-lg ${selected ? "bg-white/10" : "bg-zinc-800/50"}`}>
        <type.icon className="w-5 h-5" style={{ color: TYPE_COLORS[type.value] }} />
      </div>
      <span className="text-xs font-mono text-zinc-400">{type.label}</span>
    </motion.button>
  );
}

function DragHandle({ onDragStart, onDragOver, onDragEnd, onDrop, index, onMoveUp, onMoveDown, isFirst, isLast }: {
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  index: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className="flex items-center gap-1 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity"
    >
      <GripVertical className="w-4 h-4 text-zinc-500" />
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          className={`${isFirst ? "opacity-20 cursor-not-allowed" : "hover:text-zinc-300"} text-zinc-600`}
          disabled={isFirst}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          className={`${isLast ? "opacity-20 cursor-not-allowed" : "hover:text-zinc-300"} text-zinc-600`}
          disabled={isLast}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function LivePreview({ question }: { question: any }) {
  if (!question) return null;

  const type = question.type || "multiple_choice";
  const typeInfo = QUESTION_TYPES.find(t => t.value === type);

  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-950/80">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/50">
        <Eye className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-mono text-zinc-500">Live Preview</span>
        {typeInfo && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800" style={{ color: TYPE_COLORS[type] }}>
            {typeInfo.label}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <p className="font-mono text-sm text-zinc-100 leading-relaxed">
          {question.questionText || "Question text will appear here..."}
        </p>
        {question.mediaUrl && type === "image" && (
          <img src={question.mediaUrl} alt="preview" className="max-h-40 rounded-lg border border-zinc-800/60 object-cover" />
        )}
        {question.mediaUrl && type === "audio" && (
          <audio src={question.mediaUrl} controls className="w-full max-w-md" />
        )}
        {question.mediaUrl && type === "video" && (
          <video src={question.mediaUrl} controls className="w-full max-h-40 rounded-lg" />
        )}
        {type === "cipher" && (
          <div className="font-mono text-lg tracking-[0.2em] text-cyan-300 leading-loose break-all bg-cyan-950/20 rounded-lg p-4 border border-cyan-900/30">
            {question.questionText || "[CIPHER TEXT]"}
          </div>
        )}
        {type === "true_false" ? (
          <div className="flex gap-3">
            <div className="flex-1 px-4 py-3 rounded-lg border text-center text-sm font-mono bg-green-500/5 border-green-500/30 text-green-400">True</div>
            <div className="flex-1 px-4 py-3 rounded-lg border text-center text-sm font-mono bg-red-500/5 border-red-500/30 text-red-400">False</div>
          </div>
        ) : (
          <div className="space-y-2">
            {(question.options || []).map((opt: any, i: number) => (
              <div
                key={i}
                className={`px-4 py-3 rounded-lg border text-sm font-mono ${
                  opt.isCorrect
                    ? "bg-green-500/10 border-green-500/40 text-green-300"
                    : "bg-zinc-900/50 border-zinc-800/60 text-zinc-400"
                }`}
              >
                <span className="text-zinc-600 mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt.text || `Option ${i + 1}`}
              </div>
            ))}
          </div>
        )}
        {question.explanation && (
          <div className="text-xs font-mono text-zinc-600 italic border-t border-zinc-800/60 pt-3 mt-3">
            {question.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCount, setAiCount] = useState("5");
  const [aiCategory, setAiCategory] = useState("");
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ index: number; questionId?: number; error?: string }[] | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Categories state ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDisplayName, setNewCategoryDisplayName] = useState("");
  const [newCategoryDomain, setNewCategoryDomain] = useState("");

  function loadCategories() {
    adminFetch("/admin/categories").then(r => r.json()).then(d => {
      if (d.categories) setCategories(d.categories);
    }).catch(() => {});
  }

  function loadQuestions() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (categoryFilter) params.set("category", categoryFilter);
    adminFetch(`/admin/questions?${params}`).then(r => r.json()).then(d => {
      if (d.questions) { setQuestions(d.questions); setTotal(d.total); }
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { loadQuestions(); }, [page, categoryFilter]);
  useEffect(() => { loadCategories(); }, []);
  // When categories first load, update the editing form's category for new questions
  const initialCatLoaded = useRef(false);
  useEffect(() => {
    if (categories.length > 0 && !initialCatLoaded.current) {
      initialCatLoaded.current = true;
      setEditing((prev: any) => {
        if (prev && !prev.id && (!prev.category || prev.category === "general")) {
          return { ...prev, category: categories[0].name };
        }
        return prev;
      });
    }
  }, [categories]);

  async function deleteQuestion(id: number) {
    if (!confirm("Delete this question?")) return;
    await adminFetch(`/admin/questions/${id}`, { method: "DELETE" });
    setMsg("Deleted");
    loadQuestions();
  }

  async function deleteAllQuestions() {
    if (!confirm("Delete ALL questions? This cannot be undone!")) return;
    if (!confirm("Are you sure? All questions and their options will be permanently deleted.")) return;
    setLoading(true);
    try {
      await adminFetch("/admin/questions", { method: "DELETE" });
      setMsg("All questions deleted");
      loadQuestions();
    } catch {
      setMsg("Failed to delete all questions");
      setLoading(false);
    }
  }

  async function exportQuestions() {
    const r = await adminFetch("/admin/questions/export");
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported");
  }

  async function importQuestions(file: File) {
    const text = await file.text();
    const arr = JSON.parse(text);
    const r = await adminFetch("/admin/questions/import", {
      method: "POST",
      body: JSON.stringify(arr),
    });
    const d = await r.json();
    setMsg(d.error || `Imported ${d.imported} questions`);
    loadQuestions();
  }

  async function addCategory() {
    if (!newCategoryName) return;
    try {
      const r = await adminFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName, displayName: newCategoryDisplayName || newCategoryName, domain: newCategoryDomain }),
      });
      const d = await r.json();
      if (d.error) { setMsg(d.error); return; }
      setMsg(`Category "${newCategoryName}" created`);
      setNewCategoryName("");
      setNewCategoryDisplayName("");
      setNewCategoryDomain("");
      loadCategories();
    } catch { setMsg("Failed to create category"); }
  }

  async function deleteCategory(id: number, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await adminFetch(`/admin/categories/${id}`, { method: "DELETE" });
      setMsg(`Category "${name}" deleted`);
      loadCategories();
    } catch { setMsg("Failed to delete category"); }
  }

  async function saveQuestion() {
    if (!editing) return;
    setSaving(true);
    setMsg("");
    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/admin/questions/${editing.id}` : "/admin/questions";

    const body: any = {
      type: editing.type || "multiple_choice",
      questionText: editing.questionText,
      difficulty: editing.difficulty,
      category: editing.category,
      correctAnswer: editing.correctAnswer || "",
      timeLimitSeconds: editing.timeLimitSeconds,
      points: editing.points ?? 100,
      explanation: editing.explanation || "",
      mediaUrl: editing.mediaUrl || null,
    };

    if (editing.type === "true_false") {
      body.options = undefined;
    } else if (editing.options && editing.options.length > 0) {
      body.options = editing.options;
    }

    try {
      const r = await adminFetch(url, { method, body: JSON.stringify(body) });
      const d = await r.json();
      setMsg(d.error || "Saved");
      if (!d.error) { setEditing(null); loadQuestions(); }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

const DIFFICULTY_TIERS = [
  { id: "recruit", label: "RECRUIT", mult: "×0.5", value: 2, color: "text-green-400" },
  { id: "agent", label: "AGENT", mult: "×1.0", value: 4, color: "text-blue-400" },
  { id: "elite", label: "ELITE", mult: "×1.8", value: 7, color: "text-purple-400" },
  { id: "omega", label: "OMEGA", mult: "×3.0", value: 9, color: "text-red-400" },
];

  function initNewQuestion() {
    setEditing({
      type: "multiple_choice",
      questionText: "",
      difficulty: 4,
      category: categories[0]?.name || "",
      correctAnswer: "",
      timeLimitSeconds: 30,
      points: 100,
      explanation: "",
      mediaUrl: "",
      options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }],
    });
  }

  function editQuestion(q: Question) {
    setEditing({
      id: q.id,
      type: q.type || "multiple_choice",
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      correctAnswer: q.correctAnswer || "",
      timeLimitSeconds: q.timeLimitSeconds,
      points: (q as any).points ?? 100,
      explanation: q.explanation || "",
      mediaUrl: q.mediaUrl || "",
      options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect === 1 })),
    });
  }

  function updateEditing(field: string, value: any) {
    setEditing((prev: any) => ({ ...prev, [field]: value }));
  }

  function handleTypeChange(type: string) {
    const base = {
      ...editing,
      type,
      correctAnswer: "",
      mediaUrl: "",
    };
    if (type === "true_false") {
      base.options = [];
      base.correctAnswer = "true";
    } else {
      base.options = editing?.options?.length >= 2
        ? editing.options
        : [{ text: "", isCorrect: false }, { text: "", isCorrect: false }];
    }
    setEditing(base);
  }

  function addOption() {
    setEditing((prev: any) => ({
      ...prev,
      options: [...(prev.options || []), { text: "", isCorrect: false }],
    }));
  }

  function removeOption(index: number) {
    setEditing((prev: any) => ({
      ...prev,
      options: prev.options.filter((_: any, i: number) => i !== index),
    }));
  }

  function updateOption(index: number, field: string, value: any) {
    setEditing((prev: any) => {
      const opts = [...(prev.options || [])];
      opts[index] = { ...opts[index], [field]: value };
      return { ...prev, options: opts };
    });
  }

  function moveOption(fromIndex: number, toIndex: number) {
    setEditing((prev: any) => {
      const opts = [...(prev.options || [])];
      const [moved] = opts.splice(fromIndex, 1);
      opts.splice(toIndex, 0, moved);
      return { ...prev, options: opts };
    });
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveOption(dragIndex, index);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  const categoryOptions = categories.map(c => ({ label: `${c.displayName || c.name}${c.domain ? ` (${c.domain})` : ""}`, value: c.name }));

  function parseBulkText(text: string): any[] {
    const blocks = text.split(/^---\s*$/m).filter(b => b.trim());
    const questions: any[] = [];

    const DIFF_MAP: Record<string, number> = {
      recruit: 2, RECRUIT: 2, agent: 4, AGENT: 4, elite: 7, ELITE: 7, omega: 9, OMEGA: 9,
    };

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const q: any = { type: "multiple_choice", options: [], points: 100, difficulty: 4, timeLimitSeconds: 30, explanation: "", mediaUrl: "", correctAnswer: "" };

      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("Q:")) q.questionText = t.slice(2).trim();
        else if (/^[A-D]:/.test(t)) {
          const text = t.slice(2).trim();
          const isCorrect = text.endsWith("*");
          q.options.push({ text: isCorrect ? text.slice(0, -1).trim() : text, isCorrect });
        } else if (t.startsWith("TYPE:")) q.type = t.slice(5).trim().toLowerCase();
        else if (t.startsWith("CAT:")) q.category = t.slice(4).trim();
        else if (t.startsWith("DIFF:")) q.difficulty = (DIFF_MAP[t.slice(5).trim()] ?? parseInt(t.slice(5).trim())) || 4;
        else if (t.startsWith("PTS:")) q.points = parseInt(t.slice(4).trim()) || 100;
        else if (t.startsWith("EXP:")) q.explanation = t.slice(4).trim();
        else if (t.startsWith("URL:")) q.mediaUrl = t.slice(4).trim();
      }

      if (q.type === "true_false" && q.options.length === 0) q.correctAnswer = "true";
      if (q.type === "cipher" && !q.correctAnswer) q.correctAnswer = q.questionText || "";

      if (q.questionText) questions.push(q);
    }
    return questions;
  }

  async function handleBulkSubmit() {
    if (!bulkText.trim()) return;
    setBulkParsing(true);
    setBulkResults(null);
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) { setMsg("No valid questions found"); setBulkParsing(false); return; }
    try {
      const r = await adminFetch("/admin/questions/bulk", {
        method: "POST",
        body: JSON.stringify({ questions: parsed }),
      });
      const d = await r.json();
      setBulkResults(d.results || []);
      setMsg(d.created > 0 ? `Created ${d.created} question(s)` : "All failed");
      if (d.created > 0) loadQuestions();
    } catch { setMsg("Network error"); }
    setBulkParsing(false);
  }

  const headers = ["ID", "Type", "Text", "Category", "Diff", "Options", "Created", "Actions"];
  const rows = questions.map(q => {
    const typeInfo = QUESTION_TYPES.find(t => t.value === q.type);
    return [
      q.id,
      <span className="flex items-center gap-1.5 text-xs" style={{ color: TYPE_COLORS[q.type] || "#888" }}>
        {typeInfo && <typeInfo.icon className="w-3.5 h-3.5" />}
        {typeInfo?.label || q.type}
      </span>,
      q.questionText?.substring(0, 40) || "",
      q.category,
      q.difficulty,
      q.options?.length || "-",
      new Date(q.created_at).toLocaleDateString(),
      <div className="flex gap-1">
        <AdminButton onClick={() => editQuestion(q)}>Edit</AdminButton>
        <AdminButton variant="danger" onClick={() => deleteQuestion(q.id)}>Del</AdminButton>
      </div>,
    ];
  });

  return (
    <AdminPage title="Advanced Question Builder">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <AdminInput
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Filter by category..."
          style={{ maxWidth: "200px" }}
        />
        <AdminButton onClick={initNewQuestion}>+ New Question</AdminButton>
        <AdminButton onClick={exportQuestions}>
          <Download className="w-4 h-4 inline mr-1" /> Export
        </AdminButton>
        <AdminButton onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 inline mr-1" /> Import
        </AdminButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) importQuestions(file);
            e.target.value = "";
          }}
        />
        <AdminButton onClick={() => setShowAiPanel(!showAiPanel)}>
          <Sparkles className="w-4 h-4 inline mr-1" /> AI Generate
        </AdminButton>
        <AdminButton onClick={() => { setShowBulkPanel(!showBulkPanel); setBulkResults(null); }}>
          <ListChecks className="w-4 h-4 inline mr-1" /> Bulk Add
        </AdminButton>
        <AdminButton onClick={() => setShowCategoryPanel(!showCategoryPanel)}>
          <Tag className="w-4 h-4 inline mr-1" /> Categories
        </AdminButton>
        <AdminButton variant="danger" onClick={deleteAllQuestions}>
          <Trash2 className="w-4 h-4 inline mr-1" /> Delete All
        </AdminButton>
        {msg && <span className="text-cyan-400 text-xs">{msg}</span>}
      </div>

      {/* ─── Categories Manager ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCategoryPanel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <FolderTree className="w-4 h-4" /> Category Manager
                </h3>
                <button onClick={() => setShowCategoryPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add new category form */}
              <div className="flex gap-2 items-end mb-4 flex-wrap">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Name</label>
                  <AdminInput value={newCategoryName} onChange={setNewCategoryName} placeholder="e.g. cryptography" style={{ width: "140px" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Display Name</label>
                  <AdminInput value={newCategoryDisplayName} onChange={setNewCategoryDisplayName} placeholder="e.g. Cryptography" style={{ width: "160px" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Domain</label>
                  <AdminInput value={newCategoryDomain} onChange={setNewCategoryDomain} placeholder="e.g. cipher_division" style={{ width: "160px" }} />
                </div>
                <AdminButton onClick={addCategory}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </AdminButton>
              </div>

              {/* Existing categories list */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {categories.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-600">No categories yet. Create one above.</p>
                ) : (
                  [...new Set(categories.map(c => c.domain).filter(Boolean))].sort().map(domain => (
                    <div key={domain}>
                      {domain && (
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-2 mb-1">{domain}</p>
                      )}
                      {categories.filter(c => c.domain === domain).map(cat => (
                        <div key={cat.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-zinc-800/40 group">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-300">{cat.displayName || cat.name}</span>
                            <span className="text-[10px] font-mono text-zinc-600">{cat.name}</span>
                          </div>
                          <button
                            onClick={() => deleteCategory(cat.id, cat.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-950/30 text-zinc-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI Generator ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Question Generator</h3>
                <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Count</label>
                  <AdminInput value={aiCount} onChange={setAiCount} placeholder="5" type="number" style={{ width: "80px" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">Category (optional)</label>
                  <AdminInput value={aiCategory} onChange={setAiCategory} placeholder="e.g. technology" style={{ width: "160px" }} />
                </div>
                <AdminButton onClick={async () => {
                  setAiGenerating(true);
                  try {
                    const r = await adminFetch("/admin/questions/generate", {
                      method: "POST", body: JSON.stringify({ count: parseInt(aiCount) || 5, category: aiCategory || undefined, useAI: true }),
                    });
                    const d = await r.json();
                    setMsg(d.error || `AI generated ${d.questionsGenerated} questions`);
                    if (d.questionsGenerated > 0) loadQuestions();
                  } catch { setMsg("Failed to generate"); }
                  setAiGenerating(false);
                  setShowAiPanel(false);
                }} disabled={aiGenerating}>
                  <Sparkles className="w-4 h-4 mr-1" /> {aiGenerating ? "Generating..." : "Generate"}
                </AdminButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bulk Add ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkPanel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Bulk Add Questions
                </h3>
                <button onClick={() => setShowBulkPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <pre className="text-[10px] font-mono text-zinc-400 mb-3 leading-relaxed p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/60 select-all cursor-text overflow-x-auto">
                <span className="text-zinc-600">Q:</span> Question text here<br />
                <span className="text-zinc-600">A:</span> Correct option<span className="text-yellow-500">*</span>  <span className="text-zinc-700">// * = correct</span><br />
                <span className="text-zinc-600">B:</span> Wrong option<br />
                <span className="text-zinc-600">TYPE:</span> multiple_choice  <span className="text-zinc-700">// multiple_choice, true_false, multi_answer, cipher, image, audio, video</span><br />
                <span className="text-zinc-600">CAT:</span> category_name<br />
                <span className="text-zinc-600">DIFF:</span> AGENT  <span className="text-zinc-700">// RECRUIT / AGENT / ELITE / OMEGA</span><br />
                <span className="text-zinc-600">PTS:</span> 100  <span className="text-zinc-700">// optional, default 100</span><br />
                <span className="text-zinc-600">EXP:</span> Explanation text<br />
                <span className="text-zinc-600">URL:</span> https://...  <span className="text-zinc-700">// media URL or data URL</span><br />
                <span className="text-zinc-600" style={{ letterSpacing: "0.2em" }}>---</span>  <span className="text-zinc-700">// separator between questions</span>
              </pre>

              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
                rows={12}
                placeholder={`Q: What is the capital of France?\nA: Berlin\nB: Paris*\nC: London\nCAT: geography\nDIFF: AGENT\nPTS: 100\n---\nQ: Listen to the clip\nTYPE: audio\nURL: https://example.com/sound.mp3\nCAT: science\nDIFF: ELITE`}
                className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-colors resize-none mb-3" />

              <div className="flex items-center gap-3">
                <AdminButton onClick={handleBulkSubmit} disabled={bulkParsing || !bulkText.trim()}>
                  <ListChecks className="w-4 h-4 mr-1" /> {bulkParsing ? "Creating..." : `Add Questions (${parseBulkText(bulkText).length} parsed)`}
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => { setBulkText(""); setBulkResults(null); }}>Clear</AdminButton>
              </div>

              {bulkResults && bulkResults.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`font-mono text-xs px-3 py-1.5 rounded ${r.questionId ? "text-green-400 bg-green-500/5" : "text-red-400 bg-red-500/5"}`}>
                      #{r.index + 1}: {r.questionId ? `✓ Created (ID: ${r.questionId})` : `✗ ${r.error}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Question Editor ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {editing && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-mono text-zinc-300">
                {editing.id ? "Edit Question" : "New Question"}
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: TYPE_COLORS[editing.type], background: `${TYPE_COLORS[editing.type]}15` }}>
                  {QUESTION_TYPES.find(t => t.value === editing.type)?.label || editing.type}
                </span>
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-2">Question Type</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {QUESTION_TYPES.map(t => (
                      <TypeCard
                        key={t.value}
                        type={t}
                        selected={editing.type === t.value}
                        onSelect={() => handleTypeChange(t.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">
                    {editing.type === "cipher" ? "Cipher Text" : "Question Text"}
                  </label>
                  <textarea
                    value={editing.questionText || ""}
                    onChange={e => updateEditing("questionText", e.target.value)}
                    rows={editing.type === "cipher" ? 4 : 3}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                    placeholder={editing.type === "cipher" ? "Enter encrypted cipher text..." : "Enter question text..."}
                  />
                </div>

                {["image", "audio", "video"].includes(editing.type) && (
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">
                      {editing.type === "image" ? "Image" : editing.type === "audio" ? "Audio" : "Video"}
                    </label>
                    <div className="flex gap-2">
                      <AdminInput
                        value={editing.mediaUrl || ""}
                        onChange={v => updateEditing("mediaUrl", v)}
                        placeholder={`Enter ${editing.type} URL...`}
                        style={{ flex: 1 }}
                      />
                      <label className="px-3 py-2 font-mono text-[11px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-zinc-200 transition-all cursor-pointer whitespace-nowrap">
                        Upload
                        <input type="file" accept={editing.type === "image" ? "image/*" : editing.type === "audio" ? "audio/*" : "video/*"}
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadProgress(10);
                            const reader = new FileReader();
                            reader.addEventListener("loadstart", () => setUploadProgress(20));
                            reader.addEventListener("progress", (pe: ProgressEvent<FileReader>) => {
                              if (pe.lengthComputable) {
                                setUploadProgress(Math.min(90, Math.round((pe.loaded / pe.total) * 100)));
                              }
                            });
                            reader.addEventListener("load", () => {
                              setUploadProgress(100);
                              setTimeout(() => setUploadProgress(0), 800);
                              updateEditing("mediaUrl", reader.result);
                            });
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                    {editing.mediaUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800/60 max-h-40">
                        {editing.type === "image" ? (
                          <img src={editing.mediaUrl} alt="" className="max-h-36 object-contain mx-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : editing.type === "audio" ? (
                          <audio src={editing.mediaUrl} controls className="w-full p-2" />
                        ) : (
                          <video src={editing.mediaUrl} controls className="w-full max-h-36" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {editing.type === "cipher" && (
                  <div className="bg-cyan-950/20 rounded-lg p-4 border border-cyan-900/30">
                    <p className="font-mono text-[10px] text-cyan-400 tracking-widest mb-2">SIGNAL INTERCEPT</p>
                    <p className="font-mono text-xs text-cyan-300/60">
                      The cipher text above will be displayed with tracking spacing and a blue theme during gameplay.
                    </p>
                  </div>
                )}

                {editing.type === "true_false" && (
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Correct Answer</label>
                    <div className="flex gap-3">
                      {["true", "false"].map(val => (
                        <button
                          key={val}
                          onClick={() => updateEditing("correctAnswer", val)}
                          className={`flex-1 px-4 py-3 rounded-lg border text-center text-sm font-mono transition-all cursor-pointer ${
                            editing.correctAnswer === val
                              ? val === "true"
                                ? "bg-green-500/10 border-green-500/40 text-green-400"
                                : "bg-red-500/10 border-red-500/40 text-red-400"
                              : "bg-zinc-900/50 border-zinc-800/60 text-zinc-500 hover:border-zinc-600"
                          }`}
                        >
                          {val === "true" ? "True" : "False"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editing.type !== "true_false" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                        Options
                        {editing.type === "multi_answer" && <span className="ml-1 text-yellow-500">(multi-select)</span>}
                      </label>
                      {editing.type === "multi_answer" && (
                        <span className="text-[10px] text-yellow-600/60">Check all correct answers</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(editing.options || []).map((opt: QuestionOption, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <DragHandle
                            index={i}
                            isFirst={i === 0}
                            isLast={i === (editing.options?.length || 0) - 1}
                            onMoveUp={() => moveOption(i, i - 1)}
                            onMoveDown={() => moveOption(i, i + 1)}
                            onDragStart={() => handleDragStart(i)}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDragEnd}
                          />
                          <span className="text-[10px] font-mono text-zinc-600 w-4">{String.fromCharCode(65 + i)}.</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => updateOption(i, "text", e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-colors"
                          />
                          <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                            opt.isCorrect
                              ? "bg-green-500/10 border-green-500/40 text-green-400"
                              : "bg-zinc-900/50 border-zinc-800/60 text-zinc-500 hover:border-zinc-600"
                          }`}>
                            <input
                              type={editing.type === "multi_answer" ? "checkbox" : "radio"}
                              name="correct-option"
                              checked={opt.isCorrect}
                              onChange={e => {
                                if (editing.type === "multi_answer") {
                                  updateOption(i, "isCorrect", e.target.checked);
                                } else {
                                  const opts = (editing.options || []).map((o: QuestionOption, j: number) => ({
                                    ...o,
                                    isCorrect: j === i,
                                  }));
                                  setEditing((prev: any) => ({ ...prev, options: opts }));
                                }
                              }}
                              className="sr-only"
                            />
                            {opt.isCorrect ? "✓" : "○"}
                          </label>
                          {(editing.options?.length || 0) > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(i)}
                              className="p-1.5 rounded-lg hover:bg-red-950/30 text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <button
                      onClick={addOption}
                      className="mt-2 flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Category</label>
                    <AdminSelect key={categories.length}
                      value={editing.category || categories[0]?.name || "general"}
                      onChange={v => updateEditing("category", v)}
                      options={categoryOptions.length > 0 ? categoryOptions : [{ label: "general", value: "general" }]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Difficulty</label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_TIERS.map(tier => {
                        const selected = editing.difficulty === tier.value;
                        return (
                          <button key={tier.id} onClick={() => updateEditing("difficulty", tier.value)}
                            className={`px-3 py-1.5 font-mono text-[11px] tracking-wider rounded transition-all ${
                              selected
                                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                                : "bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400"
                            }`}>
                            {tier.label} <span className="text-zinc-700">{tier.mult}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Time Limit (sec)</label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={editing.timeLimitSeconds || 30}
                      onChange={e => updateEditing("timeLimitSeconds", parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Points</label>
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      step={10}
                      value={editing.points ?? 100}
                      onChange={e => updateEditing("points", parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Correct Answer (text)</label>
                    <input
                      type="text"
                      value={editing.correctAnswer || ""}
                      onChange={e => updateEditing("correctAnswer", e.target.value)}
                      placeholder={editing.type === "true_false" ? "Auto-set from selection" : "Stored as reference"}
                      readOnly={editing.type === "true_false"}
                      className={`w-full px-3 py-2 rounded-lg border font-mono text-sm focus:outline-none focus:border-zinc-600 transition-colors ${
                        editing.type === "true_false"
                          ? "bg-zinc-900/50 border-zinc-800/30 text-zinc-600"
                          : "bg-zinc-950 border-zinc-800 text-zinc-200"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1.5">Explanation (shown after answer)</label>
                  <textarea
                    value={editing.explanation || ""}
                    onChange={e => updateEditing("explanation", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                    placeholder="Explain the correct answer..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <AdminButton onClick={saveQuestion} disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading...
                      </span>
                    ) : (editing.id ? "Update Question" : "Create Question")}
                  </AdminButton>
                  <AdminButton variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</AdminButton>
                </div>
                {saving && (
                  <div className="mt-3 w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full animate-pulse transition-all" style={{ width: "100%" }} />
                  </div>
                )}
              </div>

              <div ref={previewRef} className="lg:sticky lg:top-4 self-start">
                <LivePreview question={editing} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-zinc-600 text-sm font-mono">Loading...</p>
      ) : (
        <AdminTable headers={headers} rows={rows} />
      )}

      <div className="mt-3 flex items-center gap-3 text-xs font-mono text-zinc-600">
        <AdminButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</AdminButton>
        <span>Page {page} of {Math.ceil(total / 20)} ({total} total)</span>
        <AdminButton disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</AdminButton>
      </div>
    </AdminPage>
  );
}
