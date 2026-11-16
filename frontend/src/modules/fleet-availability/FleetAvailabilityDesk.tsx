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
  ChevronLeft,
  ShieldCheck,
  Fuel,
  Gauge,
  Thermometer,
  ShieldAlert,
  FileText,
  Activity,
  UserCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fleetAvailabilityApi } from "./fleetAvailabilityApi";
import { FleetAssetMatrixItem } from "./types";

interface TimelineJob {
  id: string;
  client: string;
  project: string;
  contractNumber?: string;
  startWeek: number; // 1-12
  spanWeeks: number;
  type: "ON_HIRE" | "MOBILISATION" | "MAINTENANCE" | "AVAILABLE" | "CLASH_LOCKED";
  telemetryNote?: string;
  badge?: string;
}

interface EnrichedAsset {
  id: string;
  code: string;
  model: string;
  ratingKva: number;
  serialNumber: string;
  hub: "Riyadh Central" | "Jubail Industrial" | "Dammam Port & Oilfield";
  status: "ON-HIRE" | "MOBILISATION READY" | "WORKSHOP" | "STANDBY" | "LOCK GUARD";
  hours: number;
  fuelPct: number;
  fuelLiters: string;
  burnRate: string;
  tempC: number;
  oilBar: number;
  voltage: string;
  gps: string;
  contractNumber?: string;
  contractClient?: string;
  contractRate?: string;
  leadEngineer?: string;
  jobs: TimelineJob[];
}

// Initial High-Density Asset Manifest matching Stitch's heavy industrial design
const DEFAULT_ENRICHED_ASSETS: EnrichedAsset[] = [
  {
    id: "gen-500-01",
    code: "GEN-500-01",
    model: "Caterpillar C15 Heavy Soundproof",
    ratingKva: 500,
    serialNumber: "CAT-8891",
    hub: "Riyadh Central",
    status: "ON-HIRE",
    hours: 4120.4,
    fuelPct: 82,
    fuelLiters: "738 L / 900 L",
    burnRate: "42.1 L/hr at 74% Load",
    tempC: 88,
    oilBar: 4.4,
    voltage: "400.2V • 50.02 Hz",
    gps: "24.7136° N, 46.6753° E (Khurais Site)",
    contractNumber: "ARM-9021-PKG4",
    contractClient: "Saudi Aramco Khurais Production Facility",
    contractRate: "SAR 2,450 / Day",
    leadEngineer: "Eng. Ziyad Al-Farhan",
    jobs: [
      { id: "j1", client: "Yard Prep", project: "Mobilisation Yard", startWeek: 1, spanWeeks: 2, type: "MOBILISATION" },
      { id: "j2", client: "Saudi Aramco", project: "Aramco PKG-4 Project (On-Hire Contract #ARM-9021)", contractNumber: "ARM-9021", startWeek: 3, spanWeeks: 8, type: "ON_HIRE", telemetryNote: "4,120 hrs • 82% Fuel", badge: "ACTIVE" },
      { id: "j3", client: "Energia Logistics", project: "Planned Demob Buffer", startWeek: 11, spanWeeks: 2, type: "AVAILABLE" }
    ]
  },
  {
    id: "gen-500-02",
    code: "GEN-500-02",
    model: "Caterpillar C15 Prime Power",
    ratingKva: 500,
    serialNumber: "CAT-8892",
    hub: "Riyadh Central",
    status: "MOBILISATION READY",
    hours: 2840.1,
    fuelPct: 95,
    fuelLiters: "855 L / 900 L",
    burnRate: "41.5 L/hr",
    tempC: 84,
    oilBar: 4.5,
    voltage: "400.0V • 50.00 Hz",
    gps: "Riyadh Depot Yard 2",
    contractNumber: "NEOM-OX-401",
    contractClient: "NEOM Oxagon Utilities Phase I",
    contractRate: "SAR 2,450 / Day",
    leadEngineer: "Eng. Fahad Al-Otaibi",
    jobs: [
      { id: "j4", client: "NEOM", project: "NEOM Oxagon Utilities", startWeek: 1, spanWeeks: 3, type: "ON_HIRE", badge: "Ending" },
      { id: "j5", client: "Maintenance", project: "250h Lube Svc", startWeek: 4, spanWeeks: 1, type: "MAINTENANCE" },
      { id: "j6", client: "Available", project: "Available for Immediate Mobilisation (Riyadh Yard 2)", startWeek: 5, spanWeeks: 8, type: "AVAILABLE", badge: "DISPATCH READY" }
    ]
  },
  {
    id: "gen-1000-04",
    code: "GEN-1000-04",
    model: "MTU Mega 16V2000 Containerized",
    ratingKva: 1000,
    serialNumber: "MTU-104",
    hub: "Jubail Industrial",
    status: "ON-HIRE",
    hours: 5890.0,
    fuelPct: 76,
    fuelLiters: "1,520 L / 2,000 L",
    burnRate: "88.4 L/hr at 78% Load",
    tempC: 91,
    oilBar: 4.6,
    voltage: "400.1V • 50.01 Hz",
    gps: "27.0214° N, 49.6120° E (Jubail Petrochem Complex)",
    contractNumber: "SABIC-SHUT-08",
    contractClient: "SABIC Petrochem Shutdown (Overhaul Backup Grid Phase II)",
    contractRate: "SAR 4,800 / Day",
    leadEngineer: "Eng. Mansoor Al-Ghamdi",
    jobs: [
      { id: "j7", client: "SABIC", project: "SABIC Petrochem Shutdown (Overhaul Backup Grid Phase II)", startWeek: 1, spanWeeks: 9, type: "ON_HIRE", telemetryNote: "1.0 MVA Cont.", badge: "HEAVY GRID" },
      { id: "j8", client: "Inspection", project: "Post-Refinery Inspection Ready", startWeek: 10, spanWeeks: 3, type: "AVAILABLE" }
    ]
  },
  {
    id: "gen-1000-05",
    code: "GEN-1000-05",
    model: "MTU Mega 16V2000 Containerized",
    ratingKva: 1000,
    serialNumber: "MTU-105",
    hub: "Jubail Industrial",
    status: "WORKSHOP",
    hours: 6410.2,
    fuelPct: 40,
    fuelLiters: "800 L / 2,000 L",
    burnRate: "N/A (Shop)",
    tempC: 24,
    oilBar: 0.0,
    voltage: "Standby Line Test",
    gps: "Jubail Maintenance Depot Bay 3",
    contractNumber: "RE-DISPATCH-99",
    contractClient: "Available for Q2 Industrial Tenders",
    contractRate: "SAR 4,800 / Day",
    leadEngineer: "Tech. Adel Al-Mutairi",
    jobs: [
      { id: "j9", client: "Workshop", project: "Megger Test / Alternator Rewind", startWeek: 1, spanWeeks: 2, type: "MAINTENANCE" },
      { id: "j10", client: "Available", project: "Available — Jubail Yard B (Dual Sync Switchboard Ready)", startWeek: 3, spanWeeks: 10, type: "AVAILABLE", badge: "DISPATCH READY" }
    ]
  },
  {
    id: "gen-250-18",
    code: "GEN-250-18",
    model: "Perkins 1506A Soundproof Canopy",
    ratingKva: 250,
    serialNumber: "PRK-218",
    hub: "Dammam Port & Oilfield",
    status: "ON-HIRE",
    hours: 1980.5,
    fuelPct: 88,
    fuelLiters: "440 L / 500 L",
    burnRate: "22.3 L/hr",
    tempC: 82,
    oilBar: 4.2,
    voltage: "400.0V • 50.00 Hz",
    gps: "Southern Dunes Microgrid Site",
    contractNumber: "RSG-DUNES-A",
    contractClient: "Red Sea Global — Southern Dunes Eco-Resort Microgrid (Cluster A)",
    contractRate: "SAR 1,250 / Day",
    leadEngineer: "Eng. Tariq Al-Juhani",
    jobs: [
      { id: "j11", client: "Red Sea Global", project: "Red Sea Global — Southern Dunes Eco-Resort Microgrid (Cluster A)", startWeek: 1, spanWeeks: 12, type: "ON_HIRE", telemetryNote: "120-Day Lease • Stage V Tier", badge: "ACTIVE" }
    ]
  },
  {
    id: "gen-250-19",
    code: "GEN-250-19",
    model: "Perkins 1506A Soundproof Canopy",
    ratingKva: 250,
    serialNumber: "PRK-219",
    hub: "Dammam Port & Oilfield",
    status: "ON-HIRE",
    hours: 2110.0,
    fuelPct: 65,
    fuelLiters: "325 L / 500 L",
    burnRate: "23.0 L/hr",
    tempC: 85,
    oilBar: 4.1,
    voltage: "399.8V • 49.98 Hz",
    gps: "Southern Dunes Microgrid Site",
    contractNumber: "RSG-DUNES-B",
    contractClient: "Red Sea Global — Southern Dunes Eco-Resort Microgrid (Cluster B)",
    contractRate: "SAR 1,250 / Day",
    leadEngineer: "Eng. Tariq Al-Juhani",
    jobs: [
      { id: "j12", client: "Red Sea Global", project: "Red Sea Global — Southern Dunes Eco-Resort Microgrid (Cluster B)", startWeek: 1, spanWeeks: 10, type: "ON_HIRE", telemetryNote: "End Apr 30", badge: "ACTIVE" },
      { id: "j13", client: "Logistics", project: "Returning Hub", startWeek: 11, spanWeeks: 2, type: "AVAILABLE" }
    ]
  },
  {
    id: "gen-60-44",
    code: "GEN-60-44",
    model: "Cummins 4BTA Trailer Auxiliary",
    ratingKva: 60,
    serialNumber: "CUM-644",
    hub: "Riyadh Central",
    status: "STANDBY",
    hours: 940.2,
    fuelPct: 98,
    fuelLiters: "196 L / 200 L",
    burnRate: "7.8 L/hr",
    tempC: 78,
    oilBar: 4.0,
    voltage: "400.0V • 50.00 Hz",
    gps: "Riyadh West Substation Standby",
    contractNumber: "DIRIYAH-VIP-03",
    contractClient: "Diriyah Season VIP Paddock Standby",
    contractRate: "SAR 550 / Day",
    leadEngineer: "Tech. Sultan Al-Rashid",
    jobs: [
      { id: "j14", client: "Standby", project: "Quick-Response Trailer Standby (Riyadh West Substation)", startWeek: 1, spanWeeks: 6, type: "AVAILABLE", badge: "HOT STANDBY" },
      { id: "j15", client: "Diriyah Gate", project: "Diriyah Season VIP Paddock", startWeek: 7, spanWeeks: 3, type: "ON_HIRE", badge: "14 Days" },
      { id: "j16", client: "Depot", project: "Depot Standby", startWeek: 10, spanWeeks: 3, type: "AVAILABLE" }
    ]
  },
  {
    id: "gen-500-09",
    code: "GEN-500-09",
    model: "Caterpillar C15 Heavy Soundproof",
    ratingKva: 500,
    serialNumber: "CAT-8909",
    hub: "Riyadh Central",
    status: "LOCK GUARD",
    hours: 3720.0,
    fuelPct: 70,
    fuelLiters: "630 L / 900 L",
    burnRate: "42.0 L/hr",
    tempC: 86,
    oilBar: 4.3,
    voltage: "400.1V • 50.01 Hz",
    gps: "Qiddiya Site 4",
    contractNumber: "QID-RIG-04",
    contractClient: "Qiddiya Theme Park Substation 4",
    contractRate: "SAR 2,450 / Day",
    leadEngineer: "Eng. Fahad Al-Otaibi",
    jobs: [
      { id: "j17", client: "Qiddiya", project: "Qiddiya Theme Park Substation 4", startWeek: 1, spanWeeks: 5, type: "ON_HIRE", badge: "Active Rig" },
      { id: "j18", client: "COLLISION GUARD", project: "CLASH LOCKED: Requested Booking Overlaps Demob Window", startWeek: 5, spanWeeks: 4, type: "CLASH_LOCKED", badge: "PREVENTION ENGAGED" },
      { id: "j19", client: "Free Slot", project: "Unreserved Free Slot (May 03 onwards)", startWeek: 9, spanWeeks: 4, type: "AVAILABLE" }
    ]
  }
];

const CALENDAR_WEEKS = [
  { code: "W09", label: "Mar 01", isCurrent: false },
  { code: "W10", label: "Mar 08", isCurrent: false },
  { code: "W11", label: "Mar 15", isCurrent: true, tag: "Now" },
  { code: "W12", label: "Mar 22", isCurrent: false },
  { code: "W13", label: "Mar 29", isCurrent: false },
  { code: "W14", label: "Apr 05", isCurrent: false },
  { code: "W15", label: "Apr 12", isCurrent: false },
  { code: "W16", label: "Apr 19", isCurrent: false },
  { code: "W17", label: "Apr 26", isCurrent: false },
  { code: "W18", label: "May 03", isCurrent: false },
  { code: "W19", label: "May 10", isCurrent: false },
  { code: "W20", label: "May 17", isCurrent: false }
];

export default function FleetAvailabilityDesk() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedHub, setSelectedHub] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [selectedAsset, setSelectedAsset] = useState<EnrichedAsset>(DEFAULT_ENRICHED_ASSETS[0]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  // New Booking form state
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultEndStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [bookingAssetId, setBookingAssetId] = useState<string>(DEFAULT_ENRICHED_ASSETS[0].id);
  const [bookingDealId, setBookingDealId] = useState<string>("");
  const [bookingStartDate, setBookingStartDate] = useState<string>(todayStr);
  const [bookingEndDate, setBookingEndDate] = useState<string>(defaultEndStr);
  const [bookingSiteLocation, setBookingSiteLocation] = useState<string>("Jubail Industrial City 2");
  const [bookingOperatorName, setBookingOperatorName] = useState<string>("Tariq Al-Mansoor");
  const [bookingNotes, setBookingNotes] = useState<string>("");

  // Live query from backend API
  const { data: backendMatrix = [] } = useQuery<FleetAssetMatrixItem[]>({
    queryKey: ["fleetAvailabilityMatrix", bookingStartDate, bookingEndDate],
    queryFn: () => fleetAvailabilityApi.getMatrix(bookingStartDate, bookingEndDate, token),
    enabled: !!token
  });

  // Fetch Opportunities for dropdown
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

  // Booking Mutation with backend anti-double-booking algorithm
  const createBookingMutation = useMutation({
    mutationFn: (payload: any) => fleetAvailabilityApi.createBooking(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleetAvailabilityMatrix"] });
      setIsBookingModalOpen(false);
      alert("✅ Reservation confirmed: Equipment locked and collision guard engaged!");
    },
    onError: (err: any) => {
      alert(`⚠️ Clash Prevented: ${err.message || "Failed to book asset."}`);
    }
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate({
      assetId: bookingAssetId,
      dealId: bookingDealId || undefined,
      startDate: bookingStartDate,
      endDate: bookingEndDate,
      siteLocation: bookingSiteLocation,
      assignedOperatorName: bookingOperatorName,
      notes: bookingNotes
    });
  };

  // Filtered Assets
  const filteredAssets = DEFAULT_ENRICHED_ASSETS.filter((asset) => {
    if (selectedHub !== "ALL" && !asset.hub.toLowerCase().includes(selectedHub.toLowerCase())) {
      return false;
    }
    if (selectedRating !== "ALL") {
      if (selectedRating === "60" && asset.ratingKva !== 60) return false;
      if (selectedRating === "250" && asset.ratingKva !== 250) return false;
      if (selectedRating === "500" && asset.ratingKva !== 500) return false;
      if (selectedRating === "1000" && asset.ratingKva < 1000) return false;
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#F8F9FF] dark:bg-[#0B0F17] text-[#0B1C30] dark:text-slate-100 p-4 lg:p-6 space-y-6 font-sans">
      {/* 1. TOP HEADER & OPERATIONAL TELEMETRY SUMMARY */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[#ED1A53] font-mono text-[11px] uppercase tracking-widest font-extrabold">
              Fleet Core V3.8
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs">• Live Synced 12s ago</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              KSA Telemetry Stream Active (Riyadh • Jubail • Dammam)
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B1C30] dark:text-white tracking-tight">
            Generator Fleet Telemetry & Multi-Hub Gantt Schedule
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time dispatch status, reserved client allocations, overhaul windows, and automated clash prevention.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => alert("Dispatch manifest exported for transport & logistics teams.")}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Export Dispatch Sheet</span>
          </button>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#D81248] text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-[#ED1A53]/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Spot Reservation</span>
          </button>
        </div>
      </section>

      {/* 2. QUICK METRICS RIBBON */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                Contracted Fleet
              </span>
              <div className="text-2xl font-black text-[#0B1C30] dark:text-white mt-0.5">
                342 <span className="text-base font-normal text-slate-400">/ 380</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#ED1A53]/10 flex items-center justify-center text-[#ED1A53]">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#ED1A53] font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> 90.0% Fleet Utilization
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Target: &gt;88%</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                Yard Mobilisation Ready
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                26 <span className="text-base font-normal text-slate-400">Units</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ready in &lt; 4 Hours</span>
            <span className="text-slate-400 font-mono text-[10px]">18.4 MW Capacity</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                Workshop & Overhauls
              </span>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                12 <span className="text-base font-normal text-slate-400">Units</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">4 Scheduled • 8 Under Work</span>
            <span className="text-slate-400 font-mono text-[10px]">3.1% Total</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                Schedule Clash Status
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                0 <span className="text-base font-normal text-slate-400">Collisions</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Auto Lock Guard ON</span>
            <span className="text-slate-400 font-mono text-[10px]">1 Warning Solved</span>
          </div>
        </div>
      </section>

      {/* 3. CONTROLS & FILTER SYSTEM */}
      <section className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Hub Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1 shrink-0">Hubs:</span>
            {[
              { id: "ALL", label: "All Hubs (380)" },
              { id: "Riyadh", label: "Riyadh Central (142 Units)" },
              { id: "Jubail", label: "Jubail Industrial (128 Units)" },
              { id: "Dammam", label: "Dammam Port & Oilfield (110 Units)" }
            ].map((hub) => (
              <button
                key={hub.id}
                onClick={() => setSelectedHub(hub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedHub === hub.id
                    ? "bg-[#ED1A53] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {hub.label}
              </button>
            ))}
          </div>

          {/* Time Navigation */}
          <div className="flex items-center gap-2 self-start xl:self-auto">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button className="px-2.5 py-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white">Days</button>
              <button className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm">Weeks</button>
              <button className="px-2.5 py-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white">Months</button>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                Today (Mar 2026)
              </span>
              <button className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Rating Pills & Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Rating:</span>
            {[
              { id: "ALL", label: "All Sizes" },
              { id: "60", label: "60 kVA (Aux)" },
              { id: "250", label: "250 kVA" },
              { id: "500", label: "500 kVA (Prime)" },
              { id: "1000", label: "1000 kVA - 2000 kVA (Heavy Grid)" }
            ].map((rating) => (
              <button
                key={rating.id}
                onClick={() => setSelectedRating(rating.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  selectedRating === rating.id
                    ? "bg-[#ED1A53] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {rating.label}
              </button>
            ))}
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-[#ED1A53]"></span>
              <span>On-Hire / Contract</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-emerald-600"></span>
              <span>Mobilisation Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-slate-400"></span>
              <span>Overhaul / Service</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-amber-500 border border-amber-600"></span>
              <span>Collision Locked</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GANTT SCHEDULE CONTAINER (FIXED ASSET COL + 12-WEEK SCROLLABLE TIMELINE) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1240px] flex flex-col">
            {/* Header Row: Fixed Col Title + 12 Week Headers */}
            <div className="flex items-stretch bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 select-none">
              <div className="w-[300px] shrink-0 p-3 flex items-center justify-between border-r border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800">
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  Asset Manifest & Spec
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {filteredAssets.length} of 380 Units
                </span>
              </div>
              <div className="flex-1 grid grid-cols-12 divide-x divide-slate-200 dark:divide-slate-700/50">
                {CALENDAR_WEEKS.map((w) => (
                  <div
                    key={w.code}
                    className={`p-2 text-center ${
                      w.isCurrent ? "bg-[#ED1A53]/10 text-[#ED1A53]" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      {w.code} {w.tag && `(${w.tag})`}
                    </span>
                    <span className="block text-[10px] text-slate-400">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`flex items-center min-h-[66px] transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-[#ED1A53]/5 dark:bg-[#ED1A53]/10"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Sticky Info Column */}
                    <div className="w-[300px] shrink-0 p-3 flex flex-col justify-center border-r border-slate-200 dark:border-slate-800 bg-inherit">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              asset.status === "ON-HIRE"
                                ? "bg-[#ED1A53] animate-pulse"
                                : asset.status === "MOBILISATION READY"
                                ? "bg-emerald-500"
                                : asset.status === "LOCK GUARD"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          ></span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {asset.code}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            asset.status === "ON-HIRE"
                              ? "bg-[#ED1A53] text-white"
                              : asset.status === "MOBILISATION READY"
                              ? "bg-emerald-500 text-white"
                              : asset.status === "LOCK GUARD"
                              ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {asset.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {asset.model} • {asset.ratingKva} kVA • {asset.hub}
                      </div>
                    </div>

                    {/* Timeline Grid Slot Container */}
                    <div className="flex-1 grid grid-cols-12 h-full items-center relative py-2 px-1 divide-x divide-slate-100 dark:divide-slate-800/40">
                      {/* Current week highlight line */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                        <div className="col-start-3 bg-[#ED1A53]/5 border-x border-[#ED1A53]/20"></div>
                      </div>

                      {/* Render Job Bars */}
                      {asset.jobs.map((job) => {
                        const isClash = job.type === "CLASH_LOCKED";
                        const isMobilisation = job.type === "MOBILISATION";
                        const isMaintenance = job.type === "MAINTENANCE";
                        const isAvailable = job.type === "AVAILABLE";

                        return (
                          <div
                            key={job.id}
                            style={{
                              gridColumnStart: job.startWeek,
                              gridColumnEnd: `span ${job.spanWeeks}`
                            }}
                            className="relative z-10 px-1"
                          >
                            <div
                              className={`h-9 rounded-lg px-2.5 flex items-center justify-between text-xs font-semibold shadow-sm transition-transform hover:scale-[1.01] ${
                                isClash
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-dashed border-amber-500 font-bold"
                                  : isMobilisation
                                  ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                  : isMaintenance
                                  ? "bg-slate-500 text-white"
                                  : isAvailable
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-[#ED1A53] text-white shadow-md shadow-[#ED1A53]/20"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {isClash && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
                                {!isClash && !isAvailable && <Zap className="w-3.5 h-3.5 shrink-0 opacity-80" />}
                                {isAvailable && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
                                <span className="truncate">{job.project}</span>
                              </div>
                              {job.badge && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 ${
                                    isClash
                                      ? "bg-amber-500 text-white"
                                      : isAvailable
                                      ? "bg-emerald-500 text-white"
                                      : "bg-white/20 text-white"
                                  }`}
                                >
                                  {job.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline Footer Note */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auto-allocation engine monitors real-time return inspection times & logistics transit margins (±6 hours buffer).</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Displaying {filteredAssets.length} high-utilization units</span>
            <button
              onClick={() => alert("All 142 Riyadh units loaded into telemetry stream.")}
              className="text-[#ED1A53] font-bold hover:underline"
            >
              Load All Riyadh Units
            </button>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE DETAIL BOTTOM PANEL / LIVE TELEMETRY DESK */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-5 flex flex-col gap-4">
        {/* Panel Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#ED1A53] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#ED1A53]/25 font-black text-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedAsset.code} • {selectedAsset.model}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ED1A53]/15 text-[#ED1A53] font-bold text-xs">
                  {selectedAsset.status}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono text-xs">
                  S/N #{selectedAsset.serialNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedAsset.ratingKva} kVA Standby / {Math.round(selectedAsset.ratingKva * 0.9)} kVA Prime • 400V 50Hz • Integrated Sound-Attenuated Enclosure • Hub: {selectedAsset.hub}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              to="/rental-contracts"
              className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Review Contract & SLA</span>
            </Link>
            <button
              onClick={() => {
                setBookingAssetId(selectedAsset.id);
                setIsBookingModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#D81248] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Reserve This Unit</span>
            </button>
          </div>
        </div>

        {/* Bento Grid: Telemetry Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Engine Hours */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase font-bold tracking-wider">Engine Total Hours</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="my-2">
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {selectedAsset.hours.toLocaleString()} <span className="text-xs text-slate-400 font-normal">hrs</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-[#ED1A53] h-full rounded-full" style={{ width: "82%" }}></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Service due in:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">129.6 hrs (Routine C)</span>
            </div>
          </div>

          {/* Card 2: Fuel Capacity */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase font-bold tracking-wider">Fuel Tank Level</span>
              <Fuel className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {selectedAsset.fuelPct}%
                </div>
                <span className="text-xs text-slate-400">({selectedAsset.fuelLiters})</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${selectedAsset.fuelPct}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Consumption:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsset.burnRate}</span>
            </div>
          </div>

          {/* Card 3: Thermal & Oil */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase font-bold tracking-wider">Thermal & Oil Health</span>
              <Thermometer className="w-4 h-4 text-[#ED1A53]" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedAsset.tempC}°C
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  OPTIMAL
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Oil Pressure: <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedAsset.oilBar} bar</span> (Stable)
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Cooling loop:</span>
              <span className="font-bold text-emerald-600">Pressurized 50/50 Glycol</span>
            </div>
          </div>

          {/* Card 4: Voltage & Telemetry */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] uppercase font-bold tracking-wider">Electrical Output</span>
              <Gauge className="w-4 h-4 text-[#ED1A53]" />
            </div>
            <div className="my-2">
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {selectedAsset.voltage}
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">
                GPS: {selectedAsset.gps}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Field Node:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Online (4G / Sat Backup)</span>
            </div>
          </div>
        </div>

        {/* Active Contract Metadata Banner */}
        {selectedAsset.contractClient && (
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#ED1A53] font-bold shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Contract #{selectedAsset.contractNumber} — {selectedAsset.contractClient}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lead Field Engineer: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAsset.leadEngineer}</span> • Mobilised: 15 Mar 2026 • Contracted Off-Hire: 10 May 2026
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end lg:self-auto">
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white shadow-sm">
                {selectedAsset.contractRate}
              </span>
              <Link
                to="/rental-contracts"
                className="px-3.5 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#D81248] text-white text-xs font-bold transition shadow-sm"
              >
                Open MSA Contract
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 6. SPOT RESERVATION MODAL (WITH ANTI-DOUBLE-BOOKING GUARD) */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ED1A53] text-white flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Create Equipment Reservation
                </h3>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider">Select Equipment Asset</label>
                <select
                  value={bookingAssetId}
                  onChange={(e) => setBookingAssetId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ED1A53]"
                >
                  {DEFAULT_ENRICHED_ASSETS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.model} ({a.ratingKva} kVA, {a.hub})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider">Link Commercial Deal / Project</label>
                <select
                  value={bookingDealId}
                  onChange={(e) => setBookingDealId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ED1A53]"
                >
                  <option value="">-- None / Standby Allocation --</option>
                  {deals.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider">Hire Start Date</label>
                  <input
                    type="date"
                    value={bookingStartDate}
                    onChange={(e) => setBookingStartDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider">Hire End Date</label>
                  <input
                    type="date"
                    value={bookingEndDate}
                    onChange={(e) => setBookingEndDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#ED1A53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider">Project / Site Location</label>
                <input
                  type="text"
                  value={bookingSiteLocation}
                  onChange={(e) => setBookingSiteLocation(e.target.value)}
                  placeholder="e.g. Jubail Industrial City 2 / Ras Tanura Berth 4"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#ED1A53]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider">Assigned Lead Technician / Operator</label>
                <input
                  type="text"
                  value={bookingOperatorName}
                  onChange={(e) => setBookingOperatorName(e.target.value)}
                  placeholder="e.g. Eng. Ziyad Al-Farhan"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#ED1A53]"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Double-Booking Guard:</strong> The system automatically verifies that the asset has zero overlapping on-hire contracts or overhaul buffers before confirming reservation.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#D81248] text-white font-bold transition shadow-md shadow-[#ED1A53]/25"
                >
                  {createBookingMutation.isPending ? "Validating Clash Guard..." : "Lock & Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
