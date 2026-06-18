import { useState, useEffect, useCallback } from "react";
import { Mail, CheckCircle, Bell, X, ChevronRight, RefreshCw } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

interface Notification {
  id: string;
  subject: string;
  body: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  LOAN:        "text-blue-400 bg-blue-900/30 border-blue-800/40",
  PAYMENT:     "text-emerald-400 bg-emerald-900/30 border-emerald-800/40",
  KYC:         "text-purple-400 bg-purple-900/30 border-purple-800/40",
  ACCOUNT:     "text-indigo-400 bg-indigo-900/30 border-indigo-800/40",
  LOAN_UPDATE: "text-blue-400 bg-blue-900/30 border-blue-800/40",
  GENERAL:     "text-slate-400 bg-slate-800 border-slate-700",
};

export default function ClientNotificationsPage() {
  const token = useClientAuthStore(s => s.accessToken);
  const client = useClientAuthStore(s => s.client);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notification | null>(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/notifications", { headers: authHeader });
      if (r.ok) {
        const data = await r.json();
        setNotifications(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function markRead(ids: string[] | "all") {
    await fetch("/api/portal/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }

  async function openNotification(n: Notification) {
    setSelected(n);
    if (!n.isRead) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
      await markRead([n.id]);
    }
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    await markRead("all");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Messages and alerts from Philix Finance</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/40 px-3 py-1.5 rounded-xl">
              Mark all read
            </button>
          )}
          <button onClick={load} className="text-slate-500 hover:text-slate-300 p-1.5 border border-slate-700 rounded-xl">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {unread > 0 && (
        <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-800/40 rounded-xl px-4 py-3 text-sm">
          <Bell size={14} className="text-indigo-400" />
          <span className="text-indigo-300">You have <span className="font-bold">{unread}</span> unread notification{unread > 1 ? "s" : ""}</span>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS.GENERAL}`}>
                    {selected.category.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(selected.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <h3 className="font-bold text-slate-200 text-sm">{selected.subject}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.body}</div>
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail size={11} /> Sent to: <span className="text-slate-400">{client?.email}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-600">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <div>No notifications yet</div>
          <div className="text-xs mt-1 text-slate-700">Messages from Philix Finance will appear here</div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button key={n.id} onClick={() => openNotification(n)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${n.isRead ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-indigo-900/10 border-indigo-800/30 hover:border-indigo-700/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.isRead ? "bg-slate-800" : "bg-indigo-600/20"}`}>
                  <Bell size={14} className={n.isRead ? "text-slate-500" : "text-indigo-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                      <span className={`text-sm font-medium truncate ${n.isRead ? "text-slate-400" : "text-slate-200"}`}>{n.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[n.category] ?? CATEGORY_COLORS.GENERAL}`}>
                        {n.category.replace("_", " ")}
                      </span>
                      <ChevronRight size={12} className="text-slate-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {notifications.filter(n => n.isRead).length > 0 && (
        <div className="text-center">
          <div className="flex items-center gap-2 text-xs text-slate-600 justify-center">
            <CheckCircle size={11} /> {notifications.filter(n => n.isRead).length} read
          </div>
        </div>
      )}
    </div>
  );
}
