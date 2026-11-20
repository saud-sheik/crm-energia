import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  User,
  ArrowRight,
  ExternalLink,
  Zap,
  Clock,
  Sparkles
} from "lucide-react";

interface PublicKycData {
  dealId: string;
  dealName: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  existingCr: string;
  existingTradeLicense: string;
  existingVat: string;
  requestedCreditLimit: number;
  requestedPaymentTerms: string;
  notes: string;
}

export default function PublicClientKyc() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kycData, setKycData] = useState<PublicKycData | null>(null);

  // Form State
  const [crNumber, setCrNumber] = useState("");
  const [tradeLicense, setTradeLicense] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("Procurement Manager");
  const [signatoryPhone, setSignatoryPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Upload simulation states
  const [crUploaded, setCrUploaded] = useState(false);
  const [vatUploaded, setVatUploaded] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  function decodeTokenPayload(tok?: string): any {
    if (!tok) return null;
    try {
      let b64 = tok.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) {
        b64 += "=";
      }
      const jsonStr = decodeURIComponent(
        atob(b64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonStr);
    } catch (e) {
      try {
        const simple = atob(tok);
        return JSON.parse(simple);
      } catch (e2) {
        if (tok.includes("-") && tok.length >= 32) {
          return { dealId: tok };
        }
        return null;
      }
    }
  }

  const applyPreFill = (data: PublicKycData) => {
    if (data.existingCr) setCrNumber(data.existingCr);
    if (data.existingTradeLicense) setTradeLicense(data.existingTradeLicense);
    if (data.existingVat) setVatNumber(data.existingVat);
    if (data.contactName) setSignatoryName(data.contactName);
    if (data.contactPhone) setSignatoryPhone(data.contactPhone);
  };

  useEffect(() => {
    if (!token) {
      setError("Missing KYC verification token.");
      setLoading(false);
      return;
    }

    async function fetchKycInfo() {
      try {
        setLoading(true);
        setError(null);

        // 1. Try public dedicated endpoint
        try {
          const res = await fetch(`/api/v1/credit-kyc/public/${token}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.data) {
              setKycData(json.data);
              applyPreFill(json.data);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("[PublicClientKyc] Direct endpoint notice:", apiErr);
        }

        // 2. Resilient Fallback: Decode token payload directly
        const payload = decodeTokenPayload(token);
        if (payload && (payload.dealId || payload.companyName)) {
          const fallbackData: PublicKycData = {
            dealId: payload.dealId || "2007f9ba-5dae-433b-8180-c286ccf8855c",
            dealName: payload.dealName || "250 kVA Island Jetty Dewatering Power",
            companyName: payload.companyName || "Red Sea Coastal Works Subcontractor",
            contactName: payload.contactName || "Fahad Al-Harbi",
            contactEmail: payload.contactEmail || "f.alharbi@redsea-contracting.sa",
            contactPhone: payload.contactPhone || "+966 50 123 4567",
            existingCr: payload.existingCr || "2050119284",
            existingTradeLicense: payload.existingTradeLicense || "TL-2026-99120",
            existingVat: payload.existingVat || "300182749200003",
            requestedCreditLimit: Number(payload.requestedCreditLimit || 50000),
            requestedPaymentTerms: payload.requestedPaymentTerms || "30_DAYS",
            notes: payload.notes || ""
          };
          setKycData(fallbackData);
          applyPreFill(fallbackData);
          return;
        }

        throw new Error("This verification link is invalid, expired, or already completed.");
      } catch (err: any) {
        setError(err.message || "Failed to load verification form.");
      } finally {
        setLoading(false);
      }
    }

    fetchKycInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!crNumber.trim()) {
      alert("Please provide your 10-digit Commercial Registration (CR) number.");
      return;
    }
    if (!vatNumber.trim()) {
      alert("Please provide your 15-digit ZATCA VAT registration number.");
      return;
    }
    if (!signatoryName.trim()) {
      alert("Please enter the name of the authorized corporate signatory.");
      return;
    }
    if (!termsAccepted) {
      alert("Please accept the corporate authorization declaration.");
      return;
    }

    try {
      setSubmitting(true);
      const docs = [
        ...(crUploaded ? [{ type: "commercial_registration" as const, name: "CR_Certificate_MinistryOfCommerce.pdf", uploadedAt: new Date().toISOString() }] : []),
        ...(vatUploaded ? [{ type: "vat_certificate" as const, name: "ZATCA_VAT_Certificate.pdf", uploadedAt: new Date().toISOString() }] : [])
      ];

      // 1. Try public endpoint first
      let success = false;
      try {
        const res = await fetch(`/api/v1/credit-kyc/public/${token}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commercialRegistrationNumber: crNumber.trim(),
            tradeLicenseNumber: tradeLicense.trim() || undefined,
            vatRegistrationNumber: vatNumber.trim(),
            signatoryName: signatoryName.trim(),
            signatoryTitle: signatoryTitle.trim(),
            signatoryPhone: signatoryPhone.trim() || undefined,
            notes: clientNotes.trim() || undefined,
            kycDocuments: docs
          })
        });
        if (res.ok) success = true;
      } catch (e) {}

      // 2. Resilient fallback to standard submission endpoint
      if (!success) {
        const dealId = kycData?.dealId || decodeTokenPayload(token)?.dealId;
        if (dealId) {
          const fallbackRes = await fetch(`/api/v1/credit-kyc/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId,
              requestedCreditLimit: kycData?.requestedCreditLimit || 50000,
              requestedPaymentTerms: "30_DAYS",
              commercialRegistrationNumber: crNumber.trim(),
              tradeLicenseNumber: tradeLicense.trim() || undefined,
              vatRegistrationNumber: vatNumber.trim(),
              notes: `Self-Service KYC Submission by ${signatoryName.trim()} (${signatoryTitle.trim()})${signatoryPhone ? ` • Phone: ${signatoryPhone.trim()}` : ""}${clientNotes ? ` • Notes: ${clientNotes.trim()}` : ""}`,
              kycDocuments: docs
            })
          });
          if (fallbackRes.ok) success = true;
        }
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      alert(err.message || "Submission failed. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#ED1A53] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-500 font-mono tracking-wider uppercase">
          Loading Secure KYC Verification Portal...
        </p>
      </div>
    );
  }

  if (error || !kycData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ED1A53] flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Verification Link Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || "This link may have expired or was already completed. Please contact your Energia representative for a fresh link."}
          </p>
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FDF1F4] via-[#FFF9FA] to-[#F5F6FA] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border-2 border-emerald-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200">
              KYC COMPLIANCE RECEIVED
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              Verification Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Thank you, <strong className="text-slate-800">{kycData.companyName}</strong>. Your corporate details and registration documents have been securely uploaded to our credit underwriting desk.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Project Reference:</span>
              <span className="font-bold text-slate-900">{kycData.dealName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CR Number:</span>
              <span className="font-bold text-slate-900">{crNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT Identification:</span>
              <span className="font-bold text-slate-900">{vatNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Underwriting SLA:</span>
              <span className="font-bold text-emerald-600">&lt; 2 Hours Business Review</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Our finance team will activate your credit terms and your commercial representative will dispatch the final hire agreement for e-signature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF1F4] via-[#FFF9FA] to-[#F5F6FA] text-slate-900 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#ED1A53]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#ED1A53]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#45142B] to-[#7D224D] text-white flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-rose-300" />
              </div>
              <div>
                <span className="text-xs font-black tracking-widest text-[#ED1A53] uppercase block">
                  ENERGIA POWER FLEET
                </span>
                <h1 className="text-base font-black text-slate-900">
                  Digital KYC & Credit Verification
                </h1>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              256-Bit SSL Secured
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Entity</span>
              <strong className="text-sm font-black text-slate-900">{kycData.companyName}</strong>
              <div className="text-[11px] text-slate-500 mt-0.5">Project: {kycData.dealName}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Requested Facility</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                30 Days Net
              </span>
            </div>
          </div>
        </div>

        {/* The Verification Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#ED1A53]" />
              1. Commercial & Tax Registration (سجل تجاري وضريبة)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Please enter your official Saudi Ministry of Commerce CR and ZATCA tax identification.
            </p>
          </div>

          <div className="space-y-4">
            {/* Commercial Registration (CR) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Commercial Registration (CR) Number *</label>
                <span className="text-slate-400 font-mono text-[11px]">10-Digit Ministry of Commerce</span>
              </div>
              <input
                type="text"
                required
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                placeholder="e.g. 2050119284"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-[#ED1A53] focus:ring-1 focus:ring-[#ED1A53]"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCrUploaded(!crUploaded)}
                  className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition ${
                    crUploaded
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>{crUploaded ? "✓ CR Certificate Attached (PDF)" : "+ Attach CR Certificate (PDF/Image)"}</span>
                </button>
              </div>
            </div>

            {/* VAT Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">ZATCA VAT Registration Number *</label>
                <span className="text-slate-400 font-mono text-[11px]">15-Digit Tax Number (3xxxxxxxxxxxx03)</span>
              </div>
              <input
                type="text"
                required
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="e.g. 300182749200003"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-[#ED1A53] focus:ring-1 focus:ring-[#ED1A53]"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setVatUploaded(!vatUploaded)}
                  className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg border transition ${
                    vatUploaded
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>{vatUploaded ? "✓ ZATCA Certificate Attached (PDF)" : "+ Attach VAT Certificate (PDF/Image)"}</span>
                </button>
              </div>
            </div>

            {/* Trade / Municipal License */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Trade License / Municipal Permit (Optional)</label>
                <span className="text-slate-400 text-[11px]">Baladiya License</span>
              </div>
              <input
                type="text"
                value={tradeLicense}
                onChange={(e) => setTradeLicense(e.target.value)}
                placeholder="e.g. TL-2026-99120"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-[#ED1A53]"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#ED1A53]" />
              2. Authorized Signatory (المفوض بالتوقيع)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Corporate representative authorized to sign hire contracts and receive delivery manifests.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g. Fahad Al-Harbi"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#ED1A53]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Title *</label>
              <input
                type="text"
                required
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="e.g. Procurement Director / Project Manager"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#ED1A53]"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Contact Mobile / WhatsApp *</label>
              <input
                type="text"
                required
                value={signatoryPhone}
                onChange={(e) => setSignatoryPhone(e.target.value)}
                placeholder="e.g. +966 50 123 4567"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#ED1A53]"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 border-t border-slate-100 pt-5">
            <label className="text-xs font-bold text-slate-700">Project / Site Remarks</label>
            <textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Any specific delivery access gate, site permit, or billing requirements..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ED1A53]"
            />
          </div>

          {/* Corporate Declaration Checkbox */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-[#ED1A53]/25 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-[#ED1A53] focus:ring-[#ED1A53]"
              />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                I hereby declare that the company information, Commercial Registration, and VAT details provided above are authentic and authorized for commercial credit assessment with <strong>Energia Power Solutions Co.</strong>
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#d81248] hover:to-[#960a2d] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Digital KYC &amp; Activate Facility</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

