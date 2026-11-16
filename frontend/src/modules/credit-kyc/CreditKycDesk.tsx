import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  DollarSign,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Ban,
  ArrowRight,
  X,
  CreditCard,
  Briefcase
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { creditKycApi } from "./creditKycApi";
import { CreditApplication, CreditStatus } from "./types";
import { formatCurrency } from "../../utils/currency";

export default function CreditKycDesk() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeStatusTab, setActiveStatusTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedApplication, setSelectedApplication] = useState<CreditApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isNewApplicationModalOpen, setIsNewApplicationModalOpen] = useState<boolean>(false);

  // Review decision form state
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "DECLINED" | "ADVANCE_PAYMENT_REQUIRED">("APPROVED");
  const [approvedCreditLimit, setApprovedCreditLimit] = useState<number>(100000);
  const [approvedPaymentTerms, setApprovedPaymentTerms] = useState<string>("30_DAYS_NET");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // New Application submission state
  const [newDealId, setNewDealId] = useState<string>("");
  const [newRequestedLimit, setNewRequestedLimit] = useState<number>(50000);
  const [newPaymentTerms, setNewPaymentTerms] = useState<"30_DAYS" | "60_DAYS" | "90_DAYS" | "ADVANCE">("30_DAYS");
  const [newTradeLicense, setNewTradeLicense] = useState<string>("");
  const [newCrNumber, setNewCrNumber] = useState<string>("");
  const [newVatNumber, setNewVatNumber] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");

  // Fetch Credit Applications Queue
  const { data: applications = [], isLoading, refetch } = useQuery<CreditApplication[]>({
    queryKey: ["creditKycQueue", activeStatusTab],
    queryFn: () => creditKycApi.getQueue(activeStatusTab, token),
    enabled: !!token,
    refetchInterval: 20000
  });

  // Fetch 90% Opportunities for Submission Dropdown
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["opportunitiesForCreditKyc"],
    queryFn: async () => {
      const res = await fetch("/api/v1/opportunities", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json?.data || [];
    },
    enabled: !!token
  });

  // Filter 90% PO deals (or all deals with high probability)
  const candidateDeals = deals.filter(
    (d: any) => d.winProbability >= 60 || d.stage?.toLowerCase().includes("po") || d.stage?.toLowerCase().includes("contract")
  );

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: (payload: { id: string; decision: any }) =>
      creditKycApi.reviewApplication(payload.id, payload.decision, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditKycQueue"] });
      setIsReviewModalOpen(false);
      setSelectedApplication(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to submit credit review decision");
    }
  });

  const advanceFallbackMutation = useMutation({
    mutationFn: (id: string) =>
      creditKycApi.activateAdvanceFallback(id, "Customer opted for 100% advance payment after review.", token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditKycQueue"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to activate advance payment fallback");
    }
  });

  const confirmDepositMutation = useMutation({
    mutationFn: (id: string) => creditKycApi.confirmAdvancePayment(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditKycQueue"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to confirm advance deposit");
    }
  });

  const submitApplicationMutation = useMutation({
    mutationFn: (payload: any) => creditKycApi.submitApplication(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditKycQueue"] });
      setIsNewApplicationModalOpen(false);
      // Reset form
      setNewDealId("");
      setNewTradeLicense("");
      setNewCrNumber("");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to submit credit application");
    }
  });

  // Metrics summary
  const pendingCount = applications.filter((a) => a.status === "PENDING_REVIEW").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const advanceFallbackCount = applications.filter((a) => a.status === "ADVANCE_PAYMENT_REQUIRED").length;
  const declinedCount = applications.filter((a) => a.status === "DECLINED").length;

  const totalExposureApproved = applications
    .filter((a) => a.status === "APPROVED")
    .reduce((sum, a) => sum + Number(a.approvedCreditLimit || 0), 0);

  // Search filtering
  const filteredApplications = applications.filter((app) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const dealTitle = (app.deal?.title || app.deal?.name || "").toLowerCase();
    const company = (app.account?.name || app.deal?.account?.name || app.deal?.lead?.company || "").toLowerCase();
    const cr = (app.commercialRegistrationNumber || "").toLowerCase();
    const tl = (app.tradeLicenseNumber || "").toLowerCase();
    return dealTitle.includes(term) || company.includes(term) || cr.includes(term) || tl.includes(term);
  });

  const handleOpenReview = (app: CreditApplication) => {
    setSelectedApplication(app);
    setApprovedCreditLimit(Number(app.requestedCreditLimit) || 100000);
    setApprovedPaymentTerms(app.requestedPaymentTerms || "30_DAYS_NET");
    setReviewDecision("APPROVED");
    setDeclineReason("");
    setReviewNotes(app.notes || "");
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    if (reviewDecision === "DECLINED" && !declineReason.trim()) {
      alert("Please provide a specific reason for declining credit terms.");
      return;
    }

    if (reviewDecision === "APPROVED" && approvedCreditLimit <= 0) {
      alert("Approved credit limit must be greater than 0 SAR.");
      return;
    }

    reviewMutation.mutate({
      id: selectedApplication.id,
      decision: {
        status: reviewDecision,
        approvedCreditLimit: reviewDecision === "APPROVED" ? approvedCreditLimit : undefined,
        approvedPaymentTerms: reviewDecision === "APPROVED" ? approvedPaymentTerms : undefined,
        declineReason: reviewDecision === "DECLINED" ? declineReason : undefined,
        notes: reviewNotes
      }
    });
  };

  const handleNewSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealId) {
      alert("Please select a target Opportunity.");
      return;
    }

    submitApplicationMutation.mutate({
      dealId: newDealId,
      requestedCreditLimit: newRequestedLimit,
      requestedPaymentTerms: newPaymentTerms,
      tradeLicenseNumber: newTradeLicense || undefined,
      commercialRegistrationNumber: newCrNumber || undefined,
      vatRegistrationNumber: newVatNumber || undefined,
      notes: newNotes || undefined
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 font-sans selection:bg-[#ED1A53]/20 selection:text-[#ED1A53]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-[#ED1A53]/15 text-[#ED1A53] border border-[#ED1A53]/30">
                Energia Governance
              </span>
              <span className="text-xs text-slate-500 font-mono">90% Commercial Stage Gate</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#ED1A53]" />
              Credit Check & KYC Underwriting Desk
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Due diligence gateway for Trade License, Commercial Registration (CR), and credit underwriting before rental contract signing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsNewApplicationModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ED1A53]/20 active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" />
              Submit Deal to Credit
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{pendingCount}</div>
            <div className="text-[11px] text-amber-400/90 font-mono">Requires Underwriting</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Approved Credit</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{approvedCount}</div>
            <div className="text-[11px] text-emerald-400/90 font-mono">
              Exposure: {formatCurrency(totalExposureApproved)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>100% Advance Fallback</span>
              <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{advanceFallbackCount}</div>
            <div className="text-[11px] text-blue-400/90 font-mono">Upfront Payment Branch</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Credit Declined</span>
              <Ban className="w-4 h-4 text-[#ED1A53]" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{declinedCount}</div>
            <div className="text-[11px] text-slate-500 font-mono">Terms Not Granted</div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: "All Records" },
              { id: "PENDING_REVIEW", label: `Pending (${pendingCount})` },
              { id: "APPROVED", label: `Approved (${approvedCount})` },
              { id: "ADVANCE_PAYMENT_REQUIRED", label: `Advance Deposit (${advanceFallbackCount})` },
              { id: "DECLINED", label: `Declined (${declinedCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeStatusTab === tab.id
                    ? "bg-[#ED1A53] text-white shadow-md shadow-[#ED1A53]/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, CR, deal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ED1A53]"
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="px-4 py-3">Account & Opportunity</th>
                  <th className="px-4 py-3">KYC Registrations</th>
                  <th className="px-4 py-3">Requested Credit</th>
                  <th className="px-4 py-3">Decision / Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading credit review queue...
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      No credit applications matching the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const companyName =
                      app.account?.name ||
                      app.deal?.account?.name ||
                      app.deal?.lead?.company ||
                      "Commercial Entity";
                    const dealTitle = app.deal?.title || app.deal?.name || "Power Equipment Rental";

                    return (
                      <tr key={app.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#ED1A53]" />
                            {companyName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {dealTitle}
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              90% PO Stage
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-1 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500">CR: </span>
                            <span className="text-slate-200 font-semibold">
                              {app.commercialRegistrationNumber || "Pending Intake"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">TL: </span>
                            <span className="text-slate-200 font-semibold">
                              {app.tradeLicenseNumber || "Pending"}
                            </span>
                          </div>
                          {app.vatRegistrationNumber && (
                            <div>
                              <span className="text-slate-500">VAT: </span>
                              <span className="text-slate-400">{app.vatRegistrationNumber}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5">
                          <div className="font-mono font-bold text-white">
                            {formatCurrency(app.requestedCreditLimit)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Terms: {app.requestedPaymentTerms?.replace("_", " ")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5">
                          {app.status === "APPROVED" ? (
                            <>
                              <div className="font-mono font-bold text-emerald-400">
                                {formatCurrency(app.approvedCreditLimit || 0)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {app.approvedPaymentTerms}
                              </div>
                            </>
                          ) : app.status === "ADVANCE_PAYMENT_REQUIRED" ? (
                            <div className="text-blue-400 font-mono text-[11px] font-bold">
                              100% Advance Deposit
                            </div>
                          ) : app.status === "DECLINED" ? (
                            <div className="text-[#ED1A53] font-mono text-[11px] line-clamp-1" title={app.declineReason || ""}>
                              {app.declineReason || "Credit Denied"}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Awaiting Underwriter</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {app.status === "PENDING_REVIEW" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Under Review
                            </span>
                          )}
                          {app.status === "APPROVED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {app.status === "ADVANCE_PAYMENT_REQUIRED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
                              <CreditCard className="w-3 h-3" /> Advance Req.
                            </span>
                          )}
                          {app.status === "DECLINED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                              <Ban className="w-3 h-3" /> Declined
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right space-y-1">
                          {app.status === "PENDING_REVIEW" && (
                            <button
                              onClick={() => handleOpenReview(app)}
                              className="px-3 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs transition shadow-sm"
                            >
                              Review & Underwrite
                            </button>
                          )}

                          {app.status === "DECLINED" && !app.fallbackToAdvancePayment && (
                            <button
                              onClick={() => advanceFallbackMutation.mutate(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/50 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <CreditCard className="w-3 h-3" /> Offer 100% Advance
                            </button>
                          )}

                          {app.status === "ADVANCE_PAYMENT_REQUIRED" && !app.advancePaymentReceived && (
                            <button
                              onClick={() => confirmDepositMutation.mutate(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Confirm Deposit
                            </button>
                          )}

                          {app.status === "APPROVED" && (
                            <span className="text-[11px] text-slate-500 font-mono block">
                              Cleared for Contract
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Review Underwriting Decision */}
        {isReviewModalOpen && selectedApplication && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-white">Underwriting Credit Decision</h3>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-white">
                  {selectedApplication.account?.name || selectedApplication.deal?.title}
                </div>
                <div className="text-slate-400 font-mono">
                  CR: {selectedApplication.commercialRegistrationNumber || "N/A"} | Requested:{" "}
                  <strong className="text-white">
                    {formatCurrency(selectedApplication.requestedCreditLimit)}
                  </strong>{" "}
                  ({selectedApplication.requestedPaymentTerms?.replace("_", " ")})
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Decision Tabs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Underwriting Verdict</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewDecision("APPROVED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === "APPROVED"
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision("ADVANCE_PAYMENT_REQUIRED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === "ADVANCE_PAYMENT_REQUIRED"
                          ? "bg-blue-950/60 border-blue-500 text-blue-300 ring-1 ring-blue-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> 100% Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision("DECLINED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === "DECLINED"
                          ? "bg-red-950/60 border-red-500 text-red-300 ring-1 ring-red-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Ban className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>

                {/* Conditional Fields based on Decision */}
                {reviewDecision === "APPROVED" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Approved Credit Limit (SAR)</label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={approvedCreditLimit}
                        onChange={(e) => setApprovedCreditLimit(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Approved Terms</label>
                      <select
                        value={approvedPaymentTerms}
                        onChange={(e) => setApprovedPaymentTerms(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="30_DAYS_NET">30 Days Net</option>
                        <option value="60_DAYS_NET">60 Days Net</option>
                        <option value="90_DAYS_NET">90 Days Net</option>
                        <option value="15_DAYS_NET">15 Days Net</option>
                      </select>
                    </div>
                  </div>
                )}

                {reviewDecision === "DECLINED" && (
                  <div className="space-y-1">
                    <label className="text-xs text-red-400 font-semibold">Mandatory Decline Reason</label>
                    <textarea
                      rows={2}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="e.g. SIMAH record shows defaulted invoices or active court execution."
                      className="w-full bg-slate-950 border border-red-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                {reviewDecision === "ADVANCE_PAYMENT_REQUIRED" && (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300">
                    ℹ️ Customer will be offered equipment rental strictly against 100% advance deposit. Once the deposit is received, rental dispatch will be released.
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Underwriting Notes & Audit Reference</label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Verified with Finance Dept; Aramco approved subcontractor."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    {reviewMutation.isPending ? "Recording Decision..." : "Commit Underwriting Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Submit New Application */}
        {isNewApplicationModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-white">Submit Deal to Credit Underwriting</h3>
                </div>
                <button
                  onClick={() => setIsNewApplicationModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleNewSubmission} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Opportunity</label>
                  <select
                    value={newDealId}
                    onChange={(e) => setNewDealId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  >
                    <option value="">-- Select Opportunity --</option>
                    {candidateDeals.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.title || d.name} ({formatCurrency(d.dealValue || d.amount || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Requested Credit Limit (SAR)</label>
                    <input
                      type="number"
                      min={1000}
                      step={5000}
                      value={newRequestedLimit}
                      onChange={(e) => setNewRequestedLimit(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Requested Payment Terms</label>
                    <select
                      value={newPaymentTerms}
                      onChange={(e: any) => setNewPaymentTerms(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    >
                      <option value="30_DAYS">30 Days Net</option>
                      <option value="60_DAYS">60 Days Net</option>
                      <option value="90_DAYS">90 Days Net</option>
                      <option value="ADVANCE">100% Advance Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Commercial Registration (CR)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2050119284"
                      value={newCrNumber}
                      onChange={(e) => setNewCrNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Trade License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. TL-2026-99120"
                      value={newTradeLicense}
                      onChange={(e) => setNewTradeLicense(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">VAT Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 300182749200003"
                    value={newVatNumber}
                    onChange={(e) => setNewVatNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Application Notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes on client project or reference Aramco contract..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewApplicationModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitApplicationMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    {submitApplicationMutation.isPending ? "Submitting..." : "Submit to Credit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
