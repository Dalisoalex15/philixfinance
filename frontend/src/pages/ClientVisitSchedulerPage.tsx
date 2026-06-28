import { useState, useEffect } from "react";
import { MapPin, Plus, X, CheckCircle, Clock, XCircle, Calendar, User, RefreshCw } from "lucide-react";

interface Visit {
  id: string;
  clientName: string;
  dateTime: string;
  officer: string;
  purpose: string;
  notes: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

const STORAGE_KEY = "philix_visits";
const PURPOSES = ["Overdue Payment", "Account Verification", "KYC Update", "Loan Recovery", "Follow-up", "Other"];
const STATUS_CFG = {
  SCHEDULED:  { label: "Scheduled",  color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",    icon: <Clock className="w-3 h-3" />, dot: "bg-blue-500" },
  COMPLETED:  { label: "Completed",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle className="w-3 h-3" />, dot: "bg-emerald-500" },
  CANCELLED:  { label: "Cancelled",  color: "text-red-500",     bg: "bg-red-50 border-red-200",      icon: <XCircle className="w-3 h-3" />, dot: "bg-red-500" },
};

function loadVisits(): Visit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveVisits(v: Visit[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }

function getWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ClientVisitSchedulerPage() {
  const [visits, setVisits] = useState<Visit[]>(loadVisits());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientName: "", dateTime: "", officer: "", purpose: PURPOSES[0], notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { saveVisits(visits); }, [visits]);

  function addVisit() {
    if (!form.clientName || !form.dateTime || !form.officer) return;
    setSaving(true);
    setTimeout(() => {
      const v: Visit = { id: crypto.randomUUID(), ...form, status: "SCHEDULED" };
      setVisits(prev => [v, ...prev]);
      setForm({ clientName: "", dateTime: "", officer: "", purpose: PURPOSES[0], notes: "" });
      setShowModal(false);
      setSaving(false);
    }, 400);
  }

  function updateStatus(id: string, status: Visit["status"]) {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  }

  const weekDays = getWeekDays();

  function visitsOnDay(d: Date) {
    return visits.filter(v => {
      const vd = new Date(v.dateTime);
      return vd.toDateString() === d.toDateString();
    });
  }

  const upcoming = visits.filter(v => v.status === "SCHEDULED").sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#C9A227]" />
              Client Visit Scheduler
            </h1>
            <p className="text-sm text-slate-500 mt-1">Schedule and track field visits for overdue clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Schedule Visit
          </button>
        </div>

        {/* Weekly Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="bg-[#0B1F3A] text-white px-5 py-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A227]" />
            <span className="font-semibold text-sm">This Week</span>
            <span className="text-xs opacity-60 ml-1">{weekDays[0].toLocaleDateString()} – {weekDays[6].toLocaleDateString()}</span>
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {weekDays.map((day, i) => {
              const dayVisits = visitsOnDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`min-h-28 p-2 ${isToday ? "bg-[#C9A227]/5" : ""}`}>
                  <p className={`text-xs font-semibold mb-1 ${isToday ? "text-[#C9A227]" : "text-slate-500"}`}>{DAY_LABELS[i]}</p>
                  <p className={`text-sm font-bold mb-2 ${isToday ? "text-[#C9A227]" : "text-[#0B1F3A]"}`}>{day.getDate()}</p>
                  {dayVisits.map(v => {
                    const cfg = STATUS_CFG[v.status];
                    return (
                      <div key={v.id} className={`text-xs p-1.5 rounded-lg mb-1 border ${cfg.bg} flex items-start gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`} />
                        <div className="truncate">
                          <p className="font-medium truncate leading-tight">{v.clientName}</p>
                          <p className="opacity-60 text-xs">{new Date(v.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Visits List */}
        <h2 className="text-lg font-bold text-[#0B1F3A] mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#C9A227]" />
          Upcoming Visits ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No upcoming visits scheduled</p>
            <p className="text-xs mt-1">Click "Schedule Visit" to create one</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {visits.map(v => {
              const cfg = STATUS_CFG[v.status];
              const dt = new Date(v.dateTime);
              return (
                <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#0B1F3A] rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#C9A227]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-[#0B1F3A]">{v.clientName}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{v.officer}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.purpose}</span>
                      </div>
                      {v.notes && <p className="text-xs text-slate-400 mt-1 italic">"{v.notes}"</p>}
                    </div>
                  </div>
                  {v.status === "SCHEDULED" && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateStatus(v.id, "COMPLETED")}
                        className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-medium"
                      >
                        <CheckCircle className="w-3 h-3 inline mr-1" />Done
                      </button>
                      <button
                        onClick={() => updateStatus(v.id, "CANCELLED")}
                        className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                      >
                        <XCircle className="w-3 h-3 inline mr-1" />Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0B1F3A] text-lg">Schedule Field Visit</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: "clientName", label: "Client Name *", type: "text", placeholder: "Search client name..." },
                { key: "officer",    label: "Officer Assigned *", type: "text", placeholder: "Officer name" },
                { key: "dateTime",   label: "Date & Time *", type: "datetime-local", placeholder: "" },
                { key: "notes",      label: "Notes", type: "text", placeholder: "Optional visit notes..." },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string>)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <select
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={addVisit}
                disabled={saving || !form.clientName || !form.dateTime || !form.officer}
                className="flex-1 py-2 rounded-lg bg-[#C9A227] text-white text-sm font-medium hover:bg-[#b8911f] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Schedule Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
