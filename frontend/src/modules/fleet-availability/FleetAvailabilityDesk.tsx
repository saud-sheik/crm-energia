import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  UserCheck,
  TrendingUp,
  BarChart3,
  DollarSign,
  Target,
  Maximize2,
  ArrowUpRight,
  Sliders,
  Sparkles,
  Radio,
  BatteryCharging,
  AlertCircle,
  Printer,
  Box,
  Palette,
  Eye,
  Layers as LayersIcon
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useVolviAssist } from "../../context/VolviAssistContext";
import { siteInspectionApi } from "../../api/siteInspection";
import { rentalContractApi } from "../rental-contracts/rentalContractApi";
import { fleetAvailabilityApi } from "./fleetAvailabilityApi";
import { FleetAssetMatrixItem } from "./types";
import { Isometric3DBarGrid } from "./Isometric3DBarGrid";

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

export interface EnrichedAsset {
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

export const CALENDAR_WEEKS = [
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
  const { themeColor } = useBrand();
  const { triggerGuidance } = useVolviAssist();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedHub, setSelectedHub] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [selectedAsset, setSelectedAsset] = useState<EnrichedAsset>(DEFAULT_ENRICHED_ASSETS[0]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isGanttModalOpen, setIsGanttModalOpen] = useState<boolean>(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);
  const [isGantt3D, setIsGantt3D] = useState<boolean>(true);
  const [gantt3DAngle, setGantt3DAngle] = useState<"isometric" | "perspective" | "elevated">("isometric");
  const [ganttThemeMode, setGanttThemeMode] = useState<"dark-energia" | "light-slate">("light-slate");

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsGanttModalOpen(false);
        setIsDiagnosticsModalOpen(false);
        setIsBookingModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (isGanttModalOpen || isDiagnosticsModalOpen || isBookingModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isGanttModalOpen, isDiagnosticsModalOpen, isBookingModalOpen]);

  // New Booking form state
  const [searchParams] = useSearchParams();
  const autoReserve = searchParams.get("autoReserve") === "true";
  const urlDealId = searchParams.get("dealId") || "";
  const urlClient = searchParams.get("client") || "";
  const urlSite = searchParams.get("site") || "";
  const urlKva = parseInt(searchParams.get("kva") || "0", 10);
  const urlStartDate = searchParams.get("startDate") || "";
  const urlEndDate = searchParams.get("endDate") || "";

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultEndStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [bookingAssetId, setBookingAssetId] = useState<string>(DEFAULT_ENRICHED_ASSETS[0].id);
  const [bookingDealId, setBookingDealId] = useState<string>("");
  const [bookingStartDate, setBookingStartDate] = useState<string>(urlStartDate || todayStr);
  const [bookingEndDate, setBookingEndDate] = useState<string>(urlEndDate || defaultEndStr);
  const [bookingSiteLocation, setBookingSiteLocation] = useState<string>("Jubail Industrial City 2");
  const [bookingOperatorName, setBookingOperatorName] = useState<string>("Tariq Al-Mansoor");
  const [bookingNotes, setBookingNotes] = useState<string>("");

  // Auto-launch spot reservation modal when autoReserve is true (from executed contract)
  useEffect(() => {
    if (autoReserve) {
      if (urlDealId) setBookingDealId(urlDealId);
      if (urlSite) setBookingSiteLocation(decodeURIComponent(urlSite));
      if (urlStartDate) setBookingStartDate(urlStartDate);
      if (urlEndDate) setBookingEndDate(urlEndDate);

      // Pick asset matching the kVA from the contract; fall back to first 250, then first available
      const targetKva = urlKva || 250;
      const matchedUnit =
        DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === targetKva) ||
        DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === 250) ||
        DEFAULT_ENRICHED_ASSETS[0];
      if (matchedUnit) {
        setBookingAssetId(matchedUnit.id);
        setSelectedAsset(matchedUnit);
      }
      setIsBookingModalOpen(true);
    }
  }, [autoReserve, urlDealId, urlSite, urlKva, urlStartDate, urlEndDate]);

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

  // Fetch rental contracts to detect pending signature tasks
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["rentalContracts"],
    queryFn: () => rentalContractApi.getContracts("ALL", token),
    staleTime: 15000,
    enabled: !!token
  });

  // Automatically pre-populate spot reservation modal whenever it opens if not already linked
  useEffect(() => {
    if (isBookingModalOpen && !bookingDealId) {
      const activeWonContract = contracts
        .filter((c: any) => c.status === "ACTIVE" && c.deal?.status === "WON")
        .sort((a: any, b: any) => new Date(b.companySignedAt || b.updatedAt).getTime() - new Date(a.companySignedAt || a.updatedAt).getTime())[0];
      if (activeWonContract) {
        if (activeWonContract.dealId) setBookingDealId(activeWonContract.dealId);
        if (activeWonContract.siteLocation) setBookingSiteLocation(activeWonContract.siteLocation);
        if (activeWonContract.contractStartDate) setBookingStartDate(activeWonContract.contractStartDate.split("T")[0]);
        if (activeWonContract.contractEndDate) setBookingEndDate(activeWonContract.contractEndDate.split("T")[0]);
        const dealName = activeWonContract.deal?.name || activeWonContract.deal?.title || "";
        const kvaMatch = dealName.match(/(\d+)\s*kva/i);
        const kva = kvaMatch ? parseInt(kvaMatch[1], 10) : 250;
        const matchedUnit =
          DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === kva) ||
          DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === 250) ||
          DEFAULT_ENRICHED_ASSETS[0];
        if (matchedUnit) {
          setBookingAssetId(matchedUnit.id);
          setSelectedAsset(matchedUnit);
        }
      }
    }
  }, [isBookingModalOpen, contracts]);

  const handleDealChange = (dealId: string) => {
    setBookingDealId(dealId);
    if (!dealId) return;
    const matchedContract = contracts.find((c: any) => c.dealId === dealId);
    const matchedDeal = deals.find((d: any) => d.id === dealId);
    const dealName = matchedDeal?.name || matchedDeal?.title || "";

    if (matchedContract) {
      if (matchedContract.contractStartDate) setBookingStartDate(matchedContract.contractStartDate.split("T")[0]);
      if (matchedContract.contractEndDate) setBookingEndDate(matchedContract.contractEndDate.split("T")[0]);
      if (matchedContract.siteLocation) setBookingSiteLocation(matchedContract.siteLocation);
    }

    const kvaMatch = dealName.match(/(\d+)\s*kva/i);
    const kva = kvaMatch ? parseInt(kvaMatch[1], 10) : 250;
    const matchedUnit =
      DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === kva) ||
      DEFAULT_ENRICHED_ASSETS.find((a) => a.ratingKva === 250) ||
      DEFAULT_ENRICHED_ASSETS[0];
    if (matchedUnit) {
      setBookingAssetId(matchedUnit.id);
      setSelectedAsset(matchedUnit);
    }
  };

  // Approved Site Inspections awaiting CPQ quote
  const { data: approvedSurveys = [] } = useQuery({
    queryKey: ["site-inspections-approved-desk"],
    queryFn: () => siteInspectionApi.listInspections({ status: "APPROVED" }),
    staleTime: 15000,
  });

  const [isApprovedBannerDismissed, setIsApprovedBannerDismissed] = useState(false);

  // Proactive Volvi Assist Step Guidance
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Highest priority on THIS page: ACTIVE contracts with WON deals → Step 7 Fleet Dispatch
      const wonActiveContracts = contracts
        .filter((c: any) => c.status === "ACTIVE" && c.deal?.status === "WON")
        .sort((a: any, b: any) => new Date(b.companySignedAt || b.updatedAt).getTime() - new Date(a.companySignedAt || a.updatedAt).getTime());
      const wonContract = wonActiveContracts[0];
      if (wonContract) {
        const wonName = wonContract.deal?.name || wonContract.deal?.title || "Active Deal";
        const wonKvaMatch = wonName.match(/(\d+)\s*kva/i);
        const wonKva = wonKvaMatch ? parseInt(wonKvaMatch[1], 10) : 250;
        const wonSite = wonContract.siteLocation || "Operational Site";
        triggerGuidance({
          stepNumber: 7,
          stageName: "Step 7 of 8 • Fleet Yard & Dispatch",
          message: `Dispatch Generator for ${wonName}`,
          explanation: `${wonName} is fully executed. Reserve the ${wonKva} kVA unit and release for site delivery to ${wonSite}.`,
          recommendedAction: "Click '+ Create Spot Reservation' and lock unit",
          actionLabel: "Create Spot Reservation (Step 7)",
          onAction: () => setIsBookingModalOpen(true),
          technicalTip: "Asset mobilisation triggers telematics pairing, GPS geofencing, and automated daily engine runtime logs."
        });
        return;
      }

      // 2. Pending contract signatures (secondary — go to contracts page to action)
      const pendingContract = contracts.find(
        (c: any) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "AWAITING_COMPANY_SIGNATURE"
      );
      if (pendingContract) {
        const clientName = pendingContract.deal?.name || pendingContract.account?.name || "saud (250 kVA)";
        const isCompany = pendingContract.status === "AWAITING_COMPANY_SIGNATURE";
        triggerGuidance({
          stepNumber: 6,
          stageName: isCompany ? "Step 6 Active • Executive Countersignature" : "Step 6 Active • Record Client Signature",
          message: isCompany
            ? `Countersign Contract (${pendingContract.contractNumber})`
            : `Client Signature Required (${pendingContract.contractNumber})`,
          explanation: isCompany
            ? `Client signature recorded for ${clientName}. Apply Energia Regional Director countersignature to activate the agreement and commit the deal to Won.`
            : `Contract generated for ${clientName}. Click to open contracts and record authorized client digital signoff.`,
          recommendedAction: isCompany ? "Apply Executive Countersignature" : "Record Client Digital Signature",
          actionLabel: isCompany ? "Countersign Contract (Step 6) ➔" : "Sign Contract (Step 6) ➔",
          actionPath: `/rental-contracts?tab=${isCompany ? "AWAITING_COMPANY_SIGNATURE" : "AWAITING_CLIENT_SIGNATURE"}`,
          technicalTip: "Director countersignature releases generator reservation and unlocks yard dispatch."
        });
        return;
      }

      // 2. Approved site surveys that DO NOT already have a contract or quote created
      const unquotedSurvey = approvedSurveys.find((s: any) => {
        if (contracts.some((c: any) => c.dealId === s.dealId || (s.leadId && c.deal?.leadId === s.leadId))) {
          return false;
        }
        return true;
      });

      if (unquotedSurvey) {
        const s = unquotedSurvey;
        const clientOrg = (s.clientOrganization || "").replace(/&amp;/g, "&").trim() || "Al-Bawani Contracting Ltd";
        const siteName = (s.siteName || "").replace(/&amp;/g, "&").trim() || "NEOM Concrete Batching Plant";
        const kvaVal = (s as any).recommendedKva || (s as any).generatorKvaRating || 250;
        triggerGuidance({
          stepNumber: 3,
          stageName: "Step 3 • Commercial Quoting (CPQ)",
          message: `Action Required: 1 Site Survey Approved (${clientOrg})`,
          explanation: `Technical sizing & BOQ verified for ${siteName} (${kvaVal} kVA). Ready to generate commercial proposal in Step 4 CPQ.`,
          recommendedAction: "1-Click Auto-Populate Commercial CPQ Quote",
          actionLabel: "Generate Rental Quote in CPQ (Step 4) ➔",
          actionPath: `/rental-cpq/builder?leadId=${s.leadId}&dealId=${s.dealId || ""}&kVA=${kvaVal}&cables=60&fuelTank=2500&site=${encodeURIComponent(siteName)}&fromSurvey=true`,
          technicalTip: "Rental CPQ locks certified survey BoQ specifications and applies standard KSA 20x monthly multiplier.",
          suggestedPrompt: `Quote ${kvaVal} kVA generator with 60m cable package for ${clientOrg}`
        });
      } else {
        triggerGuidance({
          stepNumber: 7,
          stageName: "Step 7 Active • Fleet Operations & Dispatch",
          message: "Fleet Availability Desk Active",
          explanation: "342 units deployed across Riyadh, Jubail, and Dammam. Anti-double-booking clash guard active for all serial reservations.",
          recommendedAction: "Inspect Regional Fleet Allocation Matrix",
          actionLabel: "Open 12-Week Gantt Timeline ➔",
          onAction: () => setIsGanttModalOpen(true),
          technicalTip: "SEC Standard: Inrush multiplier 3.0x requires 250 kVA Prime generator with 25% safety reserve headroom.",
          suggestedPrompt: "Check fleet availability for 500 kVA units in Jubail hub"
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [contracts, approvedSurveys?.length]);

  // Step 7 Gate Pass & Dispatch Celebration Modal State
  const [bookingSuccessModal, setBookingSuccessModal] = useState<{
    assetCode: string;
    assetName: string;
    hub: string;
    kvaRating: number;
    startDate: string;
    endDate: string;
    siteLocation?: string;
  } | null>(null);

  // Booking Mutation with backend anti-double-booking algorithm
  const createBookingMutation = useMutation({
    mutationFn: (payload: any) => fleetAvailabilityApi.createBooking(payload, token),
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["fleetAvailabilityMatrix"] });
      setIsBookingModalOpen(false);
      const bookedAsset = DEFAULT_ENRICHED_ASSETS.find((a: any) => a.id === variables.assetId) || selectedAsset;
      setBookingSuccessModal({
        assetCode: bookedAsset?.code || "GEN-CAT-500-04",
        assetName: bookedAsset?.model || "500 kVA Grid-Spec Generator",
        hub: bookedAsset?.hub || "Jubail Operations Base",
        kvaRating: bookedAsset?.ratingKva || 500,
        startDate: variables.startDate,
        endDate: variables.endDate,
        siteLocation: variables.siteLocation
      });
      triggerGuidance({
        stepNumber: 8,
        stageName: "Lifecycle Complete • Asset Mobilized & Dispatched",
        message: `Generator Dispatched (${bookedAsset?.code || "GEN-250"})`,
        explanation: `Unit ${bookedAsset?.code} reserved for ${urlClient || "saud - 250 kVA"}. SCADA telemetry node active and Gate Pass authorized for mobilization to ${variables.siteLocation || "Jubail"}.`,
        recommendedAction: "Review Governance & Approvals Dashboard",
        actionLabel: "View Approvals Queue (Step 8) ➔",
        actionPath: "/approvals",
        technicalTip: "Gate Pass security barcode generated. SCADA IoT stream monitoring fuel level, RPM, and engine temperature."
      });
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
    <div className={`w-full min-h-screen ${
      themeColor === "sky"
        ? "bg-gradient-to-b from-[#F0F7FC] via-[#F5FAFE] to-[#EBF4FA] text-slate-900"
        : "bg-gradient-to-b from-[#FDF1F4] via-[#FFF9FA] to-[#F5F6FA] text-[#0B1C30]"
    } dark:bg-[#0B0F17] dark:text-slate-100 p-3 lg:p-5 space-y-3.5 font-sans relative overflow-hidden`}>
      {/* Ambient Top Glow */}
      <div className={`absolute top-0 right-10 w-[550px] h-[320px] rounded-full blur-3xl pointer-events-none -z-0 ${
        themeColor === "sky"
          ? "bg-gradient-to-b from-[#7BBDE8]/25 via-[#7BBDE8]/8 to-transparent"
          : "bg-gradient-to-b from-[#ED1A53]/15 via-[#ED1A53]/5 to-transparent"
      }`} />
      <div className={`absolute top-4 left-1/4 w-[380px] h-[220px] rounded-full blur-2xl pointer-events-none -z-0 ${
        themeColor === "sky"
          ? "bg-[#7BBDE8]/15"
          : "bg-[#ED1A53]/8"
      }`} />

      {/* 1. TOP HEADER & OPERATIONAL GREETING */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest font-extrabold border shadow-2xs ${
              themeColor === "sky"
                ? "bg-sky-100/90 text-[#0E355C] border-sky-300/60 dark:text-sky-300"
                : "bg-rose-100/80 text-[#ED1A53] dark:text-rose-400 border-[#ED1A53]/25"
            }`}>
              Fleet Core V3.8
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs">• Live Synced 12s ago</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              KSA Telemetry Stream Active (Riyadh • Jubail • Dammam)
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Good Morning, Sophia
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer hover:text-slate-800">
            <span>Regional Fleet Operations & Telemetry Overview</span>
            <ChevronRight className="w-3 h-3 rotate-90" />
          </p>
        </div>

        {/* Quick Actions & Launchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsGanttModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              themeColor === "sky"
                ? "border-sky-200 hover:border-sky-300 shadow-[0_2px_8px_rgba(123,189,232,0.12)]"
                : "border-[#ED1A53]/25 shadow-[0_2px_8px_rgba(237,26,83,0.04)]"
            }`}
            title="Open Master 12-Week Rolling Gantt Matrix"
          >
            <Maximize2 className={`w-3.5 h-3.5 ${themeColor === "sky" ? "text-[#144A7E]" : "text-[#ED1A53]"}`} />
            <span>Open Multi-Hub Gantt</span>
          </button>
          <button
            onClick={() => alert("Dispatch manifest exported for transport & logistics teams.")}
            className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Sheet</span>
          </button>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 ${
              themeColor === "sky"
                ? "bg-gradient-to-r from-[#144A7E] via-[#0E355C] to-[#0A2744] hover:from-[#185591] hover:to-[#0D3054] shadow-[#0E355C]/35 border border-white/20"
                : "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#d81248] hover:to-[#960a2d] shadow-[#ED1A53]/25"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Spot Reservation</span>
          </button>
        </div>
      </section>

      {/* 2. ZONE 1: BENTO KPI CARDS (HIGH-DENSITY ONE-GLANCE EXECUTIVE PERFORMANCE) */}
      <section className="relative z-10">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              themeColor === "sky" ? "bg-[#144A7E]" : "bg-[#ED1A53]"
            }`} />
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300">
              Commercial & Fleet Health • Executive North-Star KPIs
            </span>
          </div>
          <span
            onClick={() => navigate("/rental-contracts")}
            className={`text-[11px] font-bold cursor-pointer hover:underline ${
              themeColor === "sky" ? "text-[#144A7E]" : "text-[#ED1A53]"
            }`}
          >
            380 Active Asset Manifest ▾
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Contract Revenue (MRR Run-rate) -> Navigates to /rental-contracts */}
          <div
            onClick={() => navigate("/rental-contracts")}
            className="group cursor-pointer p-4 rounded-[20px] bg-[#FCFAF7] dark:bg-slate-900 border-2 border-[#E7DDD0] dark:border-[#5C4528]/40 hover:border-[#B58D4B] shadow-[0_4px_20px_rgba(181,141,75,0.06)] hover:shadow-[0_8px_28px_rgba(181,141,75,0.14)] transition-all flex flex-col justify-between"
            title="Click to manage all Active Hire Agreements & Revenue Run-rate in Rental Contracts Desk"
          >
            <div>
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E5D8] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F5ECE0] dark:bg-[#3D2C17] border border-[#DFCDB7] flex items-center justify-center text-[#8C6228] dark:text-[#E0B571] shadow-2xs">
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Contract Revenue
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Monthly Run-rate (MRR)</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5ECE0] dark:bg-[#3D2C17] text-[#78511E] dark:text-[#E0B571] text-[10px] font-black border border-[#DFCDB7]">
                  ▲ +10.4%
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2.5">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  SAR 24.85M <span className="text-xs font-bold text-[#8C6228] dark:text-[#E0B571]">/ mo</span>
                </div>
              </div>

              {/* Regional Revenue Breakdown Chips */}
              <div className="pt-2 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>Riyadh: <b className="text-[#4A3722] dark:text-slate-200 font-bold">9.8M</b></span>
                <span>Jubail: <b className="text-[#4A3722] dark:text-slate-200 font-bold">8.4M</b></span>
                <span>Dammam: <b className="text-[#4A3722] dark:text-slate-200 font-bold">6.6M</b></span>
              </div>
            </div>

            <p className="text-[10px] text-[#8C6228] dark:text-[#E0B571] font-bold mt-2 pt-1.5 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between group-hover:underline">
              <span>View Active Contracts & SLAs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 2: Fleet Financial Yield -> Navigates to /rental-cpq/builder */}
          <div
            onClick={() => navigate("/rental-cpq/builder")}
            className="group cursor-pointer p-4 rounded-[20px] bg-[#FCFAF7] dark:bg-slate-900 border-2 border-[#E7DDD0] dark:border-[#5C4528]/40 hover:border-[#B58D4B] shadow-[0_4px_20px_rgba(181,141,75,0.06)] hover:shadow-[0_8px_28px_rgba(181,141,75,0.14)] transition-all flex flex-col justify-between"
            title="Click to open Rental CPQ Builder & Rate Optimisation"
          >
            <div>
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E5D8] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F5ECE0] dark:bg-[#3D2C17] border border-[#DFCDB7] flex items-center justify-center text-[#8C6228] dark:text-[#E0B571] shadow-2xs">
                    <Activity className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Fleet Yield
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Power Monetisation</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5ECE0] dark:bg-[#3D2C17] text-[#78511E] dark:text-[#E0B571] text-[10px] font-black border border-[#DFCDB7]">
                  68.4% Yield
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2.5">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  SAR 72.50 <span className="text-xs font-bold text-[#8C6228] dark:text-[#E0B571]">/ kVA / mo</span>
                </div>
              </div>

              {/* kVA Yield & Power Deployment */}
              <div className="pt-2 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>Dispatched: <b className="text-[#4A3722] dark:text-slate-200 font-bold">342 (90%)</b></span>
                <span>Live Grid: <b className="text-[#4A3722] dark:text-slate-200 font-bold">142.8 MW</b></span>
              </div>
            </div>

            <p className="text-[10px] text-[#8C6228] dark:text-[#E0B571] font-bold mt-2 pt-1.5 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between group-hover:underline">
              <span>Open Rental CPQ Builder</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 3: Cycle Win Velocity -> Navigates to /pipeline */}
          <div
            onClick={() => navigate("/pipeline")}
            className="group cursor-pointer p-4 rounded-[20px] bg-[#FCFAF7] dark:bg-slate-900 border-2 border-[#E7DDD0] dark:border-[#5C4528]/40 hover:border-[#B58D4B] shadow-[0_4px_20px_rgba(181,141,75,0.06)] hover:shadow-[0_8px_28px_rgba(181,141,75,0.14)] transition-all flex flex-col justify-between"
            title="Click to view Commercial Pipeline velocity and open opportunities"
          >
            <div>
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E5D8] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F5ECE0] dark:bg-[#3D2C17] border border-[#DFCDB7] flex items-center justify-center text-[#8C6228] dark:text-[#E0B571] shadow-2xs">
                    <Target className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Win Velocity
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Deal Conversion SLA</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5ECE0] dark:bg-[#3D2C17] text-[#78511E] dark:text-[#E0B571] text-[10px] font-black border border-[#DFCDB7]">
                  18.4h SLA
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2.5">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  64.8% <span className="text-xs font-bold text-[#8C6228] dark:text-[#E0B571]">Win Rate</span>
                </div>
              </div>

              {/* Turnaround & Pipeline Depth */}
              <div className="pt-2 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>Pipeline: <b className="text-[#4A3722] dark:text-slate-200 font-bold">SAR 14.2M</b></span>
                <span>Open: <b className="text-[#4A3722] dark:text-slate-200 font-bold">18 Deals (0 Errors)</b></span>
              </div>
            </div>

            <p className="text-[10px] text-[#8C6228] dark:text-[#E0B571] font-bold mt-2 pt-1.5 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between group-hover:underline">
              <span>Inspect Commercial Pipeline</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 4: Cash & Credit Health -> Navigates to /credit-kyc */}
          <div
            onClick={() => navigate("/credit-kyc")}
            className="group cursor-pointer p-4 rounded-[20px] bg-[#FCFAF7] dark:bg-slate-900 border-2 border-[#E7DDD0] dark:border-[#5C4528]/40 hover:border-[#B58D4B] shadow-[0_4px_20px_rgba(181,141,75,0.06)] hover:shadow-[0_8px_28px_rgba(181,141,75,0.14)] transition-all flex flex-col justify-between"
            title="Click to view Cash Protection, Advance Guarantees & KYC Underwriting"
          >
            <div>
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E5D8] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F5ECE0] dark:bg-[#3D2C17] border border-[#DFCDB7] flex items-center justify-center text-[#8C6228] dark:text-[#E0B571] shadow-2xs">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Cash & Credit
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Security & Risk Guard</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5ECE0] dark:bg-[#3D2C17] text-[#78511E] dark:text-[#E0B571] text-[10px] font-black border border-[#DFCDB7]">
                  0.0% Bad Debt
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2.5">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  SAR 4.82M <span className="text-xs font-bold text-[#8C6228] dark:text-[#E0B571]">Advance</span>
                </div>
              </div>

              {/* Working Capital & Advance Compliance */}
              <div className="pt-2 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>DSO: <b className="text-[#4A3722] dark:text-slate-200 font-bold">32 Days</b></span>
                <span>Security: <b className="text-[#4A3722] dark:text-slate-200 font-bold">100% Locked</b></span>
              </div>
            </div>

            <p className="text-[10px] text-[#8C6228] dark:text-[#E0B571] font-bold mt-2 pt-1.5 border-t border-[#F0E5D8] dark:border-slate-800 flex items-center justify-between group-hover:underline">
              <span>Open Credit & KYC Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>
      </section>

      {/* 3. ZONE 2: PERFORMANCE SHOWCASE GRID (MAROON & BENTO ACCENTS) */}
      <section className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* A. Left Speedometer Card (lg:col-span-4) */}
          <div
            onClick={() => setIsDiagnosticsModalOpen(true)}
            className={`lg:col-span-4 rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:scale-[1.01] transition-transform ${
              themeColor === "sky"
                ? "bg-gradient-to-b from-[#7BBDE8] via-[#65AEE4] to-[#4F9FDA] text-slate-900 shadow-[0_16px_36px_-8px_rgba(123,189,232,0.35)] border border-sky-300/50"
                : "bg-gradient-to-b from-[#2B081B] via-[#200614] to-[#15030D] text-white shadow-[0_25px_80px_rgba(20,2,12,0.95),0_0_50px_rgba(237,26,83,0.18)] border border-[#ED1A53]/35"
            }`}
          >
            {/* Ambient Background Warm Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/20 rounded-full blur-3xl pointer-events-none" />

            <div className={`flex items-center justify-between relative z-10 pb-2 border-b ${
              themeColor === "sky" ? "border-sky-300/40" : "border-white/10"
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-pulse shadow-sm shadow-amber-300/50" />
                <div>
                  <span className={`text-xs sm:text-[13px] font-black tracking-wider uppercase block leading-tight ${
                    themeColor === "sky" ? "text-sky-950" : "text-white"
                  }`}>
                    Active Fleet Performance
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    themeColor === "sky" ? "text-sky-950/75" : "text-slate-300"
                  }`}>Real-time Load Balancing</span>
                </div>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                themeColor === "sky"
                  ? "bg-white/30 text-sky-950 group-hover:bg-white/40"
                  : "bg-white/10 text-white group-hover:bg-white/20"
              }`}>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Semicircle Speedometer Radial Gauge */}
            <div className="relative my-2 flex flex-col items-center justify-center">
              <div className="relative w-44 h-24 flex items-center justify-center">
                <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="62"
                    fill="transparent"
                    stroke={themeColor === "sky" ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.15)"}
                    strokeWidth="13"
                    strokeDasharray="390"
                    strokeDashoffset="195"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="62"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="13"
                    strokeDasharray="390"
                    strokeDashoffset="220"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute bottom-1 flex flex-col items-center">
                  <span className={`text-2xl font-black tracking-tight ${
                    themeColor === "sky" ? "text-sky-950" : "text-white"
                  }`}>90%</span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest ${
                    themeColor === "sky" ? "text-sky-950/80" : "text-slate-400"
                  }`}>
                    Load Factor
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Financial & Asset Stat -> Navigates to /invoices */}
            <div className={`relative z-10 border-t pt-3 ${
              themeColor === "sky" ? "border-sky-300/40" : "border-white/10"
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                themeColor === "sky" ? "text-sky-950/80" : "text-slate-400"
              }`}>
                Total Active Contract Valuation
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/invoices");
                }}
                className={`text-2xl font-black tracking-tight mt-0.5 transition ${
                  themeColor === "sky" ? "text-sky-950 hover:text-white" : "text-white hover:text-amber-400"
                }`}
                title="Open Invoices & Billing Desk"
              >
                SAR 24,850,000
              </div>
              <div className={`flex items-center justify-between text-[10px] mt-1 ${
                themeColor === "sky" ? "text-sky-950/80" : "text-slate-400"
              }`}>
                <span>342 Units Dispatched • GPS Sat: Locked</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDiagnosticsModalOpen(true);
                  }}
                  className={`${
                    themeColor === "sky" ? "text-amber-800" : "text-amber-400"
                  } font-extrabold group-hover:underline`}
                >
                  Deep Diagnostics ↗
                </span>
              </div>
            </div>
          </div>

          {/* B. Middle Stacked White Cards (lg:col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Top Stacked Card: Dispatched Power Peak */}
            <div
              onClick={() => setIsDiagnosticsModalOpen(true)}
              className={`flex-1 p-4 rounded-[20px] bg-white dark:bg-slate-900 border-2 flex flex-col justify-between cursor-pointer transition ${
                themeColor === "sky"
                  ? "border-sky-200 dark:border-sky-950/60 hover:border-sky-400 shadow-[0_6px_20px_rgba(123,189,232,0.1)] hover:shadow-[0_10px_28px_rgba(123,189,232,0.2)]"
                  : "border-rose-200 dark:border-rose-950/60 hover:border-[#ED1A53] shadow-[0_6px_20px_rgba(237,26,83,0.06)] hover:shadow-[0_10px_28px_rgba(237,26,83,0.15)]"
              }`}
              title="Inspect Real-time Load Factor & Electrical Telemetry"
            >
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
                    themeColor === "sky"
                      ? "bg-sky-50 dark:bg-sky-950/50 border-sky-200/60 text-[#144A7E]"
                      : "bg-rose-50 dark:bg-rose-950/50 border-rose-200/60 text-[#ED1A53]"
                  }`}>
                    <Zap className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Dispatched Power
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Live Grid Generation</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#F5ECE0] dark:bg-[#3D2C17] text-[#78511E] dark:text-[#E0B571] text-[10px] font-black border border-[#DFCDB7]">
                  +5% Target
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  142.8 <span className="text-xs font-bold text-slate-400">MW</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Peak: <b className="text-slate-700 dark:text-slate-300">158 MW</b></span>
                  <span className={`font-bold ${themeColor === "sky" ? "text-[#144A7E]" : "text-[#ED1A53]"}`}>50.0 Hz Stable</span>
                </div>
              </div>
            </div>

            {/* Bottom Stacked Card: Yard Readiness & PM Overhaul (Industrial Reserve Desk) */}
            <div
              onClick={() => navigate("/assets")}
              className="flex-1 p-4 rounded-[20px] bg-white dark:bg-slate-900 border-2 border-[#D6DFD6] dark:border-[#2C4830]/40 hover:border-[#2C4830] shadow-[0_6px_20px_rgba(44,82,52,0.05)] hover:shadow-[0_10px_28px_rgba(44,82,52,0.12)] flex flex-col justify-between cursor-pointer transition"
              title="Inspect 38 Standby Units: 26 Dispatch-Ready in Yard vs 12 in 250h PM Service"
            >
              {/* Distinct High-Contrast Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Wrench className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                      Yard Readiness
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Standby & PM Overhaul</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-200">
                  26 Ready
                </span>
              </div>

              {/* Big Bold Metric */}
              <div className="my-2">
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-baseline gap-1.5">
                  <span>26</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Deployable</span>
                  <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">12</span>
                  <span className="text-xs font-bold text-slate-400">in Shop</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Mob SLA: <b className="text-slate-700 dark:text-slate-300">&lt;4 hrs</b></span>
                  <span className="text-emerald-600 font-bold">100% PM Compliant</span>
                </div>
              </div>
            </div>
          </div>

          {/* C. Right Rounded Bar Chart Card (lg:col-span-5) */}
          <div
            onClick={() => setIsGanttModalOpen(true)}
            className="lg:col-span-5 p-5 rounded-[24px] bg-white dark:bg-slate-900 border-2 border-[#D6DFD6] dark:border-[#2C4830]/40 hover:border-[#2C4830] shadow-[0_6px_20px_rgba(44,82,52,0.05)] hover:shadow-[0_10px_28px_rgba(44,82,52,0.12)] flex flex-col justify-between relative cursor-pointer transition"
            title="Open 12-Week Master Multi-Hub Gantt Timeline"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
                  themeColor === "sky"
                    ? "bg-sky-50 dark:bg-sky-950/50 border-sky-200/60 text-[#144A7E]"
                    : "bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 text-[#ED1A53]"
                }`}>
                  <BarChart3 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-[13px] uppercase tracking-wider">
                    Fleet Utilization Trend
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Monthly Average Dispatch Load • Q2 Off-Hire Horizon</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGanttModalOpen(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                  themeColor === "sky"
                    ? "bg-sky-50 hover:bg-[#144A7E] hover:text-white text-[#144A7E] border-sky-200/60"
                    : "bg-rose-50 hover:bg-[#ED1A53] hover:text-white text-[#ED1A53] dark:text-rose-300 border-rose-200/50"
                }`}
              >
                <span>Full Gantt</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Floating Tooltip Pill */}
            <div className="relative mt-4 mb-1">
              <div className={`absolute -top-6 left-[22%] -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded shadow-md flex items-center gap-1 z-10 pointer-events-none border ${
                themeColor === "sky"
                  ? "bg-[#7BBDE8] text-sky-950 border-sky-300"
                  : "bg-slate-900 text-white border-slate-700"
              }`}>
                <span>Mar 2026: 90% Peak</span>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 border-r border-b ${
                  themeColor === "sky"
                    ? "bg-[#7BBDE8] border-sky-300"
                    : "bg-slate-900 border-slate-700"
                }`} />
              </div>

              {/* 8 Modern Rounded Vertical Pillars */}
              <div className="h-32 flex items-end justify-between gap-2 pt-4 px-1">
                {[
                  { month: "Feb", height: "65%", active: false },
                  { month: "Mar", height: "92%", active: true },
                  { month: "Apr", height: "55%", active: false },
                  { month: "May", height: "88%", active: false },
                  { month: "Jun", height: "72%", active: false },
                  { month: "Jul", height: "85%", active: false },
                  { month: "Aug", height: "60%", active: false },
                  { month: "Sep", height: "78%", active: false }
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full h-full flex items-end">
                      <div
                        style={{ height: bar.height }}
                        className={`w-full rounded-full transition-all duration-300 group-hover:opacity-90 ${
                          bar.active
                            ? (themeColor === "sky"
                                ? "bg-gradient-to-t from-[#7BBDE8] via-[#5BA4DC] to-[#3B8BC8] shadow-md shadow-[#7BBDE8]/30"
                                : "bg-gradient-to-t from-[#ED1A53] via-[#D81248] to-[#45142B] shadow-md shadow-[#ED1A53]/30")
                            : (themeColor === "sky"
                                ? "bg-[#E1EFF8] hover:bg-[#D0E5F5] dark:bg-slate-800"
                                : "bg-rose-50 hover:bg-rose-100 dark:bg-slate-800")
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        bar.active 
                          ? (themeColor === "sky" ? "text-[#144A7E] font-black" : "text-[#ED1A53] font-black")
                          : "text-slate-400"
                      }`}
                    >
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Insight */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Peak: <b className="text-slate-700 dark:text-slate-200">March (90%)</b> • 14 Off-Hire Expirations (42 MVA) in Q2</span>
              <span className={`font-bold hover:underline flex items-center gap-0.5 ${
                themeColor === "sky" ? "text-[#144A7E] dark:text-sky-300" : "text-[#ED1A53] dark:text-rose-400"
              }`}>
                <span>12-Week Gantt</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ZONE 3: RECENT FLEET DISPATCH & TELEMETRY STREAM (ZERO-SCROLL DISPLAY) */}
      <section className="relative z-10">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm ${
              themeColor === "sky"
                ? "bg-sky-50 dark:bg-sky-950/50 border-sky-200/60 text-[#144A7E]"
                : "bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 text-[#ED1A53]"
            }`}>
              <Radio className={`w-4 h-4 stroke-[2.5] animate-pulse ${
                themeColor === "sky" ? "text-[#144A7E]" : "text-[#ED1A53]"
              }`} />
            </div>
            <div>
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                Live Fleet Dispatch & Telemetry Stream
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Real-time SCADA Field Nodes, Active Contract Values & Engine Diagnostics
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/rental-contracts")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
              themeColor === "sky"
                ? "bg-sky-50 hover:bg-[#144A7E] hover:text-white text-[#144A7E] border-sky-200/60"
                : "bg-rose-50 hover:bg-[#ED1A53] hover:text-white text-[#ED1A53] dark:text-rose-300 border border-rose-200/50"
            }`}
          >
            <span>View All Contracts</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="rounded-[20px] bg-white dark:bg-slate-900 border-2 border-[#D6DFD6] dark:border-[#2C4830]/40 shadow-[0_6px_20px_rgba(44,82,52,0.05)] overflow-hidden">
          {/* High-Contrast Table Column Headers */}
          <div className="py-2.5 px-4 sm:px-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div className="min-w-[260px] flex-1">Generator Node & Client Project</div>
            <div className="hidden lg:block w-52">Live SCADA Sensors (Fuel / Temp)</div>
            <div className="hidden md:flex items-center justify-between w-56 px-2">
              <span>Dispatch Time</span>
              <span>Monthly Contract</span>
            </div>
            <div className="w-44 text-right">Deployment Status & Diagnostics</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                asset: DEFAULT_ENRICHED_ASSETS[0],
                client: "Aramco Khurais PKG-4",
                date: "Today, 12:42 PM",
                val: "SAR 120,000",
                fuelPct: 82,
                tempC: 84,
                status: "On-Hire",
                badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              },
              {
                asset: DEFAULT_ENRICHED_ASSETS[1],
                client: "NEOM Oxagon Utilities",
                date: "14 Mar 2026",
                val: "SAR 85,000",
                fuelPct: 94,
                tempC: 81,
                status: "Mobilisation Ready",
                badgeColor: "bg-rose-50 text-[#ED1A53] border border-rose-200/80"
              },
              {
                asset: DEFAULT_ENRICHED_ASSETS[2],
                client: "SABIC Petrochem Shutdown",
                date: "12 Mar 2026",
                val: "SAR 250,000",
                fuelPct: 76,
                tempC: 88,
                status: "Heavy Grid On-Hire",
                badgeColor: "bg-amber-50 text-amber-800 border border-amber-200/80"
              },
              {
                asset: DEFAULT_ENRICHED_ASSETS[3],
                client: "Diriyah Gate VIP Event",
                date: "10 Mar 2026",
                val: "SAR 45,000",
                fuelPct: 98,
                tempC: 79,
                status: "Completed",
                badgeColor: "bg-slate-100 text-slate-700 border border-slate-200/80"
              }
            ].map((row, idx) => (
              <div
                key={idx}
                onClick={() => navigate("/rental-contracts")}
                className="py-3 px-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-rose-50/30 transition-colors cursor-pointer text-xs"
                title="View Contract in Rental Contracts Manager"
              >
                {/* Unit & Client */}
                <div className="flex items-center gap-3 min-w-[260px] flex-1">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 flex items-center justify-center font-bold text-xs text-[#ED1A53] shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{row.asset.code}</span>
                      <span className="text-slate-500 font-semibold">({row.client})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {row.asset.model} • <b className="text-slate-700 dark:text-slate-300">{row.asset.ratingKva} kVA</b> • Hub: {row.asset.hub}
                    </span>
                  </div>
                </div>

                {/* Inline Real-Time Telemetry Meters */}
                <div className="hidden lg:flex items-center gap-4 w-52">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60" title="Fuel Tank Level">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-black text-slate-800 dark:text-slate-200 font-mono text-[11px]">{row.fuelPct}%</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Fuel</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60" title="Operating Temperature">
                    <Thermometer className="w-3.5 h-3.5 text-[#ED1A53]" />
                    <span className="font-black text-slate-800 dark:text-slate-200 font-mono text-[11px]">{row.tempC}°C</span>
                    <span className="text-[9px] text-emerald-700 font-bold uppercase">OK</span>
                  </div>
                </div>

                {/* Financials & Date with Clear Sub-labels */}
                <div className="hidden md:flex items-center justify-between w-56 px-2 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Timestamp</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">{row.date}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Monthly Rate</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono">{row.val}</span>
                  </div>
                </div>

                {/* Status & Quick Telemetry Action */}
                <div className="flex items-center justify-end gap-2 w-44">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${row.badgeColor}`}>
                    {row.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(row.asset);
                      setIsDiagnosticsModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-[#ED1A53] hover:text-white text-[#ED1A53] text-[10px] font-black transition flex items-center gap-1 border border-rose-200/60 shadow-sm"
                    title="Inspect Unit Live Telemetry"
                  >
                    <span>Telemetry</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FULL-SCREEN POPUP MODAL: MULTI-HUB GANTT MATRIX & TELEMETRY DESK */}
      {isGanttModalOpen && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsGanttModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 lg:p-6 overflow-y-auto animate-fadeIn"
        >
          <div
            className={`border rounded-3xl max-w-7xl w-full p-4 sm:p-6 lg:p-7 space-y-5 max-h-[94vh] overflow-y-auto relative transition-all duration-300 ${
              ganttThemeMode === "dark-energia"
                ? "bg-gradient-to-b from-[#2B081B] via-[#200614] to-[#15030D] border-[#ED1A53]/35 shadow-[0_25px_80px_rgba(20,2,12,0.95),0_0_50px_rgba(237,26,83,0.18)] text-white"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                ganttThemeMode === "dark-energia"
                  ? "border-[#4D122F]/60"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white font-mono text-[10px] uppercase tracking-widest font-extrabold shadow-[0_0_12px_rgba(237,26,83,0.5)]">
                    Live Gantt Matrix
                  </span>
                  <span
                    className={`text-xs ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/70" : "text-slate-500"
                    }`}
                  >
                    12-Week Rolling Master Schedule
                  </span>
                  {isGantt3D && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <Box className="w-3 h-3 text-amber-400" />
                      3D ISOMETRIC ACTIVE
                    </span>
                  )}
                </div>
                <h2 className="text-xl lg:text-2xl font-black mt-1 tracking-tight">
                  Regional Fleet Allocation & Telemetry Schedule
                </h2>
              </div>

              {/* View & Theme Controls in Header */}
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {/* 2D / 3D Isometric View Mode Switcher */}
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl border ${
                    ganttThemeMode === "dark-energia"
                      ? "bg-[#18040F] border-[#521334]/80 shadow-inner"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <button
                    onClick={() => setIsGantt3D(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isGantt3D
                        ? "bg-[#ED1A53] text-white shadow-sm"
                        : ganttThemeMode === "dark-energia"
                        ? "text-rose-200/70 hover:text-white"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>2D Matrix</span>
                  </button>
                  <button
                    onClick={() => setIsGantt3D(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isGantt3D
                        ? "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white shadow-[0_0_14px_rgba(237,26,83,0.5)]"
                        : ganttThemeMode === "dark-energia"
                        ? "text-rose-200/70 hover:text-white"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Isometric</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-mono uppercase font-black">
                      3D
                    </span>
                  </button>
                </div>

                {/* Theme Mode Toggle — removed (3D view is always white) */}

                {/* Close Button */}
                <button
                  onClick={() => setIsGanttModalOpen(false)}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTROLS & FILTER SYSTEM */}
            <div
              className={`p-4 rounded-2xl border space-y-3.5 transition-colors ${
                ganttThemeMode === "dark-energia"
                  ? "bg-[#230616]/80 border-[#4D122F]/70 shadow-inner"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60"
              }`}
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Hub Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider mr-1 shrink-0 ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/70" : "text-slate-500"
                    }`}
                  >
                    Hubs:
                  </span>
                  {[
                    { id: "ALL", label: "All Hubs (380)" },
                    { id: "Riyadh", label: "Riyadh Central (142 Units)" },
                    { id: "Jubail", label: "Jubail Industrial (128 Units)" },
                    { id: "Dammam", label: "Dammam Port & Oilfield (110 Units)" }
                  ].map((hub) => (
                    <button
                      key={hub.id}
                      onClick={() => setSelectedHub(hub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedHub === hub.id
                          ? "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white shadow-[0_2px_12px_rgba(237,26,83,0.4)] border border-[#FF3D71]/40"
                          : ganttThemeMode === "dark-energia"
                          ? "bg-[#18040F] text-rose-200/80 hover:bg-[#380C23] hover:text-white border border-[#48102E]/70"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {hub.label}
                    </button>
                  ))}
                </div>

                {/* Time Navigation */}
                <div className="flex items-center gap-2 self-start xl:self-auto">
                  <div
                    className={`flex items-center border p-0.5 rounded-xl text-xs font-semibold ${
                      ganttThemeMode === "dark-energia"
                        ? "bg-[#18040F] border-[#48102E]/70"
                        : "bg-white dark:bg-slate-800 border-slate-200"
                    }`}
                  >
                    <button
                      className={`px-2.5 py-1 rounded-lg ${
                        ganttThemeMode === "dark-energia"
                          ? "text-rose-200/60 hover:text-white"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Days
                    </button>
                    <button className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white font-bold shadow-sm">
                      Weeks
                    </button>
                    <button
                      className={`px-2.5 py-1 rounded-lg ${
                        ganttThemeMode === "dark-energia"
                          ? "text-rose-200/60 hover:text-white"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Months
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                        ganttThemeMode === "dark-energia"
                          ? "bg-[#250818] border-[#48102E]/70 hover:bg-[#380C23] text-rose-200"
                          : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span
                      className={`px-3 py-1 rounded-xl border text-xs font-bold ${
                        ganttThemeMode === "dark-energia"
                          ? "bg-[#250818] border-[#48102E]/70 text-white"
                          : "bg-white border border-slate-200 text-slate-800"
                      }`}
                    >
                      Today (Mar 2026)
                    </span>
                    <button
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                        ganttThemeMode === "dark-energia"
                          ? "bg-[#250818] border-[#48102E]/70 hover:bg-[#380C23] text-rose-200"
                          : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rating Pills & Legend */}
              <div
                className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t ${
                  ganttThemeMode === "dark-energia"
                    ? "border-[#4D122F]/60"
                    : "border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider mr-1 ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/70" : "text-slate-500"
                    }`}
                  >
                    Rating:
                  </span>
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedRating === rating.id
                          ? "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white shadow-[0_2px_10px_rgba(237,26,83,0.3)] border border-[#FF3D71]/40"
                          : ganttThemeMode === "dark-energia"
                          ? "bg-[#18040F] border border-[#48102E]/70 text-rose-200/80 hover:bg-[#380C23] hover:text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>

                {/* Color Legend */}
                <div
                  className={`flex items-center gap-3.5 text-xs flex-wrap ${
                    ganttThemeMode === "dark-energia" ? "text-rose-200/80" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-gradient-to-r from-[#ED1A53] to-[#B00F38] shadow-[0_0_6px_rgba(237,26,83,0.6)]"></span>
                    <span>On-Hire / Contract</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                    <span>Mobilisation Ready</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-slate-500"></span>
                    <span>Overhaul / Service</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-amber-500 border border-amber-600 shadow-[0_0_6px_rgba(245,158,11,0.5)]"></span>
                    <span>Collision Locked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* VIEW DISPLAY: 3D ISOMETRIC BAR GRID OR 2D GANTT TIMELINE */}
            {isGantt3D ? (
              <div className="w-full rounded-2xl overflow-hidden" style={{ height: "520px" }}>
                <Isometric3DBarGrid
                  assets={filteredAssets}
                  selectedAsset={selectedAsset}
                  onSelectAsset={setSelectedAsset}
                  onReserveAsset={(asset) => {
                    setBookingAssetId(asset.id);
                    setIsBookingModalOpen(true);
                  }}
                  themeMode={ganttThemeMode}
                />
              </div>
            ) : (
              /* GANTT SCHEDULE CONTAINER (FIXED ASSET COL + 12-WEEK SCROLLABLE TIMELINE) */
              <div
                className={`rounded-2xl border shadow-lg overflow-hidden flex flex-col transition-all ${
                  ganttThemeMode === "dark-energia"
                    ? "bg-[#14030D] border-[#48102E]/70"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[1240px] flex flex-col">
                    {/* Header Row: Fixed Col Title + 12 Week Headers */}
                    <div
                      className={`flex items-stretch border-b select-none transition-colors ${
                        ganttThemeMode === "dark-energia"
                          ? "bg-[#1C0512] border-[#48102E]/70"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60"
                      }`}
                    >
                      <div
                        className={`w-[300px] shrink-0 p-3 flex items-center justify-between border-r ${
                          ganttThemeMode === "dark-energia"
                            ? "bg-[#240616] border-[#48102E]/70"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60"
                        }`}
                      >
                        <span
                          className={`text-xs uppercase tracking-wider font-bold ${
                            ganttThemeMode === "dark-energia" ? "text-rose-200" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Asset Manifest & Spec
                        </span>
                        <span
                          className={`text-[11px] font-mono ${
                            ganttThemeMode === "dark-energia" ? "text-rose-200/50" : "text-slate-400"
                          }`}
                        >
                          {filteredAssets.length} of 380 Units
                        </span>
                      </div>

                      <div
                        className={`flex-1 grid grid-cols-12 divide-x ${
                          ganttThemeMode === "dark-energia"
                            ? "divide-[#3B0B24]/50"
                            : "divide-slate-200 dark:divide-slate-700/50"
                        }`}
                      >
                        {CALENDAR_WEEKS.map((w) => (
                          <div
                            key={w.code}
                            className={`p-2 text-center transition-colors ${
                              w.isCurrent
                                ? ganttThemeMode === "dark-energia"
                                  ? "bg-[#ED1A53]/25 text-[#FF5A84] font-black border-x border-[#ED1A53]/50 shadow-[inset_0_0_12px_rgba(237,26,83,0.25)]"
                                  : "bg-[#45142B]/10 text-[#45142B] font-bold"
                                : ganttThemeMode === "dark-energia"
                                ? "text-rose-200/80"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span className="block text-xs font-bold">
                              {w.code} {w.tag && `(${w.tag})`}
                            </span>
                            <span
                              className={`block text-[10px] ${
                                ganttThemeMode === "dark-energia" ? "text-rose-200/50" : "text-slate-400"
                              }`}
                            >
                              {w.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Rows */}
                    <div
                      className={`divide-y ${
                        ganttThemeMode === "dark-energia"
                          ? "divide-[#360B21]/50"
                          : "divide-slate-100 dark:divide-slate-800"
                      }`}
                    >
                      {filteredAssets.map((asset) => {
                        const isSelected = selectedAsset.id === asset.id;
                        return (
                          <div
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className={`flex items-center min-h-[68px] transition-colors cursor-pointer group ${
                              isSelected
                                ? ganttThemeMode === "dark-energia"
                                  ? "bg-[#45142B]/45 border-l-4 border-l-[#ED1A53]"
                                  : "bg-[#45142B]/10 dark:bg-[#45142B]/20 border-l-4 border-l-[#45142B]"
                                : ganttThemeMode === "dark-energia"
                                ? "hover:bg-[#2A081B]/60"
                                : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Sticky Info Column */}
                            <div
                              className={`w-[300px] shrink-0 p-3 flex flex-col justify-center border-r transition-colors ${
                                ganttThemeMode === "dark-energia"
                                  ? "bg-[#18040F] border-[#48102E]/70"
                                  : "bg-inherit border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      asset.status === "ON-HIRE"
                                        ? "bg-[#ED1A53] animate-pulse shadow-[0_0_8px_rgba(237,26,83,0.8)]"
                                        : asset.status === "MOBILISATION READY"
                                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                                        : asset.status === "LOCK GUARD"
                                        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                                        : "bg-slate-400"
                                    }`}
                                  ></span>
                                  <span
                                    className={`font-black text-sm tracking-tight ${
                                      ganttThemeMode === "dark-energia"
                                        ? "text-white"
                                        : "text-slate-900 dark:text-white"
                                    }`}
                                  >
                                    {asset.code}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-2xs ${
                                    asset.status === "ON-HIRE"
                                      ? "bg-gradient-to-r from-[#ED1A53] to-[#B00F38] text-white shadow-[0_0_8px_rgba(237,26,83,0.4)]"
                                      : asset.status === "MOBILISATION READY"
                                      ? "bg-emerald-500 text-white"
                                      : asset.status === "LOCK GUARD"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                      : "bg-slate-700 text-slate-200"
                                  }`}
                                >
                                  {asset.status}
                                </span>
                              </div>
                              <div
                                className={`text-[11px] mt-1 truncate ${
                                  ganttThemeMode === "dark-energia"
                                    ? "text-rose-200/60"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {asset.model} • {asset.ratingKva} kVA • {asset.hub}
                              </div>
                            </div>

                            {/* Timeline Grid Slot Container */}
                            <div
                              className={`flex-1 grid grid-cols-12 h-full items-center relative py-2.5 px-1 divide-x ${
                                ganttThemeMode === "dark-energia"
                                  ? "divide-[#32081E]/40"
                                  : "divide-slate-100 dark:divide-slate-800/40"
                              }`}
                            >
                              {/* Current week highlight column */}
                              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                                <div
                                  className={`col-start-3 ${
                                    ganttThemeMode === "dark-energia"
                                      ? "bg-[#ED1A53]/10 border-x border-[#ED1A53]/25"
                                      : "bg-[#45142B]/5 border-x border-[#45142B]/20"
                                  }`}
                                ></div>
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
                                      className={`h-9 rounded-xl px-2.5 flex items-center justify-between text-xs font-semibold select-none transition-all duration-200 cursor-pointer hover:scale-[1.01] ${
                                        isClash
                                          ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white border-t border-amber-300 font-bold shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
                                          : isMobilisation
                                          ? "bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 border-t border-slate-500/30 shadow-sm"
                                          : isMaintenance
                                          ? "bg-gradient-to-r from-[#4A2411] to-[#36190B] text-amber-200 border-t border-amber-500/30 shadow-sm"
                                          : isAvailable
                                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-t border-emerald-300/30 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                                          : "bg-gradient-to-r from-[#ED1A53] via-[#DC1448] to-[#BA0E3C] text-white border-t border-white/30 shadow-[0_4px_14px_rgba(237,26,83,0.35)]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        {isClash && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-200" />}
                                        {!isClash && !isAvailable && <Zap className="w-3.5 h-3.5 shrink-0 text-rose-200" />}
                                        {isAvailable && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-200" />}
                                        <span className="truncate">{job.project}</span>
                                      </div>
                                      {job.badge && (
                                        <span
                                          className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ml-1.5 uppercase ${
                                            isClash
                                              ? "bg-amber-950 text-amber-200 border border-amber-400/50"
                                              : isAvailable
                                              ? "bg-emerald-950 text-emerald-200 border border-emerald-400/40"
                                              : "bg-white/20 text-white backdrop-blur-xs"
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
              </div>
            )}

            {/* LIVE TELEMETRY DESK FOR SELECTED ASSET */}
            <div
              className={`rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                ganttThemeMode === "dark-energia"
                  ? "bg-[#200514]/90 border-[#48102E]/70 shadow-inner"
                  : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b ${
                  ganttThemeMode === "dark-energia"
                    ? "border-[#4D122F]/60"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ED1A53] to-[#8F0B2D] text-white flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(237,26,83,0.45)]">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-lg font-black tracking-tight ${
                          ganttThemeMode === "dark-energia" ? "text-white" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {selectedAsset.code} • {selectedAsset.model}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ED1A53]/20 border border-[#ED1A53]/40 text-[#ED1A53] font-black text-xs">
                        {selectedAsset.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md border font-mono text-xs ${
                          ganttThemeMode === "dark-energia"
                            ? "bg-[#16030E] border-[#48102E]/70 text-rose-200/70"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        S/N #{selectedAsset.serialNumber}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-500"
                      }`}
                    >
                      {selectedAsset.ratingKva} kVA Standby • 400V 50Hz • Integrated Sound-Attenuated Enclosure • Hub: {selectedAsset.hub}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBookingAssetId(selectedAsset.id);
                      setIsBookingModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#FF2C67] hover:to-[#C71040] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-[0_4px_16px_rgba(237,26,83,0.4)] active:scale-95"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Reserve Unit</span>
                  </button>
                </div>
              </div>

              {/* Telemetry Meters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isGantt3D ? "transform-gpu hover:-translate-y-1 hover:shadow-lg" : ""
                  } ${
                    ganttThemeMode === "dark-energia"
                      ? "bg-[#15030D] border-[#3E0C27]/70 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <span
                    className={`text-[11px] uppercase font-bold ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-400"
                    }`}
                  >
                    Engine Hours
                  </span>
                  <div className="text-xl font-black my-1">
                    {selectedAsset.hours.toLocaleString()}{" "}
                    <span
                      className={`text-xs ${
                        ganttThemeMode === "dark-energia" ? "text-rose-200/50" : "text-slate-400"
                      }`}
                    >
                      hrs
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-500"
                    }`}
                  >
                    Service in: 129.6 hrs
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isGantt3D ? "transform-gpu hover:-translate-y-1 hover:shadow-lg" : ""
                  } ${
                    ganttThemeMode === "dark-energia"
                      ? "bg-[#15030D] border-[#3E0C27]/70 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <span
                    className={`text-[11px] uppercase font-bold ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-400"
                    }`}
                  >
                    Fuel Level
                  </span>
                  <div className="text-xl font-black text-emerald-400 my-1">
                    {selectedAsset.fuelPct}%{" "}
                    <span
                      className={`text-xs ${
                        ganttThemeMode === "dark-energia" ? "text-rose-200/50" : "text-slate-400"
                      }`}
                    >
                      ({selectedAsset.fuelLiters})
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-500"
                    }`}
                  >
                    Burn: {selectedAsset.burnRate}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isGantt3D ? "transform-gpu hover:-translate-y-1 hover:shadow-lg" : ""
                  } ${
                    ganttThemeMode === "dark-energia"
                      ? "bg-[#15030D] border-[#3E0C27]/70 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <span
                    className={`text-[11px] uppercase font-bold ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-400"
                    }`}
                  >
                    Thermal Health
                  </span>
                  <div className="text-xl font-black my-1 flex items-center">
                    {selectedAsset.tempC}°C{" "}
                    <span className="text-xs text-emerald-400 font-black ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                      OPTIMAL
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-500"
                    }`}
                  >
                    Pressure: {selectedAsset.oilBar} bar
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isGantt3D ? "transform-gpu hover:-translate-y-1 hover:shadow-lg" : ""
                  } ${
                    ganttThemeMode === "dark-energia"
                      ? "bg-[#15030D] border-[#3E0C27]/70 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <span
                    className={`text-[11px] uppercase font-bold ${
                      ganttThemeMode === "dark-energia" ? "text-rose-200/60" : "text-slate-400"
                    }`}
                  >
                    Electrical Output
                  </span>
                  <div className="text-xl font-black font-mono my-1 text-white">
                    {selectedAsset.voltage}
                  </div>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online (4G Sat Backup)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. TELEMETRY DIAGNOSTICS POPUP MODAL (MEANINGFUL SCADA & POWER PROFILE) */}
      {isDiagnosticsModalOpen && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDiagnosticsModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-5 lg:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7BBDE8] to-[#4F9FDA] text-sky-950 flex items-center justify-center shadow-md">
                  <Activity className="w-5 h-5 text-sky-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      Live Telemetry & Diagnostics Desk
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      Cat Connect® Live (140ms ping)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Real-time SCADA engine telemetry & 24h electrical load profiling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDiagnosticsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asset Identity & Active Deployment Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7BBDE8] via-[#65AEE4] to-[#4F9FDA] text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/40 text-[11px] font-mono font-bold text-sky-950">
                    {selectedAsset.code}
                  </span>
                  <span className="text-sm font-black text-sky-950">{selectedAsset.model}</span>
                  <span className="text-xs text-sky-900">• {selectedAsset.ratingKva} kVA Prime Power</span>
                </div>
                <div className="text-xs text-sky-900 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-900" />
                    Hub: <strong className="text-sky-950">{selectedAsset.hub}</strong>
                  </span>
                  <span>•</span>
                  <span>Active Project: <strong className="text-sky-950">Aramco Khurais PKG-4 (#ARM-9021)</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  {selectedAsset.status}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/40 text-sky-950 text-xs font-mono font-bold">
                  Day 42 / 180
                </span>
              </div>
            </div>

            {/* THE MEANINGFUL GRAPH: 24-HOUR POWER DEMAND VS SAFE OPERATING ENVELOPE */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      24-Hour Electrical Load Profile vs Safe Operating Envelope
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                      🟢 100% Nominal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    One-glance check: Keeps load between 60%–85% to maximize fuel efficiency and prevent wet stacking engine fouling.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400">Current Load Factor</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    415 kW <span className="text-xs font-normal text-slate-500">/ 500 kVA (83.0%)</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart with Safe Envelope Bands */}
              <div className="relative w-full h-48 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 800 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="telemetryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7BBDE8" stopOpacity="0.65" />
                      <stop offset="70%" stopColor="#7BBDE8" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#7BBDE8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Overload Danger Zone (>90% / >450 kW) */}
                  <rect x="0" y="0" width="800" height="24" fill="#FEE2E2" fillOpacity="0.35" />
                  <line x1="0" y1="24" x2="800" y2="24" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="790" y="18" textAnchor="end" fill="#DC2626" fontSize="10" fontWeight="bold">
                    Overload Trip Hazard (&gt;90% / 450 kW)
                  </text>

                  {/* OPTIMAL OPERATING GREEN ENVELOPE (60% to 85% / 300 to 425 kW) */}
                  <rect x="0" y="24" width="800" height="60" fill="#D1FAE5" fillOpacity="0.4" />
                  <line x1="0" y1="24" x2="800" y2="24" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="0" y1="84" x2="800" y2="84" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />
                  <text x="12" y="55" fill="#059669" fontSize="11" fontWeight="bold">
                    OPTIMAL ENVELOPE (60% – 85% Load • Max Fuel Economy & Zero Carboning)
                  </text>

                  {/* Wet Stacking Risk Zone (<30% / <150 kW) */}
                  <line x1="0" y1="128" x2="800" y2="128" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 4" />
                  <rect x="0" y="128" width="800" height="32" fill="#FEF3C7" fillOpacity="0.3" />
                  <text x="790" y="146" textAnchor="end" fill="#D97706" fontSize="10" fontWeight="bold">
                    Wet Stacking Engine Fouling Zone (&lt;30% / 150 kW)
                  </text>

                  {/* Actual 24-Hour Telemetry Curve (Stays comfortably inside the green envelope) */}
                  <path
                    d="M 0 68 
                       C 70 70, 100 66, 140 68 
                       C 180 70, 220 62, 280 50 
                       C 340 38, 400 32, 460 30 
                       C 520 28, 580 34, 640 44 
                       C 700 54, 750 40, 800 36 
                       L 800 160 L 0 160 Z"
                    fill="url(#telemetryGradient)"
                  />
                  <path
                    d="M 0 68 
                       C 70 70, 100 66, 140 68 
                       C 180 70, 220 62, 280 50 
                       C 340 38, 400 32, 460 30 
                       C 520 28, 580 34, 640 44 
                       C 700 54, 750 40, 800 36"
                    fill="none"
                    stroke="#ED1A53"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Current Real-time Telemetry Pulse Point (83% / 415 kW) */}
                  <circle cx="800" cy="36" r="6" fill="#ED1A53" />
                  <circle cx="800" cy="36" r="12" fill="#ED1A53" opacity="0.3" className="animate-ping" />
                </svg>
              </div>

              {/* One-Glance Graph Legend & Takeaways */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Optimal Green Zone:</strong> Generator ran 24h within 68%–85% load. Zero trip risk.</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span><strong>Zero Wet Stacking:</strong> Load never dropped below 30% threshold. Injectors clean.</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ED1A53] shrink-0" />
                  <span><strong>Headroom Margin:</strong> 17% reserve capacity remaining before 90% peak alert.</span>
                </div>
              </div>
            </div>

            {/* 4 HIGH-DENSITY CRITICAL SENSOR GAUGES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Gauge 1: Power & Electrical Load */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Active Power Load</span>
                  <Zap className="w-3.5 h-3.5 text-[#ED1A53]" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  415 <span className="text-xs font-normal text-slate-400">kW</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>PF: <strong>0.85</strong></span>
                  <span>Amps: <strong>598A</strong></span>
                  <span className="text-emerald-600 font-bold">83% Load</span>
                </div>
              </div>

              {/* Gauge 2: Fuel Autonomy & Tank Level */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Diesel Autonomy</span>
                  <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  16.0 <span className="text-xs font-normal text-slate-400">Hours Left</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Tank: <strong>82% (680L)</strong></span>
                  <span className="text-slate-400">Burn: <strong>42.5 L/h</strong></span>
                </div>
              </div>

              {/* Gauge 3: Engine Mechanics & Coolant */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Engine Mechanics</span>
                  <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  84°C <span className="text-xs font-normal text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Optimal</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Oil: <strong>4.2 bar</strong></span>
                  <span>Bat: <strong>26.4V</strong></span>
                  <span className="text-emerald-600 font-bold">0 Faults</span>
                </div>
              </div>

              {/* Gauge 4: Grid Frequency & Run Hours */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Frequency & Service</span>
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  50.02 <span className="text-xs font-normal text-slate-400">Hz</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>400V 3-Ph</span>
                  <span>Next Svc: <strong>118h</strong></span>
                  <span className="text-slate-400 font-mono">4,382h</span>
                </div>
              </div>
            </div>

            {/* ACTIONABLE LOGISTICS & FIELD OPS TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Refueling logistics scheduled: <strong>Tomorrow 06:00 AM (Fuel Tanker #FT-04)</strong></span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => alert(`Refuel dispatch requisition issued for ${selectedAsset.code} (Estimated delivery: 400L @ 06:00 AM).`)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dispatch Fuel Order</span>
                </button>
                <button
                  onClick={() => {
                    setIsDiagnosticsModalOpen(false);
                    navigate("/work-orders");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Work Orders Desk</span>
                </button>
                <button
                  onClick={() => {
                    setIsDiagnosticsModalOpen(false);
                    setIsGanttModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#7BBDE8] hover:bg-[#65AEE4] text-sky-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-900" />
                  <span>Master Gantt Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. SPOT RESERVATION MODAL (WITH ANTI-DOUBLE-BOOKING GUARD) */}
      {isBookingModalOpen && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBookingModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
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

            {(autoReserve || Boolean(bookingDealId)) && (
              <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-50 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-start gap-2 text-[11px] text-emerald-900 dark:text-emerald-200 shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="block font-black text-emerald-800 dark:text-emerald-300">
                    ⚡ Auto-Populated from Executed Rental Contract
                  </strong>
                  <span>{deals.find((d: any) => d.id === bookingDealId)?.name || urlClient || "saud - 250 kVA Prime Rental"} • {selectedAsset ? `${selectedAsset.ratingKva} kVA Package` : "250 kVA Package"} • Pre-Authorized for Dispatch</span>
                </div>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider">Select Equipment Asset</label>
                <select
                  value={bookingAssetId}
                  onChange={(e) => {
                    setBookingAssetId(e.target.value);
                    const asset = DEFAULT_ENRICHED_ASSETS.find(a => a.id === e.target.value);
                    if (asset) setSelectedAsset(asset);
                  }}
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
                  onChange={(e) => handleDealChange(e.target.value)}
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

              {/* Credit & Cash Gate-Pass Protection Guard */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  <strong>Credit & Cash Gate-Pass Guard:</strong> Automated policy check confirms that client has an approved Master Credit Line or confirmed 100% Advance Payment in Step 5 (Credit & KYC Desk). Unfunded equipment cannot be released from depot.
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
        </div>,
        document.body
      )}

      {/* Step 7 Gate Pass & Dispatch Celebration Modal */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    🚚 Equipment Reserved &amp; Gate Pass Authorized!
                  </h3>
                  <p className="text-[11px] text-slate-500">Physical Asset Locked • Ready for Yard Mobilization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccessModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Assigned Generator Asset:</span>
                <span className="font-mono font-black text-[#ED1A53] text-sm">
                  {bookingSuccessModal.assetCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Capacity &amp; Specification:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{bookingSuccessModal.assetName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Operations Depot Hub:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {bookingSuccessModal.hub}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Rental Mobilization Period:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {bookingSuccessModal.startDate} ➔ {bookingSuccessModal.endDate}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Gate Pass Security Status:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                  ✓ Collision Guard Clear • Dispatched
                </span>
              </div>
            </div>

            {/* Next Step Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-50/50 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block font-bold">Lifecycle Milestone Completed: Equipment Dispatched</strong>
                The physical generator unit is booked, fuel tank and power cables are assigned, and driver gate pass barcode is authorized.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Pass &amp; Driver Manifest</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingSuccessModal(null)}
                className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close &amp; Return to Fleet Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
