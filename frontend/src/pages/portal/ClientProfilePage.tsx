import { useState } from "react";
import { useClientAuthStore } from "../../store/clientAuth";
import { CheckCircle, Edit3, Eye, EyeOff, Shield } from "lucide-react";

export default function ClientProfilePage() {
  const client = useClientAuthStore(s => s.client)!;
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    phone: client.phone,
    address: client.address || "",
    city: client.city || "",
    occupation: client.occupation || "",
    employer: client.employer || "",
  });
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passSaved, setPassSaved] = useState(false);

  const save = async () => {
    const token = localStorage.getItem("philix_portal_token");
    try {
      const r = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setEditMode(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // ignore — show no error, form still shows
    }
  };

  const changePass = async () => {
    setPassError("");
    if (passForm.newPass.length < 8) { setPassError("New password must be at least 8 characters"); return; }
    if (passForm.newPass !== passForm.confirm) { setPassError("Passwords do not match"); return; }
    const token = localStorage.getItem("philix_portal_token");
    try {
      const r = await fetch("/api/portal/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: passForm.current, newPassword: passForm.newPass }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setPassError(data.error || data.message || "Failed to change password"); return; }
      setPassSaved(true);
      setPassForm({ current: "", newPass: "", confirm: "" });
      setTimeout(() => setPassSaved(false), 3000);
    } catch {
      setPassError("Network error — please try again");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your personal information and settings</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-800/40 px-3 py-2 rounded-xl">
            <CheckCircle size={14} /> Saved!
          </div>
        )}
      </div>

      {/* Avatar + overview */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900 border border-indigo-800/30 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center font-black text-2xl text-white flex-shrink-0">
          {client.avatarInitials}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-white">{client.firstName} {client.lastName}</div>
          <div className="text-indigo-400 text-sm">{client.clientNumber}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              client.status === "ACTIVE" ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/40" : "bg-slate-800 text-slate-500 border-slate-700"
            }`}>{client.status}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              client.kycStatus === "VERIFIED" ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/40" :
              client.kycStatus === "SUBMITTED" ? "bg-amber-900/30 text-amber-400 border-amber-800/40" :
              "bg-slate-800 text-slate-500 border-slate-700"
            }`}>
              {client.kycStatus === "VERIFIED" ? "✓ KYC Verified" : `KYC: ${client.kycStatus.replace("_", " ")}`}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-1">Member since {new Date(client.joinedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
        </div>
        <button onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-400 border border-indigo-800/50 rounded-xl hover:bg-indigo-900/20 transition-all">
          <Edit3 size={13} /> {editMode ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Personal info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { l: "First Name", v: client.firstName, editable: false },
            { l: "Last Name", v: client.lastName, editable: false },
            { l: "Email Address", v: client.email, editable: false },
            { l: "NRC Number", v: client.nrcNumber || "—", editable: false },
            { l: "Date of Birth", v: client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString("en-GB") : "—", editable: false },
            { l: "Gender", v: client.gender || "—", editable: false },
          ].map(f => (
            <div key={f.l}>
              <label className="text-xs text-slate-500 mb-1 block">{f.l}</label>
              <div className="bg-slate-800/50 rounded-xl px-3 py-2.5 text-sm text-slate-400 border border-slate-800">{f.v}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1">
          <Shield size={10} /> Personal details can only be changed by contacting Philix Finance staff
        </div>
      </div>

      {/* Editable contact info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Contact & Address</h3>
        {[
          { k: "phone", l: "Phone Number" },
          { k: "address", l: "Physical Address" },
          { k: "city", l: "City / Town" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
            {editMode ? (
              <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={(form as Record<string, string>)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
            ) : (
              <div className="bg-slate-800/50 rounded-xl px-3 py-2.5 text-sm text-slate-300 border border-slate-800">{(form as Record<string, string>)[f.k] || "—"}</div>
            )}
          </div>
        ))}
        {editMode && (
          <button onClick={save} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
            Save Changes
          </button>
        )}
      </div>

      {/* Employment */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Employment Information</h3>
        {[
          { k: "occupation", l: "Occupation" },
          { k: "employer", l: "Employer / Business" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
            {editMode ? (
              <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={(form as Record<string, string>)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
            ) : (
              <div className="bg-slate-800/50 rounded-xl px-3 py-2.5 text-sm text-slate-300 border border-slate-800">{(form as Record<string, string>)[f.k] || "—"}</div>
            )}
          </div>
        ))}
        {editMode && (
          <button onClick={save} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
            Save Changes
          </button>
        )}
      </div>

      {/* Change password */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Change Password</h3>
        {passSaved && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-800/40 px-3 py-2 rounded-xl">
            <CheckCircle size={14} /> Password updated successfully
          </div>
        )}
        {passError && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 px-3 py-2 rounded-xl">{passError}</div>
        )}
        {[
          { k: "current", l: "Current Password", ph: "Enter current password" },
          { k: "newPass", l: "New Password", ph: "Min 8 characters" },
          { k: "confirm", l: "Confirm New Password", ph: "Re-enter new password" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder={f.ph} value={(passForm as Record<string, string>)[f.k]}
                onChange={e => setPassForm(p => ({ ...p, [f.k]: e.target.value }))} />
              {f.k === "current" && (
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={changePass}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-2.5 rounded-xl text-sm border border-slate-700 transition-all">
          Update Password
        </button>
        <p className="text-xs text-slate-600">Password must be at least 8 characters</p>
      </div>

      {/* Danger zone */}
      <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 space-y-3">
        <h3 className="font-bold text-red-400">Account Actions</h3>
        <p className="text-xs text-slate-500">Contact Philix Finance to close or suspend your account. We may require written notice.</p>
        <button className="text-sm text-red-400 border border-red-900/40 hover:bg-red-900/20 px-4 py-2 rounded-xl transition-all">
          Request Account Closure
        </button>
      </div>
    </div>
  );
}
