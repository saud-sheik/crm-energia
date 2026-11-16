import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Building2,
  Plus,
  RefreshCw,
  Search,
  X,
  MapPin,
  Filter,
  Layers,
  Wrench,
  Check,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fleetAvailabilityApi } from "./fleetAvailabilityApi";
import { FleetAssetMatrixItem, AssetBooking } from "./types";

export default function FleetAvailabilityDesk() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Date range state for availability checking (default: next 30 days)
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultEndStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(defaultEndStr);
  const [filterMode, setFilterMode] = useState<"ALL" | "AVAILABLE" | "BOOKED">("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [selectedAssetForBooking, setSelectedAssetForBooking] = useState<FleetAssetMatrixItem | null>(null);

  // New Booking form state
  const [bookingAssetId, setBookingAssetId] = useState<string>("");
  const [bookingDealId, setBookingDealId] = useState<string>("");
  const [bookingStartDate, setBookingStartDate] = useState<string>(todayStr);
  const [bookingEndDate, setBookingEndDate] = useState<string>(defaultEndStr);
  const [bookingSiteLocation, setBookingSiteLocation] = useState<string>("Jubail Industrial City 2");
  const [bookingOperatorName, setBookingOperatorName] = useState<string>("");
  const [bookingNotes, setBookingNotes] = useState<string>("");

  // Fetch Fleet Availability Matrix for target hire window
  const { data: matrix = [], isLoading, refetch } = useQuery<FleetAssetMatrixItem[]>({
    queryKey: ["fleetAvailabilityMatrix", startDate, endDate],
    queryFn: () => fleetAvailabilityApi.getMatrix(startDate, endDate, token),
    enabled: !!token,
    refetchInterval: 25000
  });

  // Fetch Opportunities for Booking Dropdown
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["opportunitiesForFleetBooking"],
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

  // Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: (payload: any) => fleetAvailabilityApi.createBooking(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleetAvailabilityMatrix"] });
      setIsBookingModalOpen(false);
      setSelectedAssetForBooking(null);
      alert("Generator successfully reserved for target hire window!");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to create booking.");
    }
  });

  // Quick Preset Helper
  const setQuickPreset = (days: number) => {
    const s = new Date();
    const e = new Date();
    e.setDate(s.getDate() + days);
    setStartDate(s.toISOString().split("T")[0]);
    setEndDate(e.toISOString().split("T")[0]);
  };

  // KPIs
  const totalAssets = matrix.length;
  const availableCount = matrix.filter((m) => m.isAvailableInHireWindow).length;
  const bookedCount = matrix.filter((m) => !m.isAvailableInHireWindow).length;
  const availabilityRate = totalAssets > 0 ? Math.round((availableCount / totalAssets) * 100) : 0;

  // Filtered Matrix
  const filteredMatrix = matrix.filter((item) => {
    if (filterMode === "AVAILABLE" && !item.isAvailableInHireWindow) return false;
    if (filterMode === "BOOKED" && item.isAvailableInHireWindow) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = item.name.toLowerCase();
    const serial = (item.serialNumber || "").toLowerCase();
    const assetNum = (item.assetNumber || "").toLowerCase();
    return name.includes(term) || serial.includes(term) || assetNum.includes(term);
  });

  const handleOpenReserveModal = (asset: FleetAssetMatrixItem) => {
    setSelectedAssetForBooking(asset);
    setBookingAssetId(asset.id);
    setBookingStartDate(startDate);
    setBookingEndDate(endDate);
    setIsBookingModalOpen(true);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingAssetId) {
      alert("Please select a generator asset.");
      return;
    }

    createBookingMutation.mutate({
      assetId: bookingAssetId,
      dealId: bookingDealId || undefined,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
      siteLocation: bookingSiteLocation,
      assignedOperatorName: bookingOperatorName || undefined,
      notes: bookingNotes || undefined
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
                Energia Operations
              </span>
              <span className="text-xs text-slate-500 font-mono">Real-Time Fleet Availability</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#ED1A53] fill-[#ED1A53]" />
              Generator Fleet Booking & Yard Availability
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify generator equipment availability across target rental dates prior to quoting to eliminate double-booking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Fleet Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedAssetForBooking(null);
                setBookingAssetId(matrix[0]?.id || "");
                setIsBookingModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ED1A53]/20 active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" />
              Reserve Generator
            </button>
          </div>
        </div>

        {/* Date Window Selection Bar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#ED1A53]" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">
                Target Hire Window Range
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setQuickPreset(7)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset(14)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset(30)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                +1 Month
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset(90)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                +3 Months
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-semibold">Start Date (Mobilisation)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53] font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-semibold">End Date (Demobilisation)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53] font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Total Fleet Assets</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalAssets}</div>
            <div className="text-[11px] text-slate-500 font-mono">Heavy Power Inventory</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Available in Window</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{availableCount}</div>
            <div className="text-[11px] text-emerald-400/90 font-mono">
              Ready for immediate hire
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Booked / On Hire</span>
              <Clock className="w-4 h-4 text-[#ED1A53]" />
            </div>
            <div className="text-2xl font-black text-[#ED1A53] font-mono">{bookedCount}</div>
            <div className="text-[11px] text-[#ED1A53]/90 font-mono">Committed to Contracts</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Yard Availability Rate</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{availabilityRate}%</div>
            <div className="text-[11px] text-blue-400/90 font-mono">Fleet Utilization Buffer</div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: `All Assets (${totalAssets})` },
              { id: "AVAILABLE", label: `Available Only (${availableCount})` },
              { id: "BOOKED", label: `Booked Only (${bookedCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterMode === tab.id
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
              placeholder="Search generator, serial #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ED1A53]"
            />
          </div>
        </div>

        {/* Fleet Assets Cards / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              Checking real-time fleet bookings...
            </div>
          ) : filteredMatrix.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              No equipment matching the filter in this hire window.
            </div>
          ) : (
            filteredMatrix.map((item) => {
              const isAvailable = item.isAvailableInHireWindow;
              const hasBookings = item.bookings && item.bookings.length > 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-200 space-y-3 flex flex-col justify-between ${
                    isAvailable
                      ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      : "bg-slate-950 border-red-950/60 shadow-inner"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{item.name}</h4>
                        <div className="text-[11px] font-mono text-slate-400">
                          SN: {item.serialNumber || "N/A"} | Asset: {item.assetNumber || "AST-GEN"}
                        </div>
                      </div>

                      {/* Availability Pill */}
                      {isAvailable ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-[#ED1A53]/15 text-[#ED1A53] border border-[#ED1A53]/30 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> On Hire
                        </span>
                      )}
                    </div>

                    {/* Booking Breakdown if overlapping */}
                    {hasBookings && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-red-900/40 text-[11px] space-y-1">
                        <div className="text-[#ED1A53] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Booked during requested dates:
                        </div>
                        {item.bookings.map((b) => (
                          <div key={b.id} className="text-slate-400 font-mono text-[10px]">
                            {new Date(b.startDate).toLocaleDateString()} →{" "}
                            {new Date(b.endDate).toLocaleDateString()}{" "}
                            <span className="text-slate-200 font-semibold">
                              ({b.customer?.name || "Contract"})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Yard: {item.currentBaseStatus}
                    </span>

                    {isAvailable ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReserveModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Reserve
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Reserve Equipment */}
        {isBookingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-white">Reserve Generator for Hire</h3>
                </div>
                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Generator Asset</label>
                  <select
                    value={bookingAssetId}
                    onChange={(e) => setBookingAssetId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  >
                    <option value="">-- Select Generator --</option>
                    {matrix.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.serialNumber || m.assetNumber}) -{" "}
                        {m.isAvailableInHireWindow ? "Available" : "Booked"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Link Opportunity (Optional)</label>
                  <select
                    value={bookingDealId}
                    onChange={(e) => setBookingDealId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  >
                    <option value="">-- None / Standby Reservation --</option>
                    {deals.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.title || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Hire Start Date</label>
                    <input
                      type="date"
                      value={bookingStartDate}
                      onChange={(e) => setBookingStartDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Hire End Date</label>
                    <input
                      type="date"
                      value={bookingEndDate}
                      onChange={(e) => setBookingEndDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Project / Site Location</label>
                  <input
                    type="text"
                    value={bookingSiteLocation}
                    onChange={(e) => setBookingSiteLocation(e.target.value)}
                    placeholder="e.g. Tanura Berth 4 / Jubail Gas Facility"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Assigned Technician / Operator</label>
                  <input
                    type="text"
                    value={bookingOperatorName}
                    onChange={(e) => setBookingOperatorName(e.target.value)}
                    placeholder="e.g. Tariq Al-Mansoor"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createBookingMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    {createBookingMutation.isPending ? "Validating..." : "Confirm Reservation"}
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
