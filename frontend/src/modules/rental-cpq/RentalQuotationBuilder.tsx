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
  Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { rentalCpqApi } from "./rentalCpqApi";
import { PowerEquipmentItem, RentalCalculationInput, RentalCalculationBreakdown } from "./types";
import { formatCurrency } from "../../utils/currency";

export default function RentalQuotationBuilder() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const dealIdParam = searchParams.get("dealId") || "";

  // Selected state
  const [selectedDealId, setSelectedDealId] = useState(dealIdParam);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("gen-500kva");
  const [quantity, setQuantity] = useState<number>(1);
  const [durationType, setDurationType] = useState<"day" | "week" | "month">("month");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [includeMobDemob, setIncludeMobDemob] = useState<boolean>(true);
  const [customMobFee, setCustomMobFee] = useState<number | undefined>(undefined);
  const [customDemobFee, setCustomDemobFee] = useState<number | undefined>(undefined);
  const [cableMeters, setCableMeters] = useState<number>(50);
  const [selectedFuelTankId, setSelectedFuelTankId] = useState<string>("tank-2500l");
  const [operatorRequirement, setOperatorRequirement] = useState<"none" | "single_shift" | "double_shift_24h">("none");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [siteLocation, setSiteLocation] = useState<string>("Jubail Industrial City Site 2");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ quoteId: string; quoteNumber: string } | null>(null);

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
    if (!selectedDealId) {
      alert("Please select an Opportunity / Deal to link this rental quote.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await rentalCpqApi.createRentalQuote(
        {
          dealId: selectedDealId,
          calculationInput,
          notes,
          siteLocation
        },
        token
      );

      setSubmissionSuccess({
        quoteId: res.quoteId,
        quoteNumber: res.quoteNumber
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (err: any) {
      alert(err.message || "Failed to create rental quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 font-sans selection:bg-[#ED1A53]/20 selection:text-[#ED1A53]">
      {/* Top Banner / Breadcrumb */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/quotes"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-[#ED1A53]/15 text-[#ED1A53] border border-[#ED1A53]/30">
                  Energia Rental CPQ
                </span>
                <span className="text-xs text-slate-500 font-mono">v1.0 • Equipment Rate Cards</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#ED1A53] fill-[#ED1A53]" />
                Power Equipment Hire Quoting Engine
              </h1>
            </div>
          </div>

          {/* Deal Picker */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block font-medium">Target Opportunity</span>
              <span className="text-xs text-slate-500">Commercial Account Link</span>
            </div>
            <select
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#ED1A53] focus:ring-1 focus:ring-[#ED1A53] transition min-w-[220px]"
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

        {/* Success Modal Notification */}
        {submissionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-200">
                  Rental Quote {submissionSuccess.quoteNumber} Generated Successfully
                </h4>
                <p className="text-xs text-emerald-300/80">
                  The quote and itemized equipment line items have been registered into the core workflow.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/quotes`}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                View in Quotes
              </Link>
              <button
                onClick={() => setSubmissionSuccess(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Configurator (Left 8 cols) + Commercial Summary (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Equipment & Rental Parameter Controls */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Equipment Selection */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#ED1A53]/20 text-[#ED1A53] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Select Power Generation Asset
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
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
                      className={`cursor-pointer rounded-lg p-3.5 border transition-all duration-200 relative ${
                        isSelected
                          ? "bg-slate-800 border-[#ED1A53] shadow-lg shadow-[#ED1A53]/10 ring-1 ring-[#ED1A53]"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ED1A53]" />
                      )}
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-lg font-black text-white font-mono">
                          {gen.kvaRating} <span className="text-xs font-bold text-[#ED1A53]">kVA</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {gen.dailyRate} SAR/d
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-2">
                        {gen.name}
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                        <div className="flex justify-between">
                          <span>Fuel @75%:</span>
                          <span className="text-slate-300 font-bold">{gen.fuelConsumptionLph} L/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Hire:</span>
                          <span className="text-slate-300 font-bold">{gen.minimumHireDays} Days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedEquipment && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#ED1A53] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white">{selectedEquipment.name}: </span>
                    <span className="text-slate-400">{selectedEquipment.specSummary}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Hire Duration & Multiplier Matrix */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#ED1A53]/20 text-[#ED1A53] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Hire Duration & Rate Multiplier
                  </h3>
                </div>
                {breakdown && !breakdown.minimumHireSatisfied && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Minimum Hire Adjustment
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
                      className={`p-3 rounded-lg border text-left transition ${
                        isActive
                          ? "bg-[#ED1A53]/10 border-[#ED1A53] text-white ring-1 ring-[#ED1A53]"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="font-bold text-xs uppercase tracking-wider">{label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{subtext}</div>
                    </button>
                  );
                })}
              </div>

              {/* Quantity & Units Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Duration ({durationType === "day" ? "Days" : durationType === "week" ? "Weeks" : "Months"})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationValue((prev) => Math.max(1, prev - 1))}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                    <button
                      type="button"
                      onClick={() => setDurationValue((prev) => prev + 1)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Equipment Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {breakdown && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                  <span className="text-slate-400">
                    Billed Window: <strong className="text-white">{breakdown.hirePeriodDescription}</strong>
                  </span>
                  <span className="text-slate-400">
                    Unit Period Rate: <strong className="text-[#ED1A53]">{formatCurrency(breakdown.appliedUnitRate)}</strong>
                  </span>
                  <span className="text-slate-400">
                    Base Daily Rate: <strong className="text-white">{formatCurrency(breakdown.baseDailyRate)}/day</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Logistics (Mobilisation & Demobilisation) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#ED1A53]/20 text-[#ED1A53] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Mobilisation & Demobilisation (Heavy Haulage)
                  </h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMobDemob}
                    onChange={(e) => setIncludeMobDemob(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-[#ED1A53] focus:ring-[#ED1A53]"
                  />
                  <span className="text-xs text-slate-300 font-semibold">Include Logistics</span>
                </label>
              </div>

              {includeMobDemob && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Mobilisation (Delivery & Crane Rigging)</label>
                      <input
                        type="number"
                        placeholder={`Default: ${selectedEquipment?.defaultMobFee * quantity} SAR`}
                        value={customMobFee !== undefined ? customMobFee : ""}
                        onChange={(e) =>
                          setCustomMobFee(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ED1A53]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Demobilisation (Site Clearance & Haulage)</label>
                      <input
                        type="number"
                        placeholder={`Default: ${selectedEquipment?.defaultDemobFee * quantity} SAR`}
                        value={customDemobFee !== undefined ? customDemobFee : ""}
                        onChange={(e) =>
                          setCustomDemobFee(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ED1A53]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Operational Delivery Site / Project Location</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        placeholder="e.g. Jafurah Gas Plant, Sector 4, Off Road 10"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Ancillaries & Operational Add-ons */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#ED1A53]/20 text-[#ED1A53] flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Ancillary Equipment & Certified Operator
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* External Fuel Tank */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-[#ED1A53]" /> External Fuel Tank
                  </label>
                  <select
                    value={selectedFuelTankId}
                    onChange={(e) => setSelectedFuelTankId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
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
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#ED1A53]" /> 4-Core Power Cable (Meters)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={cableMeters}
                    onChange={(e) => setCableMeters(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ED1A53]"
                    placeholder="Meters (e.g. 50)"
                  />
                </div>

                {/* Certified Operator */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#ED1A53]" /> Certified Operator
                  </label>
                  <select
                    value={operatorRequirement}
                    onChange={(e: any) => setOperatorRequirement(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  >
                    <option value="none">No Operator (Self-Operated)</option>
                    <option value="single_shift">Single Shift 8-hr (250 SAR/d)</option>
                    <option value="double_shift_24h">24/7 Continuous 2-Shift (450 SAR/d)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Commercial Quote Breakdown & Actions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#ED1A53]" /> Commercial Summary
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Energia Rental Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ED1A53]/20 text-[#ED1A53] border border-[#ED1A53]/40">
                  {durationType.toUpperCase()} RATE
                </span>
              </div>

              {/* Itemized Line Costs */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Equipment Hire:</span>
                  <span className="font-mono font-bold text-white">
                    {formatCurrency(breakdown?.rentalDurationSubtotal || 0)}
                  </span>
                </div>

                {includeMobDemob && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Logistics (Mob + Demob):</span>
                    <span className="font-mono text-slate-200">
                      {formatCurrency(breakdown?.totalLogistics || 0)}
                    </span>
                  </div>
                )}

                {breakdown && breakdown.cableCost > 0 && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Power Cables ({cableMeters}m):</span>
                    <span className="font-mono text-slate-200">{formatCurrency(breakdown.cableCost)}</span>
                  </div>
                )}

                {breakdown && breakdown.fuelTankCost > 0 && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Aux Fuel Tank:</span>
                    <span className="font-mono text-slate-200">{formatCurrency(breakdown.fuelTankCost)}</span>
                  </div>
                )}

                {breakdown && breakdown.operatorCost > 0 && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Operator Attendance:</span>
                    <span className="font-mono text-slate-200">{formatCurrency(breakdown.operatorCost)}</span>
                  </div>
                )}

                <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-slate-300 font-semibold">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(breakdown?.grossSubtotal || 0)}</span>
                </div>

                {/* Discount Slider */}
                <div className="pt-2 pb-1 space-y-1.5 border-t border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Commercial Discount:</span>
                    <span className="font-mono font-bold text-[#ED1A53]">{discountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                    className="w-full accent-[#ED1A53] bg-slate-950"
                  />
                  {breakdown && breakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-[11px] text-[#ED1A53] font-mono">
                      <span>Discount Saved:</span>
                      <span>-{formatCurrency(breakdown.discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>VAT (15%):</span>
                  <span className="font-mono text-slate-200">{formatCurrency(breakdown?.taxAmount || 0)}</span>
                </div>

                {/* Final Total */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Total Rental Quote Value
                  </div>
                  <div className="text-2xl font-black text-white font-mono tracking-tight text-[#ED1A53]">
                    {formatCurrency(breakdown?.finalTotalAmount || 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Includes equipment, logistics & tax</div>
                </div>

                {/* Daily Estimated Fuel */}
                {breakdown && breakdown.estimatedFuelUsageDailyLiters > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-500" /> Est. Daily Fuel:
                    </span>
                    <span className="font-bold text-slate-200">
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
                  disabled={isSubmitting || !selectedDealId}
                  className={`w-full py-3 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    selectedDealId && !isSubmitting
                      ? "bg-[#ED1A53] hover:bg-[#C71042] text-white shadow-[#ED1A53]/20 active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {isSubmitting ? "Generating Rental Quote..." : "Generate Rental Quote"}
                </button>

                {!selectedDealId && (
                  <p className="text-[11px] text-amber-400/90 text-center font-medium">
                    ⚠️ Select an Opportunity at the top to enable quote generation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

