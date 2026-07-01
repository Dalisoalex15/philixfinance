// @ts-nocheck
import { useState, useEffect } from "react";
import { CheckCircle, X, Upload, AlertCircle, Loader2 } from "lucide-react";

function portalToken() { return localStorage.getItem("philix_portal_token") ?? ""; }
function portalH() { return { "Content-Type": "application/json", Authorization: `Bearer ${portalToken()}` }; }

interface LoanApp { id: string; reference: string; status: string; productType: string; amountRequested: number; }

interface PhotoSlot { key: string; label: string; hint: string; required: boolean; }

const SLOTS: PhotoSlot[] = [
  { key: "front",   label: "Front View",                       hint: "Clear photo showing the front of the item",         required: true  },
  { key: "back",    label: "Back / Side View",                  hint: "Back or side angle of the collateral",              required: true  },
  { key: "serial",  label: "Serial / Model Number",             hint: "Close-up of the serial number, model sticker",     required: false },
  { key: "receipt", label: "Purchase Receipt / Ownership Docs", hint: "Original receipt, title, or ownership proof",      required: false },
];

const COLLATERAL_TYPES = [
  "Electronics (TV, Phone, Laptop)", "Furniture", "Vehicle", "Land Title",
  "Livestock", "Business Stock", "Jewellery", "Other",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CollateralSubmissionPage() {
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);

  const [collateralType, setCollateralType] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [applicationRef, setApplicationRef] = useState("");
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submittedRef, setSubmittedRef] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/portal/applications", { headers: portalH() });
        if (r.ok) {
          const d = await r.json();
          const apps: LoanApp[] = (Array.isArray(d) ? d : (d.applications ?? [])).filter(
            (a: LoanApp) => ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"].includes(a.status)
          );
          setLoans(apps);
          if (apps.length > 0) setApplicationRef(apps[0].reference);
        }
      } finally { setLoansLoading(false); }
    })();
  }, []);

  const addPhoto = (key: string, file: File) => {
    setPhotos(p => ({ ...p, [key]: file }));
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
    const url = URL.createObjectURL(file);
    setPreviews(p => ({ ...p, [key]: url }));
  };

  const removePhoto = (key: string) => {
    setPhotos(p => { const n = { ...p }; delete n[key]; return n; });
    setPreviews(p => { const n = { ...p }; if (n[key]) { URL.revokeObjectURL(n[key]); delete n[key]; } return n; });
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!collateralType) e.type = "Select a collateral type";
    if (!description.trim()) e.description = "Describe the collateral";
    if (!estimatedValue || isNaN(Number(estimatedValue))) e.value = "Enter a valid estimated value";
    if (!photos.front) e.front = "Front photo is required";
    if (!photos.back) e.back = "Back/side photo is required";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setApiError("");
    try {
      // Convert all photo files to base64 data URLs
      const photoBase64: Record<string, string> = {};
      for (const [key, file] of Object.entries(photos)) {
        photoBase64[key] = await fileToBase64(file);
      }

      const body: Record<string, unknown> = {
        collateralType,
        collateralDesc: description.trim(),
        collateralValue: Number(estimatedValue),
        photos: photoBase64,
      };
      if (applicationRef) body.applicationRef = applicationRef;

      const r = await fetch("/api/portal/applications/collateral", {
        method: "POST",
        headers: portalH(),
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `Server error (${r.status})`);
      }

      const data = await r.json();
      setSubmittedRef(data.reference ?? applicationRef);
      setSubmitted(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Collateral Submitted!</h2>
          <p className="text-slate-400 text-sm">
            Your collateral photos and details have been saved. A Loan Officer will assess and confirm within 2 business days.
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/30">Type</span>
            <span className="text-white/70">{collateralType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30">Est. Value</span>
            <span className="text-white/70">K{Number(estimatedValue).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30">Photos</span>
            <span className="text-white/70">{Object.keys(photos).length} uploaded</span>
          </div>
          {submittedRef && (
            <div className="flex justify-between">
              <span className="text-white/30">Loan Ref</span>
              <span className="text-white/70 font-mono">{submittedRef}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/30">Status</span>
            <span className="text-amber-400 font-semibold">Under Review</span>
          </div>
        </div>
        <button
          onClick={() => { setSubmitted(false); setPhotos({}); setPreviews({}); setDescription(""); setCollateralType(""); setEstimatedValue(""); setApiError(""); }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm">
          Submit Another Collateral
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submit Collateral</h1>
        <p className="text-white/35 text-sm mt-1">Upload photos and details of items you're pledging as loan security</p>
      </div>

      <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300">
          <strong className="text-blue-200">Photo Requirements:</strong> Photos must be clear, well-lit, and taken within the last 7 days.
          The item must be identifiable in the photos. Blurry or unclear photos will be rejected.
        </div>
      </div>

      {/* Collateral details */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white/80">Collateral Details</h3>

        <div>
          <label className="text-xs text-white/35 mb-1 block">Collateral Type *</label>
          <select
            className="w-full bg-white/[0.05] border border-white/8 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            value={collateralType}
            onChange={e => { setCollateralType(e.target.value); setErrors(p => ({ ...p, type: "" })); }}
          >
            <option value="" className="bg-[#0B1F3A]">Select type…</option>
            {COLLATERAL_TYPES.map(c => <option key={c} className="bg-[#0B1F3A]">{c}</option>)}
          </select>
          {errors.type && <p className="text-red-400 text-xs mt-1">{errors.type}</p>}
        </div>

        <div>
          <label className="text-xs text-white/35 mb-1 block">Description *</label>
          <input
            className="w-full bg-white/[0.05] border border-white/8 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-white/20"
            placeholder="e.g. Samsung 50-inch Smart TV — Model QA50Q60 — Black"
            value={description}
            onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: "" })); }}
          />
          {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/35 mb-1 block">Estimated Market Value (K) *</label>
            <input
              type="number"
              className="w-full bg-white/[0.05] border border-white/8 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-white/20"
              placeholder="e.g. 4500"
              value={estimatedValue}
              onChange={e => { setEstimatedValue(e.target.value); setErrors(p => ({ ...p, value: "" })); }}
            />
            {errors.value && <p className="text-red-400 text-xs mt-1">{errors.value}</p>}
          </div>
          <div>
            <label className="text-xs text-white/35 mb-1 block">Link to Loan Application</label>
            {loansLoading ? (
              <div className="flex items-center gap-2 py-2.5 text-white/30 text-sm">
                <Loader2 size={13} className="animate-spin" /> Loading your loans…
              </div>
            ) : loans.length === 0 ? (
              <div className="text-xs text-white/25 py-2.5">No active applications found</div>
            ) : (
              <select
                className="w-full bg-white/[0.05] border border-white/8 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                value={applicationRef}
                onChange={e => setApplicationRef(e.target.value)}
              >
                {loans.map(l => (
                  <option key={l.id} value={l.reference} className="bg-[#0B1F3A]">
                    {l.reference} — {l.status}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Photo uploads */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-5">
        <h3 className="font-bold text-white/80">Photo Documentation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SLOTS.map(slot => {
            const file = photos[slot.key];
            const preview = previews[slot.key];
            const hasError = !!errors[slot.key];
            return (
              <div key={slot.key}>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-xs text-white/45 font-medium">{slot.label}</span>
                  {slot.required && <span className="text-red-400 text-xs">*</span>}
                  {!slot.required && <span className="text-xs text-white/20">(optional)</span>}
                </div>
                {file ? (
                  <div className="relative border border-emerald-600/40 bg-emerald-900/10 rounded-xl overflow-hidden">
                    {preview && (
                      <img src={preview} alt={slot.label} className="w-full h-28 object-cover" />
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 bg-black/30">
                      <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-emerald-300 truncate">{file.name}</div>
                        <div className="text-[10px] text-white/25">{(file.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button onClick={() => removePhoto(slot.key)} className="text-white/20 hover:text-red-400">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-900/10 ${hasError ? "border-red-700/50 bg-red-900/10" : "border-white/8"}`}>
                    <Upload size={20} className={`mb-2 ${hasError ? "text-red-500" : "text-white/20"}`} />
                    <div className="text-xs text-white/35 font-medium text-center">Tap to upload</div>
                    <div className="text-[10px] text-white/20 text-center mt-0.5">{slot.hint}</div>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && addPhoto(slot.key, e.target.files[0])} />
                  </label>
                )}
                {hasError && <p className="text-red-400 text-xs mt-1">{errors[slot.key]}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {apiError && (
        <div className="bg-red-900/20 border border-red-500/25 rounded-xl p-4 flex items-start gap-2 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          {apiError}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
      >
        {submitting
          ? <><Loader2 size={15} className="animate-spin" /> Uploading & Submitting…</>
          : <><Upload size={15} /> Submit Collateral</>}
      </button>

      <p className="text-center text-xs text-white/20 pb-4">
        By submitting, you consent to Philix Finance officers physically inspecting this collateral item.
      </p>
    </div>
  );
}
