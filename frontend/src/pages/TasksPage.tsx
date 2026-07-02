import { useState, useEffect, useCallback } from "react";
import {
  Plus, CheckSquare, Clock, AlertTriangle, CheckCircle,
  User, Trash2, RefreshCw, Loader2, Calendar,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

const PRIORITIES: Record<string, string> = {
  URGENT: "text-red-400 bg-red-500/15 border border-red-500/25",
  HIGH:   "text-orange-400 bg-orange-500/15 border border-orange-500/25",
  MEDIUM: "text-amber-400 bg-amber-500/15 border border-amber-500/25",
  LOW:    "text-slate-400 bg-white/5 border border-white/10",
};

const STATUS_STYLES: Record<string, { icon: typeof Clock; cls: string; label: string }> = {
  PENDING:     { icon: Clock,        cls: "text-amber-400",  label: "Pending" },
  IN_PROGRESS: { icon: AlertTriangle,cls: "text-indigo-400", label: "In Progress" },
  COMPLETED:   { icon: CheckCircle,  cls: "text-emerald-400",label: "Completed" },
  CANCELLED:   { icon: CheckSquare,  cls: "text-slate-500",  label: "Cancelled" },
};

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignee?: { firstName: string; lastName: string };
  createdBy?: { firstName: string; lastName: string };
  completedAt?: string;
  createdAt: string;
}

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

const api = {
  list: async (status?: string) => {
    const q = status && status !== "ALL" ? `?status=${status}` : "";
    const r = await fetch(`/api/tasks${q}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) throw new Error("Failed to load tasks");
    return r.json() as Promise<Task[]>;
  },
  create: async (body: Record<string, string>) => {
    const r = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("Failed to create task");
    return r.json() as Promise<Task>;
  },
  updateStatus: async (id: string, status: string) => {
    const r = await fetch(`/api/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) throw new Error("Failed to update task");
    return r.json() as Promise<Task>;
  },
  delete: async (id: string) => {
    const r = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!r.ok) throw new Error("Failed to delete task");
  },
};

export default function TasksPage() {
  const user = useAuthStore(s => s.user);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [newTask, setNewTask]       = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks(await api.list()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === "ALL" ? tasks : tasks.filter(t => t.status === statusFilter);

  const counts = {
    all:        tasks.length,
    pending:    tasks.filter(t => t.status === "PENDING").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    completed:  tasks.filter(t => t.status === "COMPLETED").length,
  };

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
      };
      if (newTask.dueDate) body.dueDate = newTask.dueDate;
      if (newTask.assigneeId) body.assigneeId = newTask.assigneeId;
      const created = await api.create(body);
      setTasks(prev => [created, ...prev]);
      setNewTask({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeId: "" });
      setShowNew(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      const updated = await api.updateStatus(id, status);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CheckSquare size={22} className="text-[#C9A227]" />
            Task Management
          </h1>
          <p className="text-sm text-white/35 mt-1">Assign, track, and complete internal operations tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "ALL",         label: `All (${counts.all})` },
          { key: "PENDING",     label: `Pending (${counts.pending})` },
          { key: "IN_PROGRESS", label: `In Progress (${counts.inProgress})` },
          { key: "COMPLETED",   label: `Completed (${counts.completed})` },
        ].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              statusFilter === s.key
                ? "bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]"
                : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* New task form */}
      {showNew && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={14} className="text-[#C9A227]" /> New Task
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Title *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40" value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Call client about overdue loan" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Description</label>
              <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40 resize-none" rows={2}
                value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Priority</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40" value={newTask.priority}
                onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
                {["URGENT", "HIGH", "MEDIUM", "LOW"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Due Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving || !newTask.title.trim()}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Task
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#C9A227]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <CheckSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks in this category</p>
          <button onClick={() => setShowNew(true)} className="mt-3 text-[#C9A227] text-xs hover:underline">
            + Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const cfg = STATUS_STYLES[task.status] ?? STATUS_STYLES.PENDING;
            const StatusIcon = cfg.icon;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

            return (
              <div key={task.id} className={`bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 transition-all hover:border-white/10 ${task.status === "COMPLETED" ? "opacity-55" : ""}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon size={15} className={`flex-shrink-0 mt-0.5 ${cfg.cls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${task.status === "COMPLETED" ? "text-white/40 line-through" : "text-white"}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PRIORITIES[task.priority] ?? PRIORITIES.LOW}`}>
                        {task.priority}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400 border border-red-500/25">OVERDUE</span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-white/35 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/25">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User size={10} /> {task.assignee.firstName} {task.assignee.lastName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
                          <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString("en-ZM")}
                        </span>
                      )}
                      {task.createdBy && (
                        <span>By: {task.createdBy.firstName} {task.createdBy.lastName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.status === "PENDING" && (
                      <button onClick={() => handleStatus(task.id, "IN_PROGRESS")}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20 transition-all">
                        Start
                      </button>
                    )}
                    {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                      <button onClick={() => handleStatus(task.id, "COMPLETED")}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all">
                        Done
                      </button>
                    )}
                    {task.status === "COMPLETED" && (
                      <span className="text-[11px] text-emerald-400 font-semibold">✓ Done</span>
                    )}
                    <button onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
