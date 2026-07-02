import { useState, useEffect, useCallback } from "react";
import { Users, Plus, ChevronDown, ChevronUp, CheckSquare, RefreshCw, Loader2, Trash2, MapPin, Calendar } from "lucide-react";
import { useAuthStore } from "../store/auth";

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  location?: string;
  attendees: string;
  agenda?: string;
  minutes: string;
  actionItems?: unknown;
  recordedBy: string;
  createdAt: string;
}

const MEETING_TYPES = ["MANAGEMENT", "BOARD", "STAFF", "CLIENT", "CREDIT_COMMITTEE"];

const TYPE_COLOR: Record<string, string> = {
  MANAGEMENT: "text-blue-400",
  BOARD: "text-purple-400",
  STAFF: "text-slate-400",
  CLIENT: "text-amber-400",
  CREDIT_COMMITTEE: "text-red-400",
};

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

export default function MeetingMinutesPage() {
  const user = useAuthStore(s => s.user);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", meetingType: "STAFF", meetingDate: "",
    location: "", attendees: "", agenda: "", minutes: "",
    recordedBy: user ? `${user.firstName} ${user.lastName}` : "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/meetings", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setMeetings(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title || !form.meetingDate || !form.minutes || !form.attendees) return;
    setSaving(true);
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (r.ok) { const item = await r.json(); setMeetings(p => [item, ...p]); setShowForm(false); resetForm(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/meetings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setMeetings(p => p.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const resetForm = () => setForm({
    title: "", meetingType: "STAFF", meetingDate: "",
    location: "", attendees: "", agenda: "", minutes: "",
    recordedBy: user ? `${user.firstName} ${user.lastName}` : "",
  });

  const f = (v: string) => setForm(p => ({ ...p, ...JSON.parse(v) }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users size={22} className="text-[#C9A227]" /> Meeting Minutes
          </h1>
          <p className="text-sm text-white/35 mt-1">Record and archive all staff, management, and board meeting minutes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> New Minutes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Meetings", value: meetings.length, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "This Month", value: meetings.filter(m => new Date(m.meetingDate).getMonth() === new Date().getMonth()).length, color: "text-[#C9A227]", bg: "bg-amber-400/10" },
          { label: "Action Items", value: meetings.reduce((s, m) => s + (Array.isArray(m.actionItems) ? (m.actionItems as unknown[]).length : 0), 0), color: "text-emerald-400", bg: "bg-emerald-400/10" },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <CheckSquare size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-white/35">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Record Meeting Minutes</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Meeting Title *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="e.g. Weekly Credit Committee"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Meeting Type</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.meetingType} onChange={e => setForm(p => ({ ...p, meetingType: e.target.value }))}>
                {MEETING_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Meeting Date *</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.meetingDate} onChange={e => setForm(p => ({ ...p, meetingDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Location</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Board Room / Zoom" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Attendees * (comma-separated)</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="John Doe, Jane Smith" value={form.attendees} onChange={e => setForm(p => ({ ...p, attendees: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Recorded By</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.recordedBy} onChange={e => setForm(p => ({ ...p, recordedBy: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-white/40 mb-1 block">Agenda</label>
              <textarea rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40 resize-none"
                placeholder="Agenda items..." value={form.agenda} onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-white/40 mb-1 block">Minutes *</label>
              <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40 resize-none"
                placeholder="Detailed meeting minutes..." value={form.minutes} onChange={e => setForm(p => ({ ...p, minutes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save Minutes
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#C9A227]" /></div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20 text-white/20"><Users size={36} className="mx-auto mb-3 opacity-30" /><p>No meeting minutes recorded yet</p></div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => {
            const isOpen = expanded === m.id;
            const attendeeList = m.attendees.split(",").map(a => a.trim()).filter(Boolean);
            return (
              <div key={m.id} className="bg-[#0B1F3A] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02]"
                  onClick={() => setExpanded(isOpen ? null : m.id)}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <div className="font-semibold text-white text-sm">{m.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-white/35 flex items-center gap-1"><Calendar size={10} /> {new Date(m.meetingDate).toLocaleDateString("en-ZM")}</span>
                        {m.location && <span className="text-[11px] text-white/35 flex items-center gap-1"><MapPin size={10} /> {m.location}</span>}
                        <span className="text-[11px] text-white/35">{attendeeList.length} attendees</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-white/30">Recorded by {m.recordedBy}</span>
                    <button onClick={e => { e.stopPropagation(); del(m.id); }} className="p-1.5 text-white/15 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                    {isOpen ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-white/5 px-5 py-4 space-y-4">
                    <div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Attendees</div>
                      <div className="flex flex-wrap gap-1.5">
                        {attendeeList.map(a => (
                          <span key={a} className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                    {m.agenda && (
                      <div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Agenda</div>
                        <p className="text-sm text-white/60 whitespace-pre-wrap">{m.agenda}</p>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Minutes</div>
                      <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{m.minutes}</p>
                    </div>
                    {Array.isArray(m.actionItems) && (m.actionItems as unknown[]).length > 0 && (
                      <div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Action Items</div>
                        <ul className="space-y-1">
                          {(m.actionItems as { task?: string; assignee?: string; due?: string }[]).map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                              <CheckSquare size={13} className="text-[#C9A227] mt-0.5 flex-shrink-0" />
                              <span>{item.task || JSON.stringify(item)}</span>
                              {item.assignee && <span className="text-white/30 ml-auto flex-shrink-0">— {item.assignee}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* suppress unused warning */ void f}
    </div>
  );
}
