import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
  Briefcase,
  Sparkles,
  Smartphone,
  Send,
  Bot
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVolviAssist } from "../../context/VolviAssistContext";
import { creditKycApi } from "./creditKycApi";
import { CreditApplication, CreditStatus } from "./types";
import { formatCurrency } from "../../utils/currency";

export default function CreditKycDesk() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { triggerGuidance } = useVolviAssist();

  const [activeStatusTab, setActiveStatusTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedApplication, setSelectedApplication] = useState<CreditApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isNewApplicationModalOpen, setIsNewApplicationModalOpen] = useState<boolean>(false);

  // Underwriting Celebration / Next-Step Modal State
  const [underwritingSuccess, setUnderwritingSuccess] = useState<{
    dealId?: string;
    clientName: string;
    decision: "APPROVED" | "DECLINED" | "ADVANCE_PAYMENT_REQUIRED";
    creditLimit?: number;
    paymentTerms?: string;
  } | null>(null);

  // Review decision form state
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "DECLINED" | "ADVANCE_PAYMENT_REQUIRED">("APPROVED");
  const [approvedCreditLimit, setApprovedCreditLimit] = useState<number>(100000);
  const [approvedPaymentTerms, setApprovedPaymentTerms] = useState<string>("30_DAYS_NET");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");

  const [searchParams] = useSearchParams();
  const dealIdFromUrl = searchParams.get("dealId") || "";

  // New Application submission state
  const [newDealId, setNewDealId] = useState<string>(dealIdFromUrl);
  const [newRequestedLimit, setNewRequestedLimit] = useState<number>(50000);
  const [newPaymentTerms, setNewPaymentTerms] = useState<"30_DAYS" | "60_DAYS" | "90_DAYS" | "ADVANCE">("30_DAYS");
  const [newTradeLicense, setNewTradeLicense] = useState<string>("");
  const [newCrNumber, setNewCrNumber] = useState<string>("");
  const [newVatNumber, setNewVatNumber] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [generatedKycUrl, setGeneratedKycUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<"client_link" | "manual">("client_link");

  const handleGenerateClientLink = async () => {
    if (!newDealId) {
      alert("Please select a target Opportunity first to generate its unique KYC link.");
      return;
    }
    try {
      setIsGeneratingLink(true);
      const res = await fetch("/api/v1/credit-kyc/request-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          dealId: newDealId,
          channel: "both"
        })
      });
      if (!res.ok) throw new Error("Failed to generate KYC link");
      const json = await res.json();
      const fullUrl = `${window.location.origin}${json.kycUrl}`;
      setGeneratedKycUrl(fullUrl);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl);
      }
      alert("✓ Secure Client KYC Link generated & copied to clipboard!\nYou can send it via WhatsApp/Email or click 'Test Public Form' to test it now.");
    } catch (err: any) {
      alert(err.message || "Could not generate link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Fetch Credit Applications Queue
  const { data: applications = [], isLoading, refetch } = useQuery<CreditApplication[]>({
    queryKey: ["creditKycQueue", activeStatusTab],
    queryFn: () => creditKycApi.getQueue(activeStatusTab, token),
    enabled: !!token,
    refetchInterval: 20000
  });

  // Fetch Opportunities for Submission Dropdown
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

  // List all available opportunities for credit underwriting
  const candidateDeals = deals.length > 0 ? deals : [];

  useEffect(() => {
    if (dealIdFromUrl) {
      setNewDealId(dealIdFromUrl);
      setIsNewApplicationModalOpen(true);
      const match = deals.find((d: any) => d.id === dealIdFromUrl);
      if (match) {
        const val = Number(match.dealValue || match.amount || match.estimatedValue || 0);
        if (val > 0) setNewRequestedLimit(val);
      }
    }
  }, [dealIdFromUrl, deals]);

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: (payload: { id: string; decision: any; appData: any }) =>
      creditKycApi.reviewApplication(payload.id, payload.decision, token),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["creditKycQueue"] });
      setIsReviewModalOpen(false);

      const app = variables.appData;
      const decision = variables.decision;

      if (decision.status === "APPROVED") {
        setActiveStatusTab("APPROVED");
      } else if (decision.status === "ADVANCE_PAYMENT_REQUIRED") {
        setActiveStatusTab("ADVANCE_PAYMENT_REQUIRED");
      }

      setUnderwritingSuccess({
        dealId: app?.dealId || app?.deal?.id || "",
        clientName:
          app?.account?.name ||
          app?.deal?.account?.name ||
          app?.deal?.lead?.company ||
          app?.deal?.title ||
          "Client Account",
        decision: decision.status,
        creditLimit: decision.approvedCreditLimit,
        paymentTerms:
          decision.approvedPaymentTerms ||
          (decision.status === "ADVANCE_PAYMENT_REQUIRED" ? "100% Upfront Advance" : undefined)
      });

      const clientDisplay = app?.account?.name || app?.deal?.account?.name || "Client Account";
      const targetDealId = app?.dealId || app?.deal?.id || "";
      triggerGuidance({
        stepNumber: 6,
        stageName: "Step 5 Completed • Credit & KYC Approved",
        message: `Credit Cleared for ${clientDisplay} (${decision.approvedCreditLimit ? formatCurrency(decision.approvedCreditLimit) : "Approved"})`,
        explanation: "Wathq CR & ZATCA compliance cleared. Ready to formulate and execute Master Equipment Rental Agreement.",
        recommendedAction: "Draft Rental Agreement & Sign",
        actionLabel: "Open Contracts & SLAs",
        actionPath: targetDealId ? `/rental-contracts?dealId=${targetDealId}` : "/rental-contracts",
        technicalTip: "Nafath & ZATCA Phase 2 require authorized CR representative digital signature.",
        suggestedPrompt: "Verify ZATCA 15% VAT & Wathq CR compliance rules"
      });
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
      },
      appData: selectedApplication
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 font-sans selection:bg-[#ED1A53]/20 selection:text-[#ED1A53]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-700 border border-slate-300/80">
                Energia Governance
              </span>
              <span className="text-xs text-slate-500 font-mono">90% Commercial Stage Gate</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#ED1A53]" />
              Credit Check & KYC Underwriting Desk
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Due diligence gateway for Trade License, Commercial Registration (CR), and credit underwriting before rental contract signing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 transition shadow-xs cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsNewApplicationModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ED1A53]/25 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Submit Deal to Credit
            </button>
          </div>
        </div>

        {/* Metrics Grid (Pinterest Web 2.0 Elevated Cards with Circular Telemetry Rings) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-amber-500" strokeDasharray="45, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-amber-700 font-mono">{pendingCount}</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Pending Review
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {pendingCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-amber-600 font-bold text-[11px] flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Requires Underwriting
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeDasharray="80, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-emerald-700 font-mono">Approved</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Approved Credit
              </span>
              <div className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight font-mono">
                {approvedCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-600 font-bold text-[11px] font-mono">
                Exposure: {formatCurrency(totalExposureApproved)}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-500" strokeDasharray="35, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-blue-700 font-mono">100% Adv</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                100% Advance Fallback
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {advanceFallbackCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-blue-600 font-bold text-[11px] font-mono">
                Upfront Payment Branch
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-[#ED1A53] shadow-2xs group-hover:scale-105 transition-transform">
                <Ban className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-rose-500" strokeDasharray="15, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-rose-700 font-mono">Declined</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Credit Declined
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {declinedCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium text-[11px] font-mono">
                Terms Not Granted
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search (Rose Alabaster Panel) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(140,22,60,0.06),0_4px_10px_-2px_rgba(140,22,60,0.03)] border-2 border-[#EED5DE] text-slate-900">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeStatusTab === tab.id
                    ? "bg-[#45142B] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, CR, deal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#45142B]"
            />
          </div>
        </div>

        {/* Queue Table (Rose Alabaster Panel) */}
        <div className="bg-white rounded-[24px] shadow-[0_12px_28px_-6px_rgba(140,22,60,0.06),0_4px_10px_-2px_rgba(140,22,60,0.03)] border-2 border-[#EED5DE] overflow-hidden text-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-200/80 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="px-4 py-3">Account & Opportunity</th>
                  <th className="px-4 py-3">KYC Registrations</th>
                  <th className="px-4 py-3">Requested Credit</th>
                  <th className="px-4 py-3">Decision / Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading credit review queue...
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
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
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#ED1A53]" />
                            {companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {dealTitle}
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              90% PO Stage
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-1 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400">CR: </span>
                            <span className="text-slate-800 font-semibold">
                              {app.commercialRegistrationNumber || "Pending Intake"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">TL: </span>
                            <span className="text-slate-800 font-semibold">
                              {app.tradeLicenseNumber || "Pending"}
                            </span>
                          </div>
                          {app.vatRegistrationNumber && (
                            <div>
                              <span className="text-slate-400">VAT: </span>
                              <span className="text-slate-600">{app.vatRegistrationNumber}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5">
                          <div className="font-mono font-black text-slate-900">
                            {formatCurrency(app.requestedCreditLimit)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Terms: {app.requestedPaymentTerms?.replace("_", " ")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5">
                          {app.status === "APPROVED" ? (
                            <>
                              <div className="font-mono font-bold text-emerald-600">
                                {formatCurrency(app.approvedCreditLimit || 0)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {app.approvedPaymentTerms}
                              </div>
                            </>
                          ) : app.status === "ADVANCE_PAYMENT_REQUIRED" ? (
                            <div className="text-blue-700 font-mono text-[11px] font-bold">
                              100% Advance Deposit
                            </div>
                          ) : app.status === "DECLINED" ? (
                            <div className="text-[#ED1A53] font-mono text-[11px] line-clamp-1 font-bold" title={app.declineReason || ""}>
                              {app.declineReason || "Credit Denied"}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Awaiting Underwriter</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {app.status === "PENDING_REVIEW" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit font-mono">
                              <Clock className="w-3 h-3" /> Under Review
                            </span>
                          )}
                          {app.status === "APPROVED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit font-mono">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {app.status === "ADVANCE_PAYMENT_REQUIRED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit font-mono">
                              <CreditCard className="w-3 h-3" /> Advance Req.
                            </span>
                          )}
                          {app.status === "DECLINED" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit font-mono">
                              <Ban className="w-3 h-3" /> Declined
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right space-y-1">
                          {app.status === "PENDING_REVIEW" && (
                            <button
                              onClick={() => handleOpenReview(app)}
                              className="px-3 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs transition shadow-sm cursor-pointer"
                            >
                              Review & Underwrite
                            </button>
                          )}

                          {app.status === "DECLINED" && !app.fallbackToAdvancePayment && (
                            <button
                              onClick={() => advanceFallbackMutation.mutate(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" /> Offer 100% Advance
                            </button>
                          )}

                          {app.status === "ADVANCE_PAYMENT_REQUIRED" && !app.advancePaymentReceived && (
                            <button
                              onClick={() => confirmDepositMutation.mutate(app.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Confirm Deposit
                            </button>
                          )}

                          {app.status === "APPROVED" && (
                            <span className="text-[11px] text-emerald-600 font-mono font-bold block">
                              ✓ Cleared for Contract
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

        {/* Modal: Review Underwriting Decision (Pure White Modal) */}
        {isReviewModalOpen && selectedApplication && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-slate-900">Underwriting Credit Decision</h3>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  {selectedApplication.account?.name || selectedApplication.deal?.title}
                </div>
                <div className="text-slate-500 font-mono">
                  CR: {selectedApplication.commercialRegistrationNumber || "N/A"} | Requested:{" "}
                  <strong className="text-slate-900">
                    {formatCurrency(selectedApplication.requestedCreditLimit)}
                  </strong>{" "}
                  ({selectedApplication.requestedPaymentTerms?.replace("_", " ")})
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Decision Tabs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Underwriting Verdict</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewDecision("APPROVED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        reviewDecision === "APPROVED"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-500 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision("ADVANCE_PAYMENT_REQUIRED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        reviewDecision === "ADVANCE_PAYMENT_REQUIRED"
                          ? "bg-blue-50 border-blue-300 text-blue-800 ring-1 ring-blue-500 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600" /> 100% Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision("DECLINED")}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        reviewDecision === "DECLINED"
                          ? "bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-500 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Ban className="w-4 h-4 text-[#ED1A53]" /> Decline
                    </button>
                  </div>
                </div>

                {/* Conditional Fields based on Decision */}
                {reviewDecision === "APPROVED" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Approved Credit Limit (SAR)</label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={approvedCreditLimit}
                        onChange={(e) => setApprovedCreditLimit(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Approved Terms</label>
                      <select
                        value={approvedPaymentTerms}
                        onChange={(e) => setApprovedPaymentTerms(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                    <label className="text-xs text-rose-600 font-semibold">Mandatory Decline Reason</label>
                    <textarea
                      rows={2}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="e.g. SIMAH record shows defaulted invoices or active court execution."
                      className="w-full bg-slate-50 border border-rose-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                {reviewDecision === "ADVANCE_PAYMENT_REQUIRED" && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                    ℹ️ Customer will be offered equipment rental strictly against 100% advance deposit. Once the deposit is received, rental dispatch will be released.
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-semibold">Underwriting Notes & Audit Reference</label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Verified with Finance Dept; Aramco approved subcontractor."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {reviewMutation.isPending ? "Recording Decision..." : "Commit Underwriting Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Underwriting Milestone Celebration Modal */}
        {underwritingSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {underwritingSuccess.decision === "DECLINED" ? "Credit Decision Recorded" : "✓ Credit Underwriting Approved!"}
                    </h3>
                    <p className="text-[11px] text-slate-500">Commercial Credit &amp; Compliance Gateway</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnderwritingSuccess(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Target Account / Project:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{underwritingSuccess.clientName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Underwriting Verdict:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    underwritingSuccess.decision === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : underwritingSuccess.decision === "ADVANCE_PAYMENT_REQUIRED"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                  }`}>
                    {underwritingSuccess.decision === "APPROVED"
                      ? "Approved on Credit Terms"
                      : underwritingSuccess.decision === "ADVANCE_PAYMENT_REQUIRED"
                      ? "100% Upfront Advance Required"
                      : "Credit Terms Declined"}
                  </span>
                </div>
                {underwritingSuccess.creditLimit ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Approved Credit Facility:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(underwritingSuccess.creditLimit)}
                    </span>
                  </div>
                ) : null}
                {underwritingSuccess.paymentTerms ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Payment Terms:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {underwritingSuccess.paymentTerms.replace(/_/g, " ")}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Commercial Status:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    ✓ Cleared for Contract
                  </span>
                </div>
              </div>

              {/* Volvi Assist Guidance Pill */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Volvi Assist • Next Step Advisor</span>
                </div>
                <span className="text-[10px] text-rose-200 font-semibold">Wathq CR & Simah Cleared</span>
              </div>

              {/* Next Step Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-50/50 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white block font-bold">Next in Lifecycle: Step 6 (Contracts &amp; SLAs)</strong>
                  Credit is cleared. Proceed to generate the official bilingual Master Equipment Rental Agreement and route for e-signatures.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {underwritingSuccess.decision !== "DECLINED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetUrl = underwritingSuccess.dealId
                        ? `/rental-contracts?dealId=${underwritingSuccess.dealId}`
                        : "/rental-contracts";
                      navigate(targetUrl);
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>Proceed to Step 6: Contracts &amp; SLAs</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStatusTab(underwritingSuccess.decision === "DECLINED" ? "DECLINED" : "APPROVED");
                      setUnderwritingSuccess(null);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                  >
                    View in {underwritingSuccess.decision === "DECLINED" ? "Declined" : "Approved"} Queue ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnderwritingSuccess(null)}
                    className="py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Submit New Application (Two-Mode Design) */}
        {isNewApplicationModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-slate-900">Credit Check &amp; KYC Intake</h3>
                </div>
                <button
                  onClick={() => setIsNewApplicationModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSubmissionMode("client_link")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    submissionMode === "client_link"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ED1A53]" />
                  <span>Client Self-Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    submissionMode === "manual"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manual Back-Office</span>
                </button>
              </div>

              {/* Opportunity Selector (Shared between both modes) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Opportunity</label>
                <select
                  value={newDealId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setNewDealId(selectedId);
                    const d = candidateDeals.find((item: any) => item.id === selectedId);
                    if (d) {
                      const val = Number(d.dealValue || d.amount || d.estimatedValue || 0);
                      if (val > 0) {
                        setNewRequestedLimit(val);
                      }
                    }
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                >
                  <option value="">-- Select Opportunity --</option>
                  {candidateDeals.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.title} ({formatCurrency(d.dealValue || d.amount || d.estimatedValue || 0)})
                    </option>
                  ))}
                </select>
              </div>

              {/* MODE 1: CLIENT SELF-SERVICE (RECOMMENDED) */}
              {submissionMode === "client_link" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-[#ED1A53]/25 space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#ED1A53]" />
                        Dispatch Mobile KYC Verification Link
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Send a secure digital link to the client via <b>WhatsApp &amp; Email</b>. The client uploads their Commercial Registration (CR), ZATCA VAT certificate, and authorized signatory details directly on their phone in under 2 minutes.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleGenerateClientLink}
                        disabled={!newDealId || isGeneratingLink}
                        className="flex-1 py-2.5 rounded-lg bg-[#ED1A53] hover:bg-[#d81248] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isGeneratingLink ? "Generating Secure Link..." : "Dispatch & Copy Client Link"}</span>
                      </button>
                    </div>
                  </div>

                  {generatedKycUrl && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> Link Active &amp; Copied!
                        </span>
                        <a
                          href={generatedKycUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#ED1A53] hover:underline flex items-center gap-1 text-[11px] font-bold"
                        >
                          <span>Test Client Portal ↗</span>
                        </a>
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 break-all bg-white p-2 rounded-lg border border-emerald-200">
                        {generatedKycUrl}
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        ⚡ You don't need to type anything here. As soon as the client taps submit on their phone, this underwriting desk will automatically receive the application under "Pending Review".
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewApplicationModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                    >
                      {generatedKycUrl ? "Done / Link Dispatched" : "Close"}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: MANUAL BACK-OFFICE INTAKE */}
              {submissionMode === "manual" && (
                <form onSubmit={handleNewSubmission} className="space-y-4">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    ℹ️ Use this tab only if the customer already sent paper or scanned CR/VAT documents directly to you via email.
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Requested Credit Limit (SAR)</label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={newRequestedLimit}
                        onChange={(e) => setNewRequestedLimit(parseFloat(e.target.value) || 0)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Requested Payment Terms</label>
                      <select
                        value={newPaymentTerms}
                        onChange={(e: any) => setNewPaymentTerms(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
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
                      <label className="text-xs text-slate-600 font-semibold">Commercial Registration (CR)</label>
                      <input
                        type="text"
                        placeholder="e.g. 2050119284"
                        value={newCrNumber}
                        onChange={(e) => setNewCrNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Trade License Number</label>
                      <input
                        type="text"
                        placeholder="e.g. TL-2026-99120"
                        value={newTradeLicense}
                        onChange={(e) => setNewTradeLicense(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">VAT Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 300182749200003"
                      value={newVatNumber}
                      onChange={(e) => setNewVatNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Application Notes</label>
                    <textarea
                      rows={2}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Notes on client project or reference Aramco contract..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewApplicationModalOpen(false)}
                      className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitApplicationMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {submitApplicationMutation.isPending ? "Submitting..." : "Submit to Credit"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

