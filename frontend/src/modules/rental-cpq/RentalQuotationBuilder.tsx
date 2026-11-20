import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Zap,
  Calendar,
  Clock,
  Truck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Minus,
  Wrench,
  Fuel,
  Activity,
  Calculator,
  FileText,
  ArrowLeft,
  Building2,
  MapPin,
  Layers,
  Sparkles,
  Info,
  X,
  Bot
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVolviAssist } from "../../context/VolviAssistContext";
import { rentalCpqApi } from "./rentalCpqApi";
import { PowerEquipmentItem, RentalCalculationInput, RentalCalculationBreakdown } from "./types";
import { formatCurrency } from "../../utils/currency";

export default function RentalQuotationBuilder() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { triggerGuidance } = useVolviAssist();
  const [searchParams] = useSearchParams();
  const dealIdParam = searchParams.get("dealId") || "";
  const leadIdParam = searchParams.get("leadId") || "";
  const kvaParam = searchParams.get("kVA") || searchParams.get("kva") || "";
  const cablesParam = searchParams.get("cables") || searchParams.get("cableMeters") || "";
  const fuelTankParam = searchParams.get("fuelTank") || searchParams.get("tank") || "";
  const siteParam = searchParams.get("site") || searchParams.get("siteLocation") || "";
  const paymentTermsParam = searchParams.get("paymentTerms") || "";
  const fromSurvey = searchParams.get("fromSurvey") === "true" || !!(kvaParam || cablesParam || siteParam);

  // Selected state
  const [selectedDealId, setSelectedDealId] = useState(dealIdParam);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("gen-500kva");
  const [quantity, setQuantity] = useState<number>(1);
  const [durationType, setDurationType] = useState<"day" | "week" | "month">("month");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [includeMobDemob, setIncludeMobDemob] = useState<boolean>(true);
  const [customMobFee, setCustomMobFee] = useState<number | undefined>(undefined);
  const [customDemobFee, setCustomDemobFee] = useState<number | undefined>(undefined);
  const [cableMeters, setCableMeters] = useState<number>(cablesParam && !isNaN(Number(cablesParam)) ? Number(cablesParam) : 50);
  const [selectedFuelTankId, setSelectedFuelTankId] = useState<string>("tank-2500l");
  const [operatorRequirement, setOperatorRequirement] = useState<"none" | "single_shift" | "double_shift_24h">("none");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [siteLocation, setSiteLocation] = useState<string>(siteParam ? decodeURIComponent(siteParam) : "Jubail Industrial City Site 2");
  const [paymentTerms, setPaymentTerms] = useState<"100_ADVANCE" | "NET_30" | "NET_60">("100_ADVANCE");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    quoteId: string;
    quoteNumber: string;
    dealId?: string;
    dealName?: string;
    clientName?: string;
    totalValue?: number;
  } | null>(null);

  // Fetch Opportunities / Deals
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["allOpportunitiesForRentalCpq"],
    queryFn: async () => {
      const res = await fetch("/api/v1/opportunities", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: !!token
  });

  // Fetch Rate Cards
  const { data: catalog = [], isLoading: isLoadingCatalog } = useQuery<PowerEquipmentItem[]>({
    queryKey: ["rentalRateCards"],
    queryFn: () => rentalCpqApi.getRateCards(token),
    staleTime: 60000
  });

  const generators = catalog.filter((it) => it.category === "generator");
  const fuelTanks = catalog.filter((it) => it.category === "fuel_tank");

  // Auto-select Target Opportunity from dealId or leadId
  useEffect(() => {
    if (deals && deals.length > 0) {
      if (dealIdParam && deals.some((d: any) => d.id === dealIdParam)) {
        setSelectedDealId(dealIdParam);
      } else if (leadIdParam) {
        const match = deals.find((d: any) => d.leadId === leadIdParam);
        if (match) {
          setSelectedDealId(match.id);
        }
      }
    }
  }, [deals, dealIdParam, leadIdParam]);

  useEffect(() => {
    if (generators.length > 0 && kvaParam) {
      const match = generators.find(g => String(g.kvaRating) === String(kvaParam));
      if (match) {
        setSelectedEquipmentId(match.id);
      } else {
        const closest = generators
          .filter(g => (g.kvaRating || 0) >= Number(kvaParam))
          .sort((a, b) => (a.kvaRating || 0) - (b.kvaRating || 0))[0];
        if (closest) setSelectedEquipmentId(closest.id);
      }
    }
  }, [generators, kvaParam]);

  useEffect(() => {
    if (fuelTanks.length > 0 && fuelTankParam) {
      const cleanParam = fuelTankParam.toLowerCase().replace(/[^0-9]/g, "");
      const match = fuelTanks.find(t => 
        (cleanParam && t.id.includes(cleanParam)) ||
        t.name.toLowerCase().includes(fuelTankParam.toLowerCase()) ||
        t.id.toLowerCase().includes(fuelTankParam.toLowerCase())
      );
      if (match) {
        setSelectedFuelTankId(match.id);
      }
    }
  }, [fuelTanks, fuelTankParam]);

  useEffect(() => {
    if (paymentTermsParam && ["100_ADVANCE", "NET_30", "NET_60"].includes(paymentTermsParam)) {
      setPaymentTerms(paymentTermsParam as any);
    }
  }, [paymentTermsParam]);

  // Selected Equipment Details
  const selectedEquipment = catalog.find((item) => item.id === selectedEquipmentId) || generators[0];

  // Prepare input for real-time calculation
  const calculationInput: RentalCalculationInput = {
    equipmentId: selectedEquipmentId,
    quantity,
    durationType,
    durationValue,
    includeMobDemob,
    customMobFee,
    customDemobFee,
    cableMeters,
    fuelTankId: selectedFuelTankId !== "none" ? selectedFuelTankId : undefined,
    operatorRequirement,
    discountPercent,
    taxPercent: 15
  };

  // Real-time calculation query
  const { data: breakdown, isLoading: isCalculating } = useQuery<RentalCalculationBreakdown>({
    queryKey: ["rentalCalculation", calculationInput],
    queryFn: () => rentalCpqApi.calculateQuote(calculationInput, token),
    enabled: !!selectedEquipmentId,
    staleTime: 5000
  });

  const handleCreateQuote = async () => {
    let effectiveDealId = selectedDealId;
    if (!effectiveDealId && deals && deals.length > 0) {
      if (leadIdParam) {
        const match = deals.find((d: any) => d.leadId === leadIdParam);
        if (match) effectiveDealId = match.id;
      }
      if (!effectiveDealId) effectiveDealId = deals[0]?.id;
    }

    if (!effectiveDealId) {
      alert("Please select an Opportunity / Deal to link this rental quote.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await rentalCpqApi.createRentalQuote(
        {
          dealId: effectiveDealId,
          calculationInput,
          notes,
          siteLocation
        },
        token
      );

      const matchedDeal = deals.find((d: any) => d.id === effectiveDealId);
      setSubmissionSuccess({
        quoteId: res.quoteId,
        quoteNumber: res.quoteNumber,
        dealId: effectiveDealId,
        dealName: matchedDeal?.title || matchedDeal?.name || "NEOM Concrete Batching Plant",
        clientName: matchedDeal?.account?.name || "Al-Bawani Contracting Ltd",
        totalValue: breakdown?.finalTotalAmount || 39726.75,
      });

      const isAdvance = paymentTerms === "100_ADVANCE";
      if (isAdvance) {
        triggerGuidance({
          stepNumber: 6,
          stageName: "Step 4 Completed • Fast-Track 100% Advance Cleared",
          message: `Rental Quotation Generated (${res.quoteNumber}) • 100% Advance Paid`,
          explanation: "Cash / upfront deposit verified. Financial underwriting gate bypassed. Ready to formulate and execute Master Equipment Rental Agreement.",
          recommendedAction: "Draft Master Rental Agreement (Step 6)",
          actionLabel: "Draft Rental Contract (Step 6) ➔",
          actionPath: effectiveDealId ? `/rental-contracts?dealId=${effectiveDealId}&fromAdvance=true` : "/rental-contracts",
          technicalTip: "Advance payment terms eliminate SIMAH credit hold and allow rapid 2-hour mobilization.",
          suggestedPrompt: "What SLAs and mobilization guarantees apply to 100% advance rental contracts?"
        });
      } else {
        triggerGuidance({
          stepNumber: 5,
          stageName: "Step 4 Completed • CPQ Quote Generated",
          message: `Rental Quotation Generated (${res.quoteNumber})`,
          explanation: "Proposal formulated with 20x monthly multiplier. Proceed to Credit KYC Desk to verify CR & ZATCA tax clearance.",
          recommendedAction: "Verify Credit & KYC",
          actionLabel: "Open Credit & KYC Desk (Step 5) ➔",
          actionPath: effectiveDealId ? `/credit-kyc?dealId=${effectiveDealId}` : "/credit-kyc",
          technicalTip: "ZATCA Compliance: 15% VAT and Wathq commercial registration validation required.",
          suggestedPrompt: "Verify ZATCA 15% VAT & Wathq CR compliance rules"
        });
      }

      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["allOpportunitiesForRentalCpq"] });
    } catch (err: any) {
      alert(err.message || "Failed to create rental quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 font-sans selection:bg-[#ED1A53]/20 selection:text-[#ED1A53]">
      {/* Top Banner / Breadcrumb */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/quotes"
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 transition shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-700 border border-slate-300/80">
                  Energia Rental CPQ
                </span>
                <span className="text-xs text-slate-500 font-mono">v1.0 • Equipment Rate Cards</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 mt-1 flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#ED1A53] fill-[#ED1A53]" />
                Power Equipment Hire Quoting Engine
              </h1>
            </div>
          </div>

          {/* Deal Picker */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-800 font-semibold block">Target Opportunity</span>
              <span className="text-[11px] text-slate-500">Commercial Account Link</span>
            </div>
            <select
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#45142B] transition min-w-[220px] shadow-sm"
            >
              <option value="">-- Select Opportunity --</option>
              {deals.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title || d.name} ({d.account?.name || d.lead?.company || "Commercial"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Certified Site Survey Auto-Populated Specs Notification Banner */}
        {fromSurvey && (
          <div className="bg-[#F8F4F6] border border-[#E5D4DE] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5C1A3C] to-[#45142B] text-[#E0B571] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-[#7A2350]/30">
                ⚡
              </span>
              <div>
                <span className="font-black text-[#551938] block text-sm">
                  Auto-Populated from Certified Site Survey
                </span>
                <span className="text-slate-600 font-medium">
                  {kvaParam ? `${kvaParam} kVA Package` : "Generator Package"} • {cableMeters}m Armored Cabling • {siteLocation}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white text-[#7A1938] text-[11px] font-extrabold border border-[#E5D4DE] shrink-0 self-start sm:self-auto shadow-2xs">
              ✓ Technical Sizing Synchronized
            </span>
          </div>
        )}

        {/* Centered High-End Modal Dialog (Celebration & Transition Cockpit) */}
        {submissionSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSubmissionSuccess(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Celebration Avatar */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    Step 4 Complete · Quote Locked
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Rental Proposal Generated!
                  </h3>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Quote Reference:</span>
                  <span className="font-mono font-black text-[#ED1A53] text-sm">
                    {submissionSuccess.quoteNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Target Account:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{submissionSuccess.clientName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Power Asset Package:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEquipment?.name}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Total Proposal Value:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(submissionSuccess.totalValue || 0)}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">/ month</span>
                  </span>
                </div>
              </div>

              {/* Volvi Guide Guidance Pill */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Volvi Guide • Next Step Advisor</span>
                </div>
                <span className="text-[10px] text-rose-200 font-semibold">{paymentTerms === "100_ADVANCE" ? "Fast-Track Cash Cleared" : "ZATCA 15% VAT Ready"}</span>
              </div>

              {/* Next Step Banner */}
              {paymentTerms === "100_ADVANCE" ? (
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-50/50 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white block font-bold text-xs text-emerald-800 dark:text-emerald-300">
                      ⚡ Fast-Track 100% Advance Deposit: Pre-Approved &amp; KYC Bypassed!
                    </strong>
                    {submissionSuccess.clientName} is on <span className="font-semibold text-emerald-700 dark:text-emerald-400">100% Upfront Advance</span> terms. Financial risk is pre-cleared by policy. Skip the underwriting queue and proceed straight to Master Rental Agreement drafting.
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-500/10 via-indigo-50/50 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-white block font-bold">Next in Lifecycle: Step 5 (Credit &amp; KYC Desk)</strong>
                    {submissionSuccess.clientName} is on <span className="font-semibold text-blue-700 dark:text-blue-400">30/60-Day Terms</span>. Proceed to the Credit Desk for corporate SIMAH credit verification.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {paymentTerms === "100_ADVANCE" ? (
                  <button
                    type="button"
                    onClick={() => navigate(submissionSuccess.dealId ? `/rental-contracts?dealId=${submissionSuccess.dealId}&fromAdvance=true` : "/rental-contracts")}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>Proceed Directly to Step 6: Draft Rental Contracts</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(submissionSuccess.dealId ? `/credit-kyc?dealId=${submissionSuccess.dealId}` : "/credit-kyc")}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>Proceed to Step 5: Credit &amp; KYC Desk</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/pipeline")}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                  >
                    View in Sales Pipeline ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionSuccess(null)}
                    className="py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Configurator (Left 8 cols) + Commercial Summary (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Equipment & Rental Parameter Controls */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Equipment Selection (Rose Alabaster Card) */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-[#EED5DE] rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_-2px_rgba(140,22,60,0.05)] text-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-[#ED1A53] flex items-center justify-center font-bold text-xs border border-rose-200">
                    1
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Select Power Generation Asset
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {generators.length} Generators in Fleet
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {generators.map((gen) => {
                  const isSelected = selectedEquipmentId === gen.id;
                  return (
                    <div
                      key={gen.id}
                      onClick={() => setSelectedEquipmentId(gen.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-200 relative ${
                        isSelected
                          ? "bg-rose-50/70 border-[#ED1A53] shadow-md ring-1 ring-[#ED1A53]"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ED1A53]" />
                      )}
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-lg font-black text-slate-900 font-mono">
                          {gen.kvaRating} <span className="text-xs font-bold text-[#ED1A53]">kVA</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600">
                          {gen.dailyRate} SAR/d
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 mb-1.5">
                        {gen.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200 mb-2">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Yard Ready
                        </span>
                        <span className="font-bold">
                          {gen.kvaRating === 500 ? "12 Units" : gen.kvaRating === 1000 ? "8 Units" : gen.kvaRating === 250 ? "6 Units" : "4 Units"}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-200/80 pt-2 font-mono">
                        <div className="flex justify-between">
                          <span>Fuel @75%:</span>
                          <span className="text-slate-700 font-bold">{gen.fuelConsumptionLph} L/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Hire:</span>
                          <span className="text-slate-700 font-bold">{gen.minimumHireDays} Days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedEquipment && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#ED1A53] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{selectedEquipment.name}: </span>
                      <span className="text-slate-600">{selectedEquipment.specSummary}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Yard Mobilisation Ready: Units Available in Jubail &amp; Riyadh Hubs (Dispatch Turnaround &lt; 4h)</span>
                    </div>
                    <Link
                      to="/fleet-availability"
                      target="_blank"
                      className="text-[#ED1A53] hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>Inspect Multi-Hub Gantt Schedule</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Hire Duration & Multiplier Matrix (Rose Alabaster Card) */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-[#EED5DE] rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_-2px_rgba(140,22,60,0.05)] text-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-[#ED1A53] flex items-center justify-center font-bold text-xs border border-rose-200">
                    2
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Hire Duration & Rate Multiplier
                  </h3>
                </div>
                {breakdown && !breakdown.minimumHireSatisfied && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Minimum Hire Adjustment
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Duration Type Tabs */}
                {(["day", "week", "month"] as const).map((type) => {
                  const isActive = durationType === type;
                  const label = type === "day" ? "Day Rate" : type === "week" ? "Weekly (5x Multi)" : "Monthly (20x Multi)";
                  const subtext =
                    type === "day"
                      ? "Short-term / Standby"
                      : type === "week"
                      ? "7-day hire (5 days billed)"
                      : "30-day hire (20 days billed)";

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDurationType(type)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? "bg-rose-50/70 border-[#ED1A53] text-[#45142B] ring-1 ring-[#ED1A53]"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-extrabold text-xs uppercase tracking-wider">{label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{subtext}</div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity & Units Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Duration ({durationType === "day" ? "Days" : durationType === "week" ? "Weeks" : "Months"})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationValue((prev) => Math.max(1, prev - 1))}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                    <button
                      type="button"
                      onClick={() => setDurationValue((prev) => prev + 1)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Equipment Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {breakdown && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                  <span className="text-slate-600">
                    Billed Window: <strong className="text-slate-900">{breakdown.hirePeriodDescription}</strong>
                  </span>
                  <span className="text-slate-600">
                    Unit Period Rate: <strong className="text-[#ED1A53]">{formatCurrency(breakdown.appliedUnitRate)}</strong>
                  </span>
                  <span className="text-slate-600">
                    Base Daily Rate: <strong className="text-slate-900">{formatCurrency(breakdown.baseDailyRate)}/day</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Logistics (Mobilisation & Demobilisation) (Rose Alabaster Card) */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-[#EED5DE] rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_-2px_rgba(140,22,60,0.05)] text-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-[#ED1A53] flex items-center justify-center font-bold text-xs border border-rose-200">
                    3
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Mobilisation & Demobilisation (Heavy Haulage)
                  </h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMobDemob}
                    onChange={(e) => setIncludeMobDemob(e.target.checked)}
                    className="rounded border-slate-300 text-[#ED1A53] focus:ring-[#ED1A53]"
                  />
                  <span className="text-xs text-slate-700 font-bold">Include Logistics</span>
                </label>
              </div>

              {includeMobDemob && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Mobilisation (Delivery & Crane Rigging)</label>
                      <input
                        type="number"
                        placeholder={`Default: ${selectedEquipment?.defaultMobFee * quantity} SAR`}
                        value={customMobFee !== undefined ? customMobFee : ""}
                        onChange={(e) =>
                          setCustomMobFee(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Demobilisation (Site Clearance & Haulage)</label>
                      <input
                        type="number"
                        placeholder={`Default: ${selectedEquipment?.defaultDemobFee * quantity} SAR`}
                        value={customDemobFee !== undefined ? customDemobFee : ""}
                        onChange={(e) =>
                          setCustomDemobFee(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Operational Delivery Site / Project Location</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        placeholder="e.g. Jafurah Gas Plant, Sector 4, Off Road 10"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Ancillaries & Operational Add-ons (Rose Alabaster Card) */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-[#EED5DE] rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_-2px_rgba(140,22,60,0.05)] text-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-50 text-[#ED1A53] flex items-center justify-center font-bold text-xs border border-rose-200">
                  4
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Ancillary Equipment & Certified Operator
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* External Fuel Tank */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-[#ED1A53]" /> External Fuel Tank
                  </label>
                  <select
                    value={selectedFuelTankId}
                    onChange={(e) => setSelectedFuelTankId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                  >
                    <option value="none">No External Tank</option>
                    {fuelTanks.map((tank) => (
                      <option key={tank.id} value={tank.id}>
                        {tank.name} ({tank.dailyRate} SAR/d)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cable Length */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#ED1A53]" /> 4-Core Power Cable (Meters)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={cableMeters}
                    onChange={(e) => setCableMeters(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                    placeholder="Meters (e.g. 50)"
                  />
                </div>

                {/* Certified Operator */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#ED1A53]" /> Certified Operator
                  </label>
                  <select
                    value={operatorRequirement}
                    onChange={(e: any) => setOperatorRequirement(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                  >
                    <option value="none">No Operator (Self-Operated)</option>
                    <option value="single_shift">Single Shift 8-hr (250 SAR/d)</option>
                    <option value="double_shift_24h">24/7 Continuous 2-Shift (450 SAR/d)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Commercial Quote Breakdown & Actions (Elevated White Card) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-white rounded-[24px] p-5 sticky top-6 space-y-5 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#ED1A53]" /> Commercial Summary
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Energia Rental Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#ED1A53] border border-rose-200">
                  {durationType.toUpperCase()} RATE
                </span>
              </div>

              {/* Itemized Line Costs */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Equipment Hire:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(breakdown?.rentalDurationSubtotal || 0)}
                  </span>
                </div>

                {includeMobDemob && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Logistics (Mob + Demob):</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {formatCurrency(breakdown?.totalLogistics || 0)}
                    </span>
                  </div>
                )}

                {breakdown && breakdown.cableCost > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Power Cables ({cableMeters}m):</span>
                    <span className="font-mono text-slate-900 font-semibold">{formatCurrency(breakdown.cableCost)}</span>
                  </div>
                )}

                {breakdown && breakdown.fuelTankCost > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Aux Fuel Tank:</span>
                    <span className="font-mono text-slate-900 font-semibold">{formatCurrency(breakdown.fuelTankCost)}</span>
                  </div>
                )}

                {breakdown && breakdown.operatorCost > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Operator Attendance:</span>
                    <span className="font-mono text-slate-900 font-semibold">{formatCurrency(breakdown.operatorCost)}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-slate-900 font-bold">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(breakdown?.grossSubtotal || 0)}</span>
                </div>

                {/* Discount Slider */}
                <div className="pt-2 pb-1 space-y-1.5 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Commercial Discount:</span>
                    <span className="font-mono font-bold text-[#ED1A53]">{discountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                    className="w-full accent-[#ED1A53]"
                  />
                  {breakdown && breakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-[11px] text-[#ED1A53] font-mono font-bold">
                      <span>Discount Saved:</span>
                      <span>-{formatCurrency(breakdown.discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-slate-600 text-xs">
                  <span>VAT (15%):</span>
                  <span className="font-mono text-slate-900 font-semibold">{formatCurrency(breakdown?.taxAmount || 0)}</span>
                </div>

                {/* Payment Terms Selector & Cash Policy */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#ED1A53]" /> Payment Terms:
                    </span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {paymentTerms === "100_ADVANCE" ? "100% Upfront Advance" : paymentTerms === "NET_30" ? "Net 30 Days" : "Net 60 Days"}
                    </span>
                  </div>
                  <select
                    value={paymentTerms}
                    onChange={(e: any) => setPaymentTerms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#45142B]"
                  >
                    <option value="100_ADVANCE">100% Upfront Advance (New Customer Mandatory Policy)</option>
                    <option value="NET_30">30 Days Net (Requires Credit Desk Underwriting)</option>
                    <option value="NET_60">60 Days Net (Approved Master Credit Line)</option>
                  </select>
                </div>

                {/* AI Credit Risk & Cash Protection Advisory */}
                {paymentTerms === "100_ADVANCE" && (
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        🛡️ Credit Guard: New Account Policy
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-200/80 rounded text-amber-900">
                        Cash Protection
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Account has <b>no prior credit history</b>. Quote enforces <b>100% Advance Payment</b> (Month 1 hire + 2-way mobilization freight). Fleet cannot be dispatched from yard before deposit confirmation.
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-amber-700">Enforced by Step 5 (Credit Desk)</span>
                      <Link to="/credit-kyc" className="font-black text-[#ED1A53] hover:underline flex items-center gap-0.5">
                        <span>Open Credit Desk</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Final Total */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                    Total Rental Quote Value
                  </div>
                  <div className="text-2xl font-black text-[#45142B] font-mono tracking-tight">
                    {formatCurrency(breakdown?.finalTotalAmount || 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Includes equipment, logistics & tax</div>
                </div>

                {/* Daily Estimated Fuel */}
                {breakdown && breakdown.estimatedFuelUsageDailyLiters > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-600" /> Est. Daily Fuel:
                    </span>
                    <span className="font-bold text-slate-900">
                      ~{breakdown.estimatedFuelUsageDailyLiters} Liters/day
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateQuote}
                  disabled={isSubmitting}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isSubmitting
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#ED1A53] via-[#D81248] to-[#B00F38] hover:from-[#d81248] hover:to-[#960a2d] text-white shadow-lg shadow-[#ED1A53]/25 active:scale-[0.98]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{isSubmitting ? "Generating Rental Quote..." : "Generate Rental Quote"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

