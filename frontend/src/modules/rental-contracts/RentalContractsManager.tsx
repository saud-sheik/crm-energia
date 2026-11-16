import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  PenTool,
  CheckCheck,
  Plus,
  RefreshCw,
  Search,
  X,
  FileCheck,
  Truck,
  MapPin,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { rentalContractApi } from "./rentalContractApi";
import { RentalContract, ContractStatus } from "./types";
import { formatCurrency } from "../../utils/currency";

export default function RentalContractsManager() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [signingMode, setSigningMode] = useState<"client" | "company">("client");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);

  // Sign form state
  const [clientSignatoryName, setClientSignatoryName] = useState<string>("");
  const [clientSignatoryTitle, setClientSignatoryTitle] = useState<string>("Procurement Director");

  // Generate form state
  const [genDealId, setGenDealId] = useState<string>("");
  const [genStartDate, setGenStartDate] = useState<string>("2026-12-01");
  const [genEndDate, setGenEndDate] = useState<string>("2027-02-28");
  const [genTotalValue, setGenTotalValue] = useState<number>(75000);
  const [genMonthlyRate, setGenMonthlyRate] = useState<number>(25000);
  const [genDeposit, setGenDeposit] = useState<number>(10000);
  const [genSlaHours, setGenSlaHours] = useState<2 | 4>(4);
  const [genBackupUnit, setGenBackupUnit] = useState<boolean>(true);
  const [genSiteLocation, setGenSiteLocation] = useState<string>("Jubail Industrial Plant 2");
  const [genEquipmentSummary, setGenEquipmentSummary] = useState<string>(
    "1x 500 kVA Grid-Spec Generator + 1x 2,500L External Fuel Tank + 50m Power Cables"
  );

  // Fetch Contracts
  const { data: contracts = [], isLoading, refetch } = useQuery<RentalContract[]>({
    queryKey: ["rentalContracts", activeTab],
    queryFn: () => rentalContractApi.getContracts(activeTab, token),
    enabled: !!token,
    refetchInterval: 20000
  });

  // Fetch Candidate Deals for Contract Generation
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["dealsForRentalContracts"],
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

  // Mutations
  const generateMutation = useMutation({
    mutationFn: (payload: any) => rentalContractApi.generateContract(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      setIsGenerateModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to generate rental contract");
    }
  });

  const submitLegalMutation = useMutation({
    mutationFn: (id: string) => rentalContractApi.submitLegalReview(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rentalContracts"] })
  });

  const approveLegalMutation = useMutation({
    mutationFn: (id: string) => rentalContractApi.approveLegalReview(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rentalContracts"] })
  });

  const signClientMutation = useMutation({
    mutationFn: (payload: { id: string; signatoryName: string; signatoryTitle: string }) =>
      rentalContractApi.signClient(
        payload.id,
        {
          signatoryName: payload.signatoryName,
          signatoryTitle: payload.signatoryTitle,
          signatureData: "DIGITALLY_VERIFIED_CLIENT_SIGNATURE"
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      setIsSignModalOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to sign contract");
    }
  });

  const signCompanyMutation = useMutation({
    mutationFn: (id: string) =>
      rentalContractApi.signCompany(id, "ENERGIA_AUTHORIZED_EXECUTIVE_COUNTERSIGN", token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setIsSignModalOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to countersign contract");
    }
  });

  // KPI Calculations
  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const awaitingSignCount = contracts.filter(
    (c) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "AWAITING_COMPANY_SIGNATURE"
  ).length;
  const legalReviewCount = contracts.filter((c) => c.status === "LEGAL_REVIEW").length;
  const prioritySlaCount = contracts.filter((c) => c.breakdownResponseSlaHours === 2).length;

  const totalActiveValue = contracts
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + Number(c.totalContractValue || 0), 0);

  // Search Filter
  const filteredContracts = contracts.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const num = c.contractNumber.toLowerCase();
    const comp = (c.account?.name || c.deal?.account?.name || "").toLowerCase();
    const deal = (c.deal?.title || c.deal?.name || "").toLowerCase();
    return num.includes(term) || comp.includes(term) || deal.includes(term);
  });

  const handleOpenSignModal = (contract: RentalContract, mode: "client" | "company") => {
    setSelectedContract(contract);
    setSigningMode(mode);
    setClientSignatoryName(
      contract.clientSignatoryName ||
        (contract.deal?.account?.name ? `${contract.deal.account.name} Representative` : "")
    );
    setIsSignModalOpen(true);
  };

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    if (signingMode === "client") {
      if (!clientSignatoryName.trim()) {
        alert("Signatory full name is required.");
        return;
      }
      signClientMutation.mutate({
        id: selectedContract.id,
        signatoryName: clientSignatoryName,
        signatoryTitle: clientSignatoryTitle
      });
    } else {
      signCompanyMutation.mutate(selectedContract.id);
    }
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genDealId) {
      alert("Please select a target Opportunity.");
      return;
    }

    generateMutation.mutate({
      dealId: genDealId,
      contractStartDate: genStartDate,
      contractEndDate: genEndDate,
      totalContractValue: genTotalValue,
      monthlyRecurringRate: genMonthlyRate,
      securityDepositAmount: genDeposit,
      breakdownResponseSlaHours: genSlaHours,
      backupUnitCommitment: genBackupUnit,
      siteLocation: genSiteLocation,
      equipmentSummary: genEquipmentSummary
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
                Energia Legal & Operations
              </span>
              <span className="text-xs text-slate-500 font-mono">100% Commercial Deal Execution</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-[#ED1A53]" />
              Equipment Rental Contracts & Legal SLAs
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Hire agreements, breakdown response SLAs (2h/4h), damage liability clauses, and dual digital e-sign.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Contracts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ED1A53]/20 active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" />
              Generate Rental Contract
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Active Hire Contracts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{activeCount}</div>
            <div className="text-[11px] text-emerald-400/90 font-mono">
              Active Revenue: {formatCurrency(totalActiveValue)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Awaiting Signature</span>
              <PenTool className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{awaitingSignCount}</div>
            <div className="text-[11px] text-purple-400/90 font-mono">Dual E-Sign Required</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>In Legal Review</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{legalReviewCount}</div>
            <div className="text-[11px] text-amber-400/90 font-mono">Contract Underwriting</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>2h Priority SLA Fleet</span>
              <Zap className="w-4 h-4 text-[#ED1A53]" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{prioritySlaCount}</div>
            <div className="text-[11px] text-[#ED1A53] font-mono">Critical Prime Power</div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: "All Contracts" },
              { id: "ACTIVE", label: `Active (${activeCount})` },
              { id: "AWAITING_CLIENT_SIGNATURE", label: "Awaiting Client Sign" },
              { id: "AWAITING_COMPANY_SIGNATURE", label: "Awaiting Energia Sign" },
              { id: "LEGAL_REVIEW", label: `Legal Review (${legalReviewCount})` },
              { id: "DRAFT", label: "Drafts" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#ED1A53] text-white shadow-md shadow-[#ED1A53]/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search contract #, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ED1A53]"
            />
          </div>
        </div>

        {/* Contracts Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="px-4 py-3">Contract Ref & Client</th>
                  <th className="px-4 py-3">Equipment Deployed</th>
                  <th className="px-4 py-3">SLA Guarantee</th>
                  <th className="px-4 py-3">Hire Window & Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading rental contracts...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      No contracts matching filter. Click &ldquo;Generate Rental Contract&rdquo; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const clientName =
                      c.account?.name || c.deal?.account?.name || "Corporate Customer";
                    const is2hSla = c.breakdownResponseSlaHours === 2;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span className="text-[#ED1A53]">{c.contractNumber}</span>
                          </div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {clientName}
                          </div>
                          {c.siteLocation && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" /> {c.siteLocation}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-1 max-w-xs">
                          <div className="font-mono text-[11px] text-slate-200 line-clamp-2">
                            {c.equipmentSummary || "Generator Power Assets"}
                          </div>
                          {c.backupUnitCommitment && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-block font-mono">
                              ✓ 12h Swap Guarantee
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-black inline-flex items-center gap-1 ${
                              is2hSla
                                ? "bg-[#ED1A53]/20 text-[#ED1A53] border border-[#ED1A53]/40"
                                : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            <Zap className="w-3 h-3" /> {c.breakdownResponseSlaHours}h Response SLA
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cover: {c.insuranceResponsibility?.replace("_", " ")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5 font-mono">
                          <div className="font-bold text-white text-xs">
                            {formatCurrency(c.totalContractValue)}
                          </div>
                          {c.monthlyRecurringRate && (
                            <div className="text-[11px] text-slate-400">
                              {formatCurrency(c.monthlyRecurringRate)}/mo
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            {new Date(c.contractStartDate).toLocaleDateString()} →{" "}
                            {new Date(c.contractEndDate).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {c.status === "ACTIVE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit font-mono">
                              <CheckCheck className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                          {c.status === "AWAITING_CLIENT_SIGNATURE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit font-mono">
                              <PenTool className="w-3 h-3" /> Client Sign Pending
                            </span>
                          )}
                          {c.status === "AWAITING_COMPANY_SIGNATURE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit font-mono">
                              <PenTool className="w-3 h-3" /> Energia Sign Pending
                            </span>
                          )}
                          {c.status === "LEGAL_REVIEW" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit font-mono">
                              <Shield className="w-3 h-3" /> Legal Review
                            </span>
                          )}
                          {c.status === "DRAFT" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 w-fit font-mono">
                              Draft
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right space-y-1">
                          {c.status === "DRAFT" && (
                            <button
                              onClick={() => submitLegalMutation.mutate(c.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-800 text-amber-300 border border-amber-700/50 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <Shield className="w-3 h-3" /> Submit Legal
                            </button>
                          )}

                          {c.status === "LEGAL_REVIEW" && (
                            <button
                              onClick={() => approveLegalMutation.mutate(c.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Clear Legal Review
                            </button>
                          )}

                          {c.status === "AWAITING_CLIENT_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "client")}
                              className="px-2.5 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-[11px] font-bold transition flex items-center gap-1 ml-auto shadow-sm"
                            >
                              <PenTool className="w-3 h-3" /> Record Client Sign
                            </button>
                          )}

                          {c.status === "AWAITING_COMPANY_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "company")}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 ml-auto shadow-sm"
                            >
                              <CheckCheck className="w-3 h-3" /> Countersign & Win (100%)
                            </button>
                          )}

                          {c.status === "ACTIVE" && (
                            <span className="text-[11px] text-emerald-400 font-mono block">
                              ✓ Fully Executed
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

        {/* Modal: E-Signature Signoff */}
        {isSignModalOpen && selectedContract && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-white">
                    {signingMode === "client" ? "Client Digital Signature" : "Energia Countersignature"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSignModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-white font-mono text-[#ED1A53]">
                  {selectedContract.contractNumber}
                </div>
                <div className="text-slate-300">
                  {selectedContract.account?.name || selectedContract.deal?.title}
                </div>
                <div className="text-slate-400 font-mono">
                  Value: {formatCurrency(selectedContract.totalContractValue)} | SLA:{" "}
                  {selectedContract.breakdownResponseSlaHours}h response
                </div>
              </div>

              <form onSubmit={handleSignSubmit} className="space-y-4">
                {signingMode === "client" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Authorized Signatory Name</label>
                      <input
                        type="text"
                        value={clientSignatoryName}
                        onChange={(e) => setClientSignatoryName(e.target.value)}
                        placeholder="Full Legal Name"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Official Title / Designation</label>
                      <input
                        type="text"
                        value={clientSignatoryTitle}
                        onChange={(e) => setClientSignatoryTitle(e.target.value)}
                        placeholder="e.g. Procurement Director / General Manager"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                    <div className="font-bold">⚡ Executive Countersignature Confirmation:</div>
                    <p className="text-[11px] text-emerald-200/80">
                      By countersigning, this rental contract becomes active, the generator dispatch is released, and the parent Deal is automatically marked <strong>Closed Won (100%)</strong>.
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-950 border border-dashed border-slate-700 text-center font-mono text-[11px] text-slate-400">
                  [ Digital Signature & Timestamp Cryptographically Signed ]
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    {signingMode === "client" ? "Record Client Signoff" : "Countersign & Activate Contract"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Generate Contract */}
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-white">Generate Equipment Rental Contract</h3>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Opportunity</label>
                  <select
                    value={genDealId}
                    onChange={(e) => setGenDealId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  >
                    <option value="">-- Select Opportunity --</option>
                    {deals.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.title || d.name} ({formatCurrency(d.dealValue || d.amount || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Hire Start Date</label>
                    <input
                      type="date"
                      value={genStartDate}
                      onChange={(e) => setGenStartDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Hire End Date</label>
                    <input
                      type="date"
                      value={genEndDate}
                      onChange={(e) => setGenEndDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Total Contract Value (SAR)</label>
                    <input
                      type="number"
                      value={genTotalValue}
                      onChange={(e) => setGenTotalValue(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Monthly Rate (SAR/mo)</label>
                    <input
                      type="number"
                      value={genMonthlyRate}
                      onChange={(e) => setGenMonthlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Breakdown SLA Guarantee</label>
                    <select
                      value={genSlaHours}
                      onChange={(e: any) => setGenSlaHours(parseInt(e.target.value) as 2 | 4)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    >
                      <option value={4}>4-Hour Standard Response SLA</option>
                      <option value={2}>2-Hour Priority / Critical SLA</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genBackupUnit}
                        onChange={(e) => setGenBackupUnit(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-[#ED1A53] focus:ring-[#ED1A53]"
                      />
                      <span className="text-xs text-slate-300 font-semibold">12h Unit Swap Guarantee</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Equipment Summary & Spec</label>
                  <input
                    type="text"
                    value={genEquipmentSummary}
                    onChange={(e) => setGenEquipmentSummary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Site Location</label>
                  <input
                    type="text"
                    value={genSiteLocation}
                    onChange={(e) => setGenSiteLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generateMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    {generateMutation.isPending ? "Generating..." : "Generate Contract"}
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

