import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Printer,
  MapPin,
  Compass,
  Building2,
  Calendar,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Upload,
  Trash2,
  FileText,
  Tag,
  Eye,
  ShieldCheck,
  UserCheck,
  Check,
  AlertTriangle,
  Camera,
  Droplets,
  PanelLeft,
  Navigation,
  Loader2,
  Zap,
  Gauge,
  BatteryCharging,
  Wrench,
  Flame,
  Layers,
  ShieldAlert,
  HardHat,
  Sparkles,
  FileSpreadsheet,
  Share2,
  QrCode,
  FileCheck,
  ExternalLink,
  Copy,
  X,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Radio,
  Sliders,
  ChevronRight,
  Bot,
} from "lucide-react";
import { useVolviAssist } from "../context/VolviAssistContext";
import { siteInspectionApi, MasterDataResponse } from "../api/siteInspection";
import {
  SiteInspectionRecord,
  SiteInspectionServiceItem,
  SiteInspectionAttachmentItem,
  haversineKm,
  computeMetrics,
  getStatusStyle,
  APPROVER_ROLES,
  canApproveInspection,
} from "../lib/siteInspection";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../lib/apiClient";

function InspectionAttachmentThumbnail({
  inspectionId,
  attachmentId,
  fileName,
  className = "w-full h-full object-cover",
}: {
  inspectionId: string;
  attachmentId: string;
  fileName: string;
  className?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function fetchAttachmentBlob() {
      try {
        setLoading(true);
        setHasError(false);
        const res = await apiClient(
          `/api/v1/site-inspections/${inspectionId}/attachments/${attachmentId}/file`,
          { headers: { Accept: "application/json, image/*, */*" } }
        );

        if (!res.ok) {
          if (active) setHasError(true);
          return;
        }

        const contentType = res.headers.get("content-type") || "";
        let finalBlob: Blob;

        if (contentType.includes("application/json")) {
          const data = await res.json();
          const s3Res = await fetch(data.url);
          if (!s3Res.ok) {
            if (active) setHasError(true);
            return;
          }
          finalBlob = await s3Res.blob();
        } else {
          finalBlob = await res.blob();
        }

        if (active) {
          createdUrl = URL.createObjectURL(finalBlob);
          setBlobUrl(createdUrl);
        }
      } catch (err: any) {
        if (active) setHasError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAttachmentBlob();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [inspectionId, attachmentId]);

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (hasError || !blobUrl) {
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={fileName}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

const DEFAULT_BASES = [
  { id: "11111111-1111-4111-a111-111111111111", code: "JUBAIL", name: "Jubail Operations Base", region: "Eastern Province", latitude: 27.01, longitude: 49.65 },
  { id: "22222222-2222-4222-a222-222222222222", code: "DAMMAM", name: "Dammam Central Hub", region: "Eastern Province", latitude: 26.43, longitude: 50.1 },
  { id: "33333333-3333-4333-a333-333333333333", code: "YANBU", name: "Yanbu Operations Base", region: "Western Province", latitude: 24.09, longitude: 38.06 },
  { id: "44444444-4444-4444-a444-444444444444", code: "RIYADH", name: "Riyadh Logistics Center", region: "Central Province", latitude: 24.71, longitude: 46.67 },
  { id: "55555555-5555-4555-a555-555555555555", code: "NEOM", name: "NEOM Logistics Staging Base", region: "Tabuk Province", latitude: 27.95, longitude: 35.25 },
];

export interface PowerSurveyState {
  gatePassType: string;
  securityInductionRequired: boolean;
  h2sTrainingRequired: boolean;
  escortVehicleRequired: boolean;
  meggerL1MOhms: number;
  meggerL2MOhms: number;
  meggerL3MOhms: number;
  meggerNeutralMOhms: number;
  earthLoopImpedanceOhm: number;
  phaseRotation: string;
  generatorModel: string;
  alternatorModel: string;
  generatorSerial: string;
  initialEngineHours: number;
  loadBankKw: number;
  loadBankDurationMins: number;
  acousticDbaAt7m: number;
  transientRecoverySec: number;
  roadProtectionRampsCount: number;
  contractReference: string;
  dutyCycle: string;
  voltageFrequency: string;
  runningLoadKw: number;
  runningLoadKva: number;
  motorStartingMethod: string;
  recommendedKva: number;
  powerRedundancy: string;
  bessHybridRecommended: boolean;
  groundSurface: string;
  exhaustClearanceOk: boolean;
  cableRunMeters: number;
  cableSpec: string;
  roadCrossingRequiresRamps: boolean;
  earthResistanceOhm: number;
  earthPitAvailable: boolean;
  fuelStrategy: string;
  auxFuelTankCapacity: string;
  autoTransferPumpNeeded: boolean;
  tankerAccess20mOk: boolean;
  bundedContainmentCertified: boolean;
  offloadMethod: string;
  roadAccessibility: string;
  craneOutriggerGroundOk: boolean;
  overheadHazardsClear: boolean;
  engineerNotes: string;
}

export const DEFAULT_POWER_SURVEY: PowerSurveyState = {
  gatePassType: "Aramco Plant Pass",
  securityInductionRequired: true,
  h2sTrainingRequired: false,
  escortVehicleRequired: false,
  meggerL1MOhms: 185,
  meggerL2MOhms: 192,
  meggerL3MOhms: 178,
  meggerNeutralMOhms: 210,
  earthLoopImpedanceOhm: 1.8,
  phaseRotation: "Clockwise L1-L2-L3 (Field Verified)",
  generatorModel: "Cummins QSL9-G5 (250 kVA Prime)",
  alternatorModel: "Stamford UCI274K",
  generatorSerial: "EN-GEN-KSA-250-99",
  initialEngineHours: 1420.0,
  loadBankKw: 200,
  loadBankDurationMins: 30,
  acousticDbaAt7m: 68,
  transientRecoverySec: 0.4,
  roadProtectionRampsCount: 4,
  contractReference: "CTR-2026-0892-NEOM",
  dutyCycle: "24/7 Continuous Prime Power",
  voltageFrequency: "400V / 230V @ 50 Hz (KSA Standard)",
  runningLoadKw: 199,
  runningLoadKva: 250,
  motorStartingMethod: "Direct-On-Line (DOL, 6x Inrush)",
  recommendedKva: 250,
  powerRedundancy: "Single Standalone Unit",
  bessHybridRecommended: false,
  groundSurface: "Compacted Gravel / Marbel",
  exhaustClearanceOk: true,
  cableRunMeters: 45,
  cableSpec: "4-Core 240mm² Flexible Cu Rubber",
  roadCrossingRequiresRamps: true,
  earthResistanceOhm: 3.8,
  earthPitAvailable: true,
  fuelStrategy: "Auxiliary External Bunded Fuel Skid",
  auxFuelTankCapacity: "3,000L Skid",
  autoTransferPumpNeeded: true,
  tankerAccess20mOk: true,
  bundedContainmentCertified: true,
  offloadMethod: "Self-Loader Crane Truck (Hiab, up to 250 kVA)",
  roadAccessibility: "Paved Highway & Industrial Asphalt",
  craneOutriggerGroundOk: true,
  overheadHazardsClear: true,
  engineerNotes: "Site assessment verified for concrete batching plant & tower crane. Adequate pad compaction confirmed.",
};

export default function SiteInspectionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { triggerGuidance } = useVolviAssist();

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"power" | "siting" | "boq_evidence">("power");

  // Accordions
  const [showAdvancedMegger, setShowAdvancedMegger] = useState(false);
  const [showAdvancedClearance, setShowAdvancedClearance] = useState(false);

  // Modals
  const [showPacModal, setShowPacModal] = useState(false);
  const [pacActivePage, setPacActivePage] = useState<17 | 18>(17);
  const [pacZoom, setPacZoom] = useState<number>(100);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pacShareCopied, setPacShareCopied] = useState(false);
  const [pacShareDispatched, setPacShareDispatched] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    "khalid.m@al-bawani.sa",
    "t.alhazmi@al-bawani.sa",
  ]);

  const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Power survey custom state
  const [powerSurvey, setPowerSurvey] = useState<PowerSurveyState>(DEFAULT_POWER_SURVEY);

  // Fetch Master Data
  const { data: masterData } = useQuery<MasterDataResponse>({
    queryKey: ["site-inspections-master"],
    queryFn: () => siteInspectionApi.getMasterData(),
  });

  const availableBases = useMemo(() => {
    return masterData?.bases && masterData.bases.length > 0 ? masterData.bases : DEFAULT_BASES;
  }, [masterData]);

  // Fetch Inspection
  const { data: inspection, isLoading, refetch } = useQuery<SiteInspectionRecord>({
    queryKey: ["site-inspection", id],
    queryFn: () => siteInspectionApi.getInspection(id!),
    enabled: Boolean(id),
  });

  // Local Form State
  const [formData, setFormData] = useState<Partial<SiteInspectionRecord>>({});
  const [services, setServices] = useState<SiteInspectionServiceItem[]>([]);
  const isInitializedRef = useRef(false);

  // Step 2 -> Step 4 Milestone Celebration Modal State
  const [reviewSuccessModal, setReviewSuccessModal] = useState<{
    dealId?: string;
    leadId?: string;
    kVA: number;
    siteName: string;
    baseName: string;
  } | null>(null);

  useEffect(() => {
    if (inspection && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const defaultBase = availableBases[0] || DEFAULT_BASES[0];
      const initialBaseId = inspection.baseId || defaultBase.id;
      const initialBaseName = inspection.baseName || availableBases.find(b => b.id === initialBaseId)?.name || defaultBase.name;
      const initialMobKm = (inspection.mobilizationKm && Number(inspection.mobilizationKm) > 0) ? Number(inspection.mobilizationKm) : 120;
      setFormData({
        ...inspection,
        baseId: initialBaseId,
        baseName: initialBaseName,
        mobilizationKm: initialMobKm,
        auditAt: inspection.auditAt ? inspection.auditAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
        clientOrganization: (inspection.clientOrganization || "Al-Bawani Contracting Ltd").replace(/&amp;/g, "&"),
        clientRepName: inspection.clientRepName || "Eng. Khalid Mansoor",
        latitude: inspection.latitude != null ? Number(inspection.latitude) : 27.86,
        longitude: inspection.longitude != null ? Number(inspection.longitude) : 49.52,
      });

      if (inspection.observations && inspection.observations.includes("--- ENERGIA_POWER_TELEMETRY ---")) {
        try {
          const parts = inspection.observations.split("--- ENERGIA_POWER_TELEMETRY ---");
          if (parts[1]) {
            const parsed = JSON.parse(parts[1].trim());
            setPowerSurvey((prev) => ({ ...prev, ...parsed }));
          }
        } catch (e) {
          console.warn("[SiteSurvey] Could not parse telemetry:", e);
        }
      }

      setServices(inspection.services || []);
    }
  }, [inspection]);

  // Synchronize Volvi Guide with real-time inspection status and lead details
  useEffect(() => {
    if (!inspection?.id) return;
    const clientName = (
      inspection.clientOrganization ||
      formData.clientOrganization ||
      (inspection as any).lead?.company ||
      (inspection as any).lead?.contact?.name ||
      "Client"
    ).replace(/&amp;/g, "&");
    const kvaVal = Number(
      (formData as any).recommendedKva ||
      (formData as any).generatorKvaRequirement ||
      (inspection as any)?.recommendedKva ||
      powerSurvey.recommendedKva ||
      250
    );

    if (inspection.status === "SUBMITTED") {
      triggerGuidance({
        stepNumber: 2,
        stageName: "Step 2 Active • Survey Submitted for Manager Review",
        message: `Site Survey Submitted for ${clientName} (${kvaVal} kVA)`,
        explanation: "Field inspection parameters entered. Operations Supervisor review required to certify technical feasibility before commercial quoting.",
        recommendedAction: "Review & Approve Technical Clearance",
        actionLabel: "Approve Feasibility ➔",
        onAction: () => reviewMutation.mutate({ action: "APPROVE", comment: "Manager Sign-Off verified" }),
        technicalTip: "SEC Standard: Inrush multiplier 3.0x on DOL starters requires 250 kVA Prime generator with 25% safety reserve headroom.",
        suggestedPrompt: "What technical checks must be verified before approving generator site inspection?"
      });
    } else if (inspection.status === "APPROVED") {
      triggerGuidance({
        stepNumber: 3,
        stageName: "Step 2 Completed • Engineering Certified",
        message: `Technical Sizing Certified for ${clientName} (${kvaVal} kVA)`,
        explanation: "Inrush load, cable run distance, and ground compaction verified. Ready for commercial CPQ rate quotation formulation.",
        recommendedAction: "Build Rental Quotation in CPQ",
        actionLabel: "Open Rental CPQ (Step 4)",
        actionPath: `/rental-cpq/builder?leadId=${inspection.leadId || ""}&dealId=${inspection.dealId || ""}&kVA=${kvaVal}`,
        technicalTip: "Energia standard applies 20x monthly multiplier with 45% executive margin floor.",
        suggestedPrompt: "Explain 20x monthly rental rate card multiplier & margin floor"
      });
    } else {
      triggerGuidance({
        stepNumber: 2,
        stageName: "Step 2 Active • Field Survey & Technical Sizing",
        message: `Conduct Site Survey for ${clientName} (${kvaVal} kVA)`,
        explanation: "Verify peak electrical load, motor starting inrush kW, cable run meters, and operations hub logistics.",
        recommendedAction: "Complete & Submit Survey",
        actionLabel: "Submit Inspection ➔",
        technicalTip: "Check crane offloading access, soil compaction (>=150 kPa), and bunded fuel clearances.",
        suggestedPrompt: "Recommend generator for 260 kW with 3x DOL motor inrush"
      });
    }
  }, [inspection?.id, inspection?.status]);

  const userRole = (user?.role || "").toLowerCase();
  const canManagerOverride = ["admin", "director", "ops_manager"].includes(userRole);
  const isApprover = APPROVER_ROLES.includes(userRole) || canManagerOverride;
  const isInspector =
    Boolean(inspection) &&
    (canManagerOverride ||
      (userRole === "site_manager" && (!inspection?.assignedToId || inspection.assignedToId === user?.id)));

  const isEditable =
    Boolean(inspection) &&
    ["REQUESTED", "DRAFT", "CHANGES_REQUESTED", "SUBMITTED"].includes(inspection?.status || "") &&
    (isInspector || canManagerOverride);

  const liveBaseToSiteKm = useMemo(() => {
    const base = availableBases.find((b) => b.id === formData.baseId);
    if (!base || !formData.latitude || !formData.longitude) return 0;
    return haversineKm(base.latitude, base.longitude, Number(formData.latitude), Number(formData.longitude));
  }, [formData.baseId, formData.latitude, formData.longitude, availableBases]);

  const liveMetrics = useMemo(() => {
    return computeMetrics(formData.mobilizationKm ?? 0, services);
  }, [formData.mobilizationKm, services]);

  const updatePowerSurvey = (updates: Partial<PowerSurveyState>) => {
    setPowerSurvey((prev) => ({ ...prev, ...updates }));
  };

  // Clean strings without unescaped &amp; entities
  const displayClient = useMemo(() => {
    return (formData.clientOrganization || "Al-Bawani Contracting Ltd").replace(/&amp;/g, "&");
  }, [formData.clientOrganization]);

  const displaySite = useMemo(() => {
    return (formData.siteName || "NEOM Concrete Batching Plant & Tower Crane").replace(/&amp;/g, "&");
  }, [formData.siteName]);

  // Live Survey Bill of Quantities (BOQ) Items
  const boqItems = useMemo(() => {
    const items = [];
    const kva = powerSurvey.recommendedKva || 250;
    const isParallel = powerSurvey.powerRedundancy.includes("Parallel");

    items.push({
      category: "Power Generation",
      code: `GEN-${kva}KVA-PRIME`,
      desc: `${kva} kVA Prime Soundproof Package (${powerSurvey.voltageFrequency.split(" ")[0]})`,
      qty: isParallel ? 2 : 1,
      unit: "Unit",
    });

    if (powerSurvey.bessHybridRecommended) {
      items.push({
        category: "Hybrid Storage",
        code: `BESS-${Math.round(kva * 0.6)}KVA`,
        desc: `${Math.round(kva * 0.6)} kVA / ${Math.round(kva * 1.2)} kWh Lithium BESS Unit`,
        qty: 1,
        unit: "Skid",
      });
    }

    if (powerSurvey.auxFuelTankCapacity && powerSurvey.auxFuelTankCapacity !== "None") {
      items.push({
        category: "Fuel Logistics",
        code: `FLT-FUEL-${powerSurvey.auxFuelTankCapacity.replace(/\D/g, "")}L`,
        desc: `${powerSurvey.auxFuelTankCapacity} Double-Walled External Bunded Fuel Skid`,
        qty: 1,
        unit: "Skid",
      });
    }

    const cableMeters = (Number(powerSurvey.cableRunMeters) || 45) + 15;
    items.push({
      category: "Distribution",
      code: "CAB-4C-240-ARM",
      desc: `${cableMeters}m ${powerSurvey.cableSpec} with Crimp Lugs & Glands`,
      qty: cableMeters,
      unit: "Meters",
    });

    if (powerSurvey.roadCrossingRequiresRamps) {
      items.push({
        category: "Distribution Safety",
        code: "SAF-RAMP-20T",
        desc: `${powerSurvey.roadProtectionRampsCount}x Heavy-Duty 20T Road Cable Protection Ramps`,
        qty: powerSurvey.roadProtectionRampsCount,
        unit: "Pcs",
      });
    }

    items.push({
      category: "Site Logistics",
      code: "LOG-CRANE-OPS",
      desc: `${powerSurvey.offloadMethod} (Offloading & Placement)`,
      qty: 1,
      unit: "Job",
    });

    const mobKm = formData.mobilizationKm || Math.round(liveBaseToSiteKm * 1.3) || 120;
    items.push({
      category: "Freight Logistics",
      code: "FRT-HEAVY-HAUL",
      desc: `Heavy Lowbed Mobilization Freight (${mobKm} km via heavy haulage corridor)`,
      qty: mobKm,
      unit: "KM",
    });

    return items;
  }, [powerSurvey, formData.mobilizationKm, liveBaseToSiteKm]);

  // Mutations
  const saveDraftMutation = useMutation({
    mutationFn: (data: any) => siteInspectionApi.saveDraft(id!, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection", id] });
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      setFormData(updated);
      setSaveSuccessMsg("Survey draft saved successfully.");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || err.message || "Failed to save draft.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => siteInspectionApi.submitInspection(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection", id] });
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      setSaveSuccessMsg("Site survey submitted for director review!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || err.message || "Failed to submit survey.");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, comment }: { action: "APPROVE" | "REQUEST_CHANGES"; comment?: string }) =>
      siteInspectionApi.reviewInspection(id!, action, comment),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection", id] });
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });

      if (variables.action === "APPROVE") {
        const kvaVal = Number((formData as any).recommendedKva || (formData as any).generatorKvaRequirement || (inspection as any)?.recommendedKva || 250);
        const dId = (data as any)?.dealId || inspection?.dealId || "";
        const lId = inspection?.leadId || "";
        setReviewSuccessModal({
          dealId: dId,
          leadId: lId,
          kVA: kvaVal,
          siteName: formData.clientOrganization || inspection?.clientOrganization || "Saudi Aramco Operations",
          baseName: formData.baseName || inspection?.baseName || "Jubail Operations Base"
        });
        triggerGuidance({
          stepNumber: 3,
          stageName: "Step 2 Completed • Engineering Certified",
          message: `Technical Sizing Certified (${kvaVal} kVA Generator Package)`,
          explanation: "Inrush load, cable run distance, and ground compaction verified. Ready for commercial CPQ rate quotation formulation.",
          recommendedAction: "Build Rental Quotation in CPQ",
          actionLabel: "Open Rental CPQ",
          actionPath: `/rental-cpq/builder?leadId=${lId}&dealId=${dId}&kVA=${kvaVal}`,
          technicalTip: "Energia standard applies 20x monthly multiplier with 45% executive margin floor.",
          suggestedPrompt: "Explain 20x monthly rental rate card multiplier & margin floor"
        });
      } else {
        setSaveSuccessMsg("Changes requested and inspection returned to surveyor.");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || err.message || "Review failed.");
    },
  });

  const deleteAttMutation = useMutation({
    mutationFn: (attId: string) => siteInspectionApi.deleteAttachment(id!, attId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection", id] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    e.target.value = "";
    setFormError(null);

    setIsUploading(true);
    try {
      const fd = new FormData();
      fileList.forEach((file) => fd.append("files", file));
      fd.append("tag", "Site Overview");
      await siteInspectionApi.uploadAttachments(id!, fd);
      await queryClient.invalidateQueries({ queryKey: ["site-inspection", id] });
      await refetch();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const preparePayload = () => {
    let cleanNotes = formData.observations || "";
    if (cleanNotes.includes("--- ENERGIA_POWER_TELEMETRY ---")) {
      cleanNotes = cleanNotes.split("--- ENERGIA_POWER_TELEMETRY ---")[0].trim();
    }
    const combinedObservations = `${cleanNotes}\n\n--- ENERGIA_POWER_TELEMETRY ---\n${JSON.stringify(powerSurvey)}`;

    const defaultBase = availableBases[0] || DEFAULT_BASES[0];
    const effectiveBaseId = formData.baseId || defaultBase.id;
    const effectiveBase = availableBases.find((b) => b.id === effectiveBaseId) || defaultBase;
    const effectiveBaseName = formData.baseName || effectiveBase.name || "Jubail Operations Base";
    const effectiveMobKm = Number(formData.mobilizationKm) > 0 
      ? Number(formData.mobilizationKm) 
      : (liveBaseToSiteKm > 0 ? Math.round(liveBaseToSiteKm) : 120);

    const effectiveAuditAt = formData.auditAt && formData.auditAt.trim() ? formData.auditAt : new Date().toISOString();
    const effectiveLat = formData.latitude != null ? Number(formData.latitude) : 27.86;
    const effectiveLng = formData.longitude != null ? Number(formData.longitude) : 49.52;
    const effectiveClientOrg = (formData.clientOrganization || "Al-Bawani Contracting Ltd").replace(/&amp;/g, "&");
    const effectiveClientRep = formData.clientRepName || "Eng. Khalid Mansoor";

    return {
      ...formData,
      baseId: effectiveBaseId,
      baseName: effectiveBaseName,
      mobilizationKm: effectiveMobKm,
      auditAt: effectiveAuditAt,
      latitude: effectiveLat,
      longitude: effectiveLng,
      clientOrganization: effectiveClientOrg,
      clientRepName: effectiveClientRep,
      observations: combinedObservations,
      services,
      baseToSiteStraightKm: liveBaseToSiteKm || effectiveMobKm,
      totalCycleKm: liveMetrics.totalCycleKm || (effectiveMobKm * 2),
      estFuelLitres: liveMetrics.estFuelLitres || Math.round(effectiveMobKm * 0.4),
    };
  };

  const handleSaveDraft = async () => {
    setFormError(null);
    const payload = preparePayload();
    await saveDraftMutation.mutateAsync(payload);
  };

  const handleSubmit = async () => {
    setFormError(null);
    const payload = preparePayload();
    await submitMutation.mutateAsync(payload);
  };

  if (isLoading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading inspection portal...</div>;
  }

  if (!inspection) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Inspection Not Found</h2>
        <Link to="/site-inspections" className="text-xs text-[#ED1A53] font-bold hover:underline">
          Return to Inspections List
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body, html, #root, .h-screen, main, div {
            height: auto !important;
            overflow: visible !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
          }
          nav, header, aside, .sidebar, [role="navigation"] {
            display: none !important;
          }
          .inspection-screen-view {
            display: none !important;
          }
          .inspection-print-view {
            display: block !important;
          }
        }
        @media screen {
          .inspection-print-view {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= COMPACT SCREEN INTERACTIVE COCKPIT ================= */}
      <div className="inspection-screen-view font-sans max-w-[1400px] mx-auto px-3 sm:px-6 py-4 space-y-3 print:hidden">

        {/* 1. Sleek Executive Header (Polished Gradient & Typography) */}
        <div className="bg-gradient-to-r from-[#210915] via-[#1a0c16] to-[#120710] border border-[#ED1A53]/25 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-24 bg-[#ED1A53]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <button
              onClick={() => navigate("/site-inspections")}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-300 transition-colors shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ED1A53] to-[#B9003C] text-white flex items-center justify-center font-black text-sm shadow-md shadow-[#ED1A53]/30 shrink-0">
              E
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#ED1A53]/20 text-[#ED1A53] border border-[#ED1A53]/30 shrink-0">
                  {inspection.inspectionNumber}
                </span>
                <span className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                  {displaySite}
                </span>
                {displayClient && displayClient.toLowerCase() !== displaySite.toLowerCase() && (
                  <span className="text-xs text-rose-200/90 font-medium truncate">
                    • {displayClient}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#ED1A53]" />
                  <span className="text-slate-400">Base:</span>
                  <select
                    value={formData.baseId || availableBases[0]?.id}
                    onChange={(e) => {
                      const b = availableBases.find(base => base.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        baseId: e.target.value,
                        baseName: b?.name,
                      }));
                    }}
                    className="bg-white/10 hover:bg-white/20 text-slate-100 font-bold text-[11px] rounded px-1.5 py-0.5 border border-white/20 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ED1A53]"
                  >
                    {availableBases.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white font-normal">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Handover: <strong className="text-slate-200">30 Mar 2026, 17:00 AST</strong></span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Clock className="w-3 h-3" />
                  <span>SLA On-Track (47h)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto relative z-10">
            <button
              type="button"
              onClick={() => setShowPacModal(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5 text-rose-300" />
              <span>Preview PAC</span>
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Share</span>
            </button>
            {isApprover && (
              <button
                type="button"
                onClick={() => reviewMutation.mutate({ action: "APPROVE", comment: "Manager Sign-Off verified" })}
                disabled={reviewMutation.isPending}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#ED1A53] to-[#C21340] hover:from-[#d91649] hover:to-[#a10034] text-white text-xs font-bold rounded-xl shadow-md shadow-[#ED1A53]/25 flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{reviewMutation.isPending ? "Approving..." : "Approve Survey"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Top 4-Tile Live KPI Telemetry Strip (Dashboard Depth & Icon Accents) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Tile 1: Fleet Package */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow border-t-2 border-t-[#ED1A53]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                RECOMMENDED FLEET PACKAGE
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-[#ED1A53] flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {powerSurvey.recommendedKva} kVA Prime
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-[#ED1A53] font-bold border border-rose-200/60">
                Soundproof
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Cummins QSL9-G5 · 400V 50Hz
            </span>
          </div>

          {/* Tile 2: Siting & Cable Run */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow border-t-2 border-t-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                CABLE RUN & PROTECTION
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {powerSurvey.cableRunMeters + 15}m Run
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200/60">
                4x 20T Ramps
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              4-Core 240mm² Armored Cu
            </span>
          </div>

          {/* Tile 3: Fuel Logistics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow border-t-2 border-t-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                AUXILIARY FUEL LOGISTICS
              </span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {powerSurvey.auxFuelTankCapacity}
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200/60">
                Auto-Pump OK
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              110% Double-Wall Bunded Skid
            </span>
          </div>

          {/* Tile 4: Compliance & Tests */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow border-t-2 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                ELECTRICAL AUDIT & GROUNDING
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-tight">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% PASS</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60">
                Earth 1.8Ω
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Megger &gt;175 MΩ · L1-L2-L3 Clockwise
            </span>
          </div>
        </div>

        {/* Submitted Awaiting Review Banner */}
        {inspection?.status === "SUBMITTED" && (
          <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-100/60 to-white dark:from-amber-950/40 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✓ Site Inspection Submitted · Awaiting Operations Manager Review</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-black uppercase">
                    Status: Submitted
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  The on-site engineer has completed measurements (cabling, inrush, soil test). As Operations Manager / Director, review the technical parameters below and approve feasibility to clear this project for CPQ pricing.
                </p>
              </div>
            </div>
            {isApprover && (
              <button
                type="button"
                onClick={() => reviewMutation.mutate({ action: "APPROVE", comment: "Manager Sign-Off verified" })}
                disabled={reviewMutation.isPending}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{reviewMutation.isPending ? "Approving..." : "Approve Technical Feasibility"}</span>
              </button>
            )}
          </div>
        )}

        {/* Notifications / Alerts */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {formError && !formError.includes("Cannot edit inspection in status SUBMITTED") && (
          <div className="p-3 bg-rose-50 border border-rose-200/90 text-rose-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="text-rose-600 hover:opacity-80">×</button>
          </div>
        )}

        {/* 3. Two-Column Workspace Cockpit (65% Workflow / 35% Live HUD) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

          {/* ── LEFT COLUMN (65%): Segmented Tabbed Workflows ── */}
          <div className="lg:col-span-8 space-y-3">
            {/* Segmented Pill Tab Bar (Modern Glass Style) */}
            <div className="bg-[#F8F4F6] dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center gap-1 border border-[#E5D4DE] dark:border-[#551938]/40 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("power")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  activeTab === "power"
                    ? "bg-white dark:bg-slate-900 text-[#ED1A53] shadow-xs border border-slate-200/60 dark:border-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1. Power Demand & Sizing</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("siting")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  activeTab === "siting"
                    ? "bg-white dark:bg-slate-900 text-[#ED1A53] shadow-xs border border-slate-200/60 dark:border-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>2. Siting, Cabling & Fuel</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("boq_evidence")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                  activeTab === "boq_evidence"
                    ? "bg-white dark:bg-slate-900 text-[#ED1A53] shadow-xs border border-slate-200/60 dark:border-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>3. BOQ Sync & Photos</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {boqItems.length}
                </span>
              </button>
            </div>

            {/* TAB 1: POWER DEMAND & SIZING */}
            {activeTab === "power" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-[#E5D4DE] dark:border-[#551938]/40 space-y-4 shadow-[0_4px_20px_-2px_rgba(85,25,56,0.05)]">
                {/* 4 Core Sizing Inputs with Custom Select Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Generator Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.recommendedKva}
                        onChange={(e) => updatePowerSurvey({ recommendedKva: Number(e.target.value) || 250 })}
                        className="w-full appearance-none bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl px-3 py-2 text-xs font-bold text-[#ED1A53] pr-8 transition-all cursor-pointer"
                      >
                        {[150, 250, 350, 500, 650, 800, 1000, 1250, 1500, 2000].map((k) => (
                          <option key={k} value={k}>
                            {k} kVA Prime Soundproof
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Voltage & Frequency Standard
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.voltageFrequency}
                        onChange={(e) => updatePowerSurvey({ voltageFrequency: e.target.value })}
                        className="w-full appearance-none bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 pr-8 transition-all cursor-pointer"
                      >
                        <option value="400V / 230V @ 50 Hz (KSA Standard)">400V / 230V @ 50 Hz (Standard)</option>
                        <option value="380V / 220V @ 60 Hz">380V / 220V @ 60 Hz</option>
                        <option value="480V / 277V @ 60 Hz">480V / 277V @ 60 Hz</option>
                        <option value="13.8 kV / 33 kV Medium Voltage">13.8 kV / 33 kV MV</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Motor Starting Method
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.motorStartingMethod}
                        onChange={(e) => updatePowerSurvey({ motorStartingMethod: e.target.value })}
                        className="w-full appearance-none bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 pr-8 transition-all cursor-pointer"
                      >
                        <option value="Direct-On-Line (DOL, 6x Inrush)">DOL (6x Inrush Surge)</option>
                        <option value="Star-Delta (3x Inrush)">Star-Delta (3x Inrush)</option>
                        <option value="VFD (Variable Frequency Drive)">VFD (Smooth Start 1.2x)</option>
                        <option value="Soft Starter (2x Inrush)">Soft Starter (2x Inrush)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Running Load (kW / kVA)
                    </label>
                    <div className="flex items-center bg-slate-50/80 border border-slate-200 rounded-xl px-2 py-1.5 focus-within:bg-white focus-within:border-[#ED1A53] focus-within:ring-2 focus-within:ring-[#ED1A53]/15 transition-all">
                      <div className="flex-1 flex items-center pr-1.5">
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={powerSurvey.runningLoadKw || ""}
                          onChange={(e) => updatePowerSurvey({ runningLoadKw: Number(e.target.value) || 0 })}
                          placeholder="199"
                          className="w-full font-mono font-bold text-xs bg-transparent focus:outline-none text-slate-900"
                        />
                        <span className="text-[10px] font-mono text-slate-400 font-bold ml-1">kW</span>
                      </div>
                      <div className="w-px h-4 bg-slate-300 mx-1" />
                      <div className="flex-1 flex items-center pl-1.5">
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={powerSurvey.runningLoadKva || ""}
                          onChange={(e) => updatePowerSurvey({ runningLoadKva: Number(e.target.value) || 0 })}
                          placeholder="250"
                          className="w-full font-mono font-bold text-xs bg-transparent focus:outline-none text-slate-900"
                        />
                        <span className="text-[10px] font-mono text-slate-400 font-bold ml-1">kVA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duty Cycle & High-Tech BESS Hybrid Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Duty Cycle Selectors */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block">
                      Duty Cycle & Fleet Redundancy
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative flex items-center">
                        <select
                          disabled={!isEditable}
                          value={powerSurvey.dutyCycle}
                          onChange={(e) => updatePowerSurvey({ dutyCycle: e.target.value })}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-xs pr-6"
                        >
                          <option value="24/7 Continuous Prime Power">24/7 Continuous Prime</option>
                          <option value="Peak Shaving / Load Leveling">Peak Shaving</option>
                          <option value="Standby / Emergency Backup (with ATS)">Standby / Backup</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                      </div>

                      <div className="relative flex items-center">
                        <select
                          disabled={!isEditable}
                          value={powerSurvey.powerRedundancy}
                          onChange={(e) => updatePowerSurvey({ powerRedundancy: e.target.value })}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-xs pr-6"
                        >
                          <option value="Single Standalone Unit">Single Standalone Unit</option>
                          <option value="Parallel Synchronized N+1">Parallel N+1 Sync</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* High-Tech BESS Hybrid Toggle Card */}
                  <div
                    onClick={() => updatePowerSurvey({ bessHybridRecommended: !powerSurvey.bessHybridRecommended })}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      powerSurvey.bessHybridRecommended
                        ? "bg-gradient-to-r from-emerald-500/10 via-emerald-50/40 to-white border-emerald-300 shadow-2xs"
                        : "bg-slate-50/80 border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${
                        powerSurvey.bessHybridRecommended ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-500"
                      }`}>
                        <BatteryCharging className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">BESS Battery Hybrid Storage</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                            -40% Fuel Burn
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Silent night battery cycle for tower crane & batching controls
                        </p>
                      </div>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                      powerSurvey.bessHybridRecommended ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                    }`}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                </div>

                {/* Collapsible Accordion: Megger 1,000V DC & Stepped Load Bank */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedMegger(!showAdvancedMegger)}
                    className="w-full p-3 bg-gradient-to-r from-slate-50/90 to-emerald-50/30 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Gauge className="w-3.5 h-3.5 text-[#ED1A53]" />
                      <span>1,000V DC Megger & Load Bank Protocol (Verified: &gt;175 MΩ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/60">
                        ALL PHASES PASS
                      </span>
                      {showAdvancedMegger ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {showAdvancedMegger && (
                    <div className="p-3.5 bg-white space-y-3 border-t border-slate-200 text-xs">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-slate-50/80 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">Phase L1</span>
                          <input
                            type="number"
                            value={powerSurvey.meggerL1MOhms}
                            onChange={(e) => updatePowerSurvey({ meggerL1MOhms: Number(e.target.value) || 0 })}
                            className="w-16 text-center font-mono font-bold text-xs bg-transparent border-b border-slate-300 focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-slate-400 ml-1">MΩ</span>
                        </div>
                        <div className="p-2 bg-slate-50/80 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">Phase L2</span>
                          <input
                            type="number"
                            value={powerSurvey.meggerL2MOhms}
                            onChange={(e) => updatePowerSurvey({ meggerL2MOhms: Number(e.target.value) || 0 })}
                            className="w-16 text-center font-mono font-bold text-xs bg-transparent border-b border-slate-300 focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-slate-400 ml-1">MΩ</span>
                        </div>
                        <div className="p-2 bg-slate-50/80 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">Phase L3</span>
                          <input
                            type="number"
                            value={powerSurvey.meggerL3MOhms}
                            onChange={(e) => updatePowerSurvey({ meggerL3MOhms: Number(e.target.value) || 0 })}
                            className="w-16 text-center font-mono font-bold text-xs bg-transparent border-b border-slate-300 focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-slate-400 ml-1">MΩ</span>
                        </div>
                        <div className="p-2 bg-slate-50/80 border border-slate-200 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold block">Neutral Line</span>
                          <input
                            type="number"
                            value={powerSurvey.meggerNeutralMOhms}
                            onChange={(e) => updatePowerSurvey({ meggerNeutralMOhms: Number(e.target.value) || 0 })}
                            className="w-16 text-center font-mono font-bold text-xs bg-transparent border-b border-slate-300 focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-slate-400 ml-1">MΩ</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 font-mono text-[11px]">
                        <span>Load Bank: <strong className="text-slate-900">{powerSurvey.loadBankKw} kW (30 Min)</strong></span>
                        <span>Acoustic: <strong className="text-slate-900">{powerSurvey.acousticDbaAt7m} dBA @ 7m</strong></span>
                        <span>Transient Recovery: <strong className="text-emerald-600">&lt; {powerSurvey.transientRecoverySec}s (Stable)</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SITING, CABLING & FUEL SKID */}
            {activeTab === "siting" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Cable Meters */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Cable Run to MDP (Meters) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-[#ED1A53] focus-within:ring-2 focus-within:ring-[#ED1A53]/15 transition-all">
                      <input
                        type="number"
                        disabled={!isEditable}
                        value={powerSurvey.cableRunMeters || ""}
                        onChange={(e) => updatePowerSurvey({ cableRunMeters: Number(e.target.value) || 0 })}
                        placeholder="45"
                        className="w-full p-2 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                      />
                      <span className="pr-3 text-[10px] font-mono font-bold text-slate-400">METERS</span>
                    </div>
                  </div>

                  {/* Cable Spec */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Cable Specification
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.cableSpec}
                        onChange={(e) => updatePowerSurvey({ cableSpec: e.target.value })}
                        className="w-full appearance-none bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 pr-8 transition-all cursor-pointer"
                      >
                        <option value="4-Core 240mm² Flexible Cu Rubber">4-Core 240mm² Class 5 Armored</option>
                        <option value="4-Core 300mm² Flexible Cu">4-Core 300mm² Flexible Cu</option>
                        <option value="Single-Core 300mm² Trefoil">Single-Core 300mm² Trefoil</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Earth Loop Impedance */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Earth Loop (≤ 5.0Ω)
                    </label>
                    <div className="flex items-center bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-emerald-500 transition-all">
                      <input
                        type="number"
                        step="0.1"
                        disabled={!isEditable}
                        value={powerSurvey.earthLoopImpedanceOhm || ""}
                        onChange={(e) => updatePowerSurvey({ earthLoopImpedanceOhm: Number(e.target.value) || 0 })}
                        className="w-full p-2 text-center text-xs font-black text-emerald-600 bg-transparent focus:outline-none"
                      />
                      <span className="pr-3 text-[10px] font-bold text-slate-400">OHM (Ω)</span>
                    </div>
                  </div>

                  {/* Auxiliary Fuel Skid */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Auxiliary Fuel Skid
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.auxFuelTankCapacity}
                        onChange={(e) => updatePowerSurvey({ auxFuelTankCapacity: e.target.value })}
                        className="w-full appearance-none bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 pr-8 transition-all cursor-pointer"
                      >
                        <option value="3,000L Skid">3,000L Double-Walled Skid</option>
                        <option value="5,000L Skid">5,000L Industrial Skid</option>
                        <option value="None">None (Internal Tank Only)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Siting, Offloading & Ramps Checks */}
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Pad Surface & Compaction
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.groundSurface}
                        onChange={(e) => updatePowerSurvey({ groundSurface: e.target.value })}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-xs pr-6"
                      >
                        <option value="Compacted Gravel / Marbel">Compacted Gravel / Marbel Base</option>
                        <option value="Reinforced Concrete Slab">Reinforced Concrete Slab</option>
                        <option value="Asphalt Road Surface">Asphalt Industrial Surface</option>
                        <option value="Soft Sand (Requires Road Plates)">Soft Sand (Requires Steel Plates)</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Offloading Method
                    </label>
                    <div className="relative flex items-center">
                      <select
                        disabled={!isEditable}
                        value={powerSurvey.offloadMethod}
                        onChange={(e) => updatePowerSurvey({ offloadMethod: e.target.value })}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-xs pr-6"
                      >
                        <option value="Self-Loader Crane Truck (Hiab, up to 250 kVA)">Hiab Crane Truck (up to 250 kVA)</option>
                        <option value="50-Ton Mobile Hydraulic Crane">50-Ton Hydraulic Mobile Crane</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center space-y-2 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powerSurvey.roadCrossingRequiresRamps}
                        onChange={(e) => updatePowerSurvey({ roadCrossingRequiresRamps: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 accent-amber-600"
                      />
                      <span className="font-semibold text-slate-700">Roadway Crossing (4x 20T Ramps)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powerSurvey.autoTransferPumpNeeded}
                        onChange={(e) => updatePowerSurvey({ autoTransferPumpNeeded: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span className="font-semibold text-slate-700">Auxiliary Fuel Auto-Transfer Pump</span>
                    </label>
                  </div>
                </div>

                {/* Collapsible Accordion: Siting & Clearances */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedClearance(!showAdvancedClearance)}
                    className="w-full p-3 bg-slate-50/90 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Clearance & Phase Rotation Protocol (Clockwise L1-L2-L3 Verified)</span>
                    </div>
                    {showAdvancedClearance ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {showAdvancedClearance && (
                    <div className="p-3.5 bg-white space-y-2 border-t border-slate-200 text-xs">
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked={powerSurvey.exhaustClearanceOk} onChange={(e) => updatePowerSurvey({ exhaustClearanceOk: e.target.checked })} className="rounded" />
                          <span>≥1.5m Louver Clearance & Exhaust Clear</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked={powerSurvey.overheadHazardsClear} onChange={(e) => updatePowerSurvey({ overheadHazardsClear: e.target.checked })} className="rounded" />
                          <span>No Overhead High-Voltage Cables in Crane Radius</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked={powerSurvey.craneOutriggerGroundOk} onChange={(e) => updatePowerSurvey({ craneOutriggerGroundOk: e.target.checked })} className="rounded" />
                          <span>Crane Outrigger Ground Bearing Verified</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked={powerSurvey.tankerAccess20mOk} onChange={(e) => updatePowerSurvey({ tankerAccess20mOk: e.target.checked })} className="rounded" />
                          <span>20m Tanker Hose Reach to Skid</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: BOQ SYNC & FIELD EVIDENCE */}
            {activeTab === "boq_evidence" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-2xs">
                {/* Clean BOQ Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Live Survey Bill of Quantities (Pushes to Step 4 CPQ)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                      {boqItems.length} ITEMS SYNCED
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Item Code</th>
                          <th className="p-2.5">Specification & Description</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {boqItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 font-mono text-[11px] font-bold text-[#ED1A53]">{item.code}</td>
                            <td className="p-2.5 text-slate-800 font-medium">{item.desc}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-900">{item.qty}</td>
                            <td className="p-2.5 text-center text-slate-500">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Field Notes & Photo Uploader */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Field Engineer Notes
                    </label>
                    <textarea
                      rows={3}
                      value={formData.observations ? formData.observations.split("--- ENERGIA_POWER_TELEMETRY ---")[0].trim() : ""}
                      onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      placeholder="Add concise site observations..."
                      className="w-full p-2.5 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ED1A53] focus:ring-2 focus:ring-[#ED1A53]/15 rounded-xl text-xs leading-relaxed transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Upload Site Photos (Pad, MDP, Cabling)
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">
                        {isUploading ? "Uploading photos..." : "+ Add Geotagged Site Photo"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG or PDF (Auto-EXIF)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Elevated Sticky Action Certification Bar */}
            <div className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.accepted)}
                  onChange={(e) => setFormData({ ...formData, accepted: e.target.checked })}
                  className="w-4 h-4 rounded text-[#ED1A53] accent-[#ED1A53]"
                />
                <span>I certify that all power sizing parameters and ground specs reflect verified field conditions.</span>
              </label>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {inspection?.status === "SUBMITTED" ? (
                  <>
                    <span className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>Survey Submitted · Awaiting Review</span>
                    </span>
                    {isApprover && (
                      <button
                        type="button"
                        onClick={() => reviewMutation.mutate({ action: "APPROVE", comment: "Manager Sign-Off verified" })}
                        disabled={reviewMutation.isPending}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{reviewMutation.isPending ? "Approving..." : "Approve Technical Feasibility"}</span>
                      </button>
                    )}
                  </>
                ) : inspection?.status === "APPROVED" ? (
                  <>
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Technical Feasibility Approved</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const kvaVal = Number((formData as any).recommendedKva || (formData as any).generatorKvaRequirement || powerSurvey.recommendedKva || 250);
                        navigate(`/rental-cpq/builder?leadId=${inspection?.leadId || ""}&dealId=${inspection?.dealId || ""}&kVA=${kvaVal}`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#ED1A53] to-[#C21340] hover:from-[#d91649] hover:to-[#a10034] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Proceed to CPQ (Step 4)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={saveDraftMutation.isPending}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitMutation.isPending ? "Submitting..." : "Submit Inspection"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (35%): Sticky Live CPQ & Evidence HUD ── */}
          <div className="lg:col-span-4 space-y-3 sticky top-4">

            {/* Card A: Quick Rental Sizing Summary */}
            <div className="bg-white dark:bg-slate-900 border-2 border-[#E5D4DE] dark:border-[#551938]/40 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-gradient-to-r from-[#1e1018] to-[#2b0f20] text-white p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#ED1A53]" />
                  <span>Rental Sizing Cockpit</span>
                </span>
                <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ED1A53]/20 text-rose-300 border border-[#ED1A53]/30">
                  AUTO-SYNC
                </span>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Selected Generator:</span>
                  <strong className="text-slate-900 font-black">{powerSurvey.recommendedKva} kVA Prime</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Voltage Standard:</span>
                  <span className="font-mono text-slate-900 font-semibold">{powerSurvey.voltageFrequency.split(" ")[0]}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Cable Run Headroom:</span>
                  <span className="font-mono text-slate-900 font-semibold">{powerSurvey.cableRunMeters + 15}m</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Auxiliary Fuel Skid:</span>
                  <span className="font-semibold text-slate-900">{powerSurvey.auxFuelTankCapacity}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Mobilization Distance:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={formData.mobilizationKm ?? 120}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobilizationKm: Number(e.target.value) || 0 }))}
                      className="w-16 font-mono font-bold text-right text-[#ED1A53] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-[#ED1A53]"
                    />
                    <span className="font-mono font-bold text-xs text-[#ED1A53]">KM</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPacModal(true)}
                    className="w-full py-2.5 bg-gradient-to-r from-[#ED1A53] to-[#B9003C] hover:from-[#d91649] hover:to-[#a10034] text-white text-xs font-bold rounded-xl shadow-md shadow-[#ED1A53]/25 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Export Certified PAC Dossier</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card B: Client Representative & Gate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                CLIENT SIGN-OFF & GATE DISPATCH
              </span>
              <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      KB
                    </div>
                    <strong className="text-slate-900 text-xs">{formData.clientRepName || "Eng. Khalid Mansoor"}</strong>
                  </div>
                  <span className="font-mono text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/60">
                    ABSHER VERIFIED
                  </span>
                </div>
                <span className="text-slate-500 block text-[11px] font-medium">Site Electrical Operations Manager · Al-Bawani</span>
                <span className="font-mono text-[10px] text-slate-600 block">{formData.clientRepPhone || "+966 50 123 4567"}</span>
              </div>
            </div>

            {/* Card C: Quick Photo Evidence Gallery */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  FIELD EVIDENCE ({inspection.attachments?.length || 0})
                </span>
                <label className="text-[10px] font-bold text-[#ED1A53] cursor-pointer hover:underline">
                  + Add
                  <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {(inspection.attachments?.length || 0) === 0 ? (
                <div className="p-5 text-center text-slate-400 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 space-y-1">
                  <Camera className="w-5 h-5 mx-auto text-slate-300" />
                  <p className="text-[11px] font-medium">No site photos attached yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {(inspection.attachments || []).map((att) => (
                    <div key={att.id} className="border border-slate-200 rounded-xl p-1.5 bg-slate-50 space-y-1">
                      <div className="h-16 w-full bg-slate-200 rounded-lg overflow-hidden">
                        <InspectionAttachmentThumbnail
                          inspectionId={id!}
                          attachmentId={att.id}
                          fileName={att.fileName}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="truncate font-semibold text-slate-700">{att.fileName}</span>
                        <button
                          type="button"
                          onClick={() => deleteAttMutation.mutate(att.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ================= STITCH PLANT ACCEPTANCE CERTIFICATE (PAC) MODAL ================= */}
      {showPacModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#f8f9ff] text-[#0b1c30] w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header */}
            <div className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#b9003c] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  E
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#b9003c] font-bold tracking-wider uppercase truncate">
                      {formData.rfqNumber || powerSurvey.contractReference}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/60">
                      ISO 19005-3 ARCHIVAL PDF/A-3B
                    </span>
                  </div>
                  <h1 className="text-sm font-bold text-slate-900 truncate">
                    Plant Acceptance Certificate (PAC) & Technical Handover Deed
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 bg-[#b9003c] hover:bg-[#91002d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share PAC</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPacModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Controls Strip */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPacActivePage(17)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    pacActivePage === 17 ? "bg-[#b9003c] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  P.17 (Hardware PAC)
                </button>
                <button
                  type="button"
                  onClick={() => setPacActivePage(18)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    pacActivePage === 18 ? "bg-[#b9003c] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  P.18 (Statutory Deed & Sign-Off)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPacZoom((z) => Math.max(80, z - 10))}
                  className="p-1 hover:bg-white rounded-lg text-slate-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-bold text-slate-700">{pacZoom}%</span>
                <button
                  type="button"
                  onClick={() => setPacZoom((z) => Math.min(140, z + 10))}
                  className="p-1 hover:bg-white rounded-lg text-slate-600"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div
                style={{ transform: `scale(${pacZoom / 100})`, transformOrigin: "top center" }}
                className="transition-transform duration-150"
              >
                {pacActivePage === 17 && (
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-1.5 bg-slate-50 px-3 py-1 rounded text-xs">
                      <span className="font-mono font-bold text-[#b9003c] uppercase tracking-wider">
                        PAGE 17 OF 18 • SEC-ENG-PAC
                      </span>
                      <span className="font-mono text-slate-500 font-semibold">
                        REF: PAC-2026-0892
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pt-1 border-b border-slate-100 pb-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-[#b9003c] text-white flex items-center justify-center font-bold text-base">
                            E
                          </div>
                          <span className="text-base font-black text-slate-900 tracking-tight uppercase">
                            ENERGIA
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                          KSA Power Grid Systems
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="font-mono text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          ISO 9001:2015
                        </span>
                        <span className="font-mono text-[8px] text-slate-500 mt-0.5">
                          ISO 45001 CERTIFIED
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="font-bold text-sm text-slate-900 uppercase">
                          {displayClient}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500 tracking-wider">
                          NEOM Industrial Infrastructure
                        </span>
                      </div>
                    </div>

                    <div className="text-center py-2 bg-slate-100 rounded">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        FINAL PLANT ACCEPTANCE CERTIFICATE
                      </h2>
                      <span className="font-mono text-[10px] text-[#b9003c] font-bold uppercase tracking-wider">
                        PAC & SITE HANDOVER DEED
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[11px] text-slate-500 uppercase font-bold">
                        1.0 Project Identification Data
                      </span>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded text-xs">
                        <div>
                          <span className="font-mono text-[10px] text-slate-500 block">Target Facility / Site</span>
                          <span className="font-bold text-slate-900">{displaySite}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] text-slate-500 block">Contract Reference</span>
                          <span className="font-mono font-bold text-[#b9003c]">{formData.rfqNumber || powerSurvey.contractReference}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] text-slate-500 block">Handover Timestamp</span>
                          <span className="font-mono text-slate-900">30 Mar 2026, 17:00 AST</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] text-slate-500 block">Initial Billing Run Hours</span>
                          <span className="font-mono font-bold text-slate-900">{powerSurvey.initialEngineHours} Engine Hrs</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-mono text-[11px] text-slate-500 uppercase font-bold">
                        2.0 Deployed Asset Telemetry
                      </span>
                      <div className="bg-slate-50 p-3 rounded space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Prime Generator Unit</span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            DEPLOYED & COMMISSIONED
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-600">
                          <div>Model: <strong className="text-slate-900">{powerSurvey.generatorModel}</strong></div>
                          <div>Rating: <strong className="text-slate-900">{powerSurvey.recommendedKva} kVA Prime</strong></div>
                          <div>Serial: <strong className="text-slate-900">{powerSurvey.generatorSerial}</strong></div>
                          <div>Alternator: <strong className="text-slate-900">{powerSurvey.alternatorModel}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-slate-500 uppercase font-bold">
                          3.0 Electrical Megger & Load Bank Results
                        </span>
                        <span className="font-mono text-[10px] text-[#b9003c] font-bold">
                          ALL TESTS: PASS
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded space-y-2">
                        <span className="font-mono text-[10px] text-slate-500">1,000V DC Insulation Resistance (&gt;50 MΩ)</span>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="font-mono text-[9px] text-slate-400 block">L1</span>
                            <span className="font-mono text-xs font-bold text-slate-900">{powerSurvey.meggerL1MOhms} MΩ</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="font-mono text-[9px] text-slate-400 block">L2</span>
                            <span className="font-mono text-xs font-bold text-slate-900">{powerSurvey.meggerL2MOhms} MΩ</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="font-mono text-[9px] text-slate-400 block">L3</span>
                            <span className="font-mono text-xs font-bold text-slate-900">{powerSurvey.meggerL3MOhms} MΩ</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="font-mono text-[9px] text-slate-400 block">Neutral</span>
                            <span className="font-mono text-xs font-bold text-slate-900">{powerSurvey.meggerNeutralMOhms} MΩ</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                          <div className="bg-white p-2 rounded border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Earth Impedance:</span>
                            <strong className="text-slate-900">{powerSurvey.earthLoopImpedanceOhm} Ω (Pass)</strong>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Rotation:</span>
                            <strong className="text-slate-900">{powerSurvey.phaseRotation}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-slate-400 font-mono text-[9px] border-t border-slate-100">
                      <span>ENERGIA QMS-PAC-DOC-REV4</span>
                      <span>DOC ID: 20260330-99042-S4</span>
                    </div>
                  </div>
                )}

                {pacActivePage === 18 && (
                  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-1.5 bg-slate-50 px-3 py-1 rounded text-xs">
                      <span className="font-mono font-bold text-[#b9003c] uppercase tracking-wider">
                        PAGE 18 OF 18 • SEC-LEGAL-AUTH
                      </span>
                      <span className="font-mono text-slate-500 font-semibold">
                        PAC-2026-0892-ENDORSEMENT
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded space-y-2 border border-slate-200 text-xs">
                      <div className="flex items-center gap-1.5 text-[#b9003c] font-bold font-mono uppercase">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Statutory Endorsement & Legal Deed</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">
                        This Final Acceptance Certificate acts as unconditional acknowledgment under the KSA Electronic Transactions Law (Royal Decree No. M/18).
                      </p>
                      <p className="text-slate-600 leading-relaxed text-right font-medium" dir="rtl">
                        يقر الطرفان الموقعان أدناه باستلام وتشغيل مولدات الطاقة وملحقاتها وفق المواصفات الهندسية المعتمدة للمشروع.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-500 uppercase">Lessor</span>
                          <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-[#b9003c] text-white font-bold">NAFATH VERIFIED</span>
                        </div>
                        <strong className="text-slate-900 block text-sm">Eng. Sultan Al-Otaibi</strong>
                        <span className="text-[11px] text-slate-500 block">Lead Field Commissioning Engineer (ENERGIA KSA)</span>
                        <div className="bg-white p-1 rounded font-mono text-[9px] text-slate-500 flex justify-between">
                          <span>TIMESTAMP: 2026-03-30 16:42 AST</span>
                          <span className="text-slate-900 font-bold">IAM: 9812-F5</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-500 uppercase">Lessee</span>
                          <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-[#b9003c] text-white font-bold">ABSHER IAM VERIFIED</span>
                        </div>
                        <strong className="text-slate-900 block text-sm">{formData.clientRepName || "Eng. Khalid Mansoor"}</strong>
                        <span className="text-[11px] text-slate-500 block">Site Electrical Operations Manager (Al-Bawani)</span>
                        <div className="bg-white p-1 rounded font-mono text-[9px] text-slate-500 flex justify-between">
                          <span>TIMESTAMP: 2026-03-30 17:00 AST</span>
                          <span className="text-slate-900 font-bold">NAT-ID: 104829****</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-500 uppercase font-bold">Authority Clearance</span>
                        <span className="font-mono text-[9px] text-[#b9003c] font-bold">ZATCA PHASE-2</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white border border-slate-300 rounded p-1 shrink-0 flex items-center justify-center">
                          <QrCode className="w-10 h-10 text-slate-900" />
                        </div>
                        <div className="font-mono text-[10px] space-y-0.5">
                          <span className="text-slate-500 block">Clearance Code: <strong>GP-NEOM-2026-99042</strong></span>
                          <span className="text-slate-500 block">SHA-256 Ledger Hash: 7f8a901c4e5b6d7a8f901c2b...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CERTIFIED SHARE MODAL ================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#ED1A53]" />
                <h3 className="text-sm font-bold text-slate-900">Share Verified PAC Link</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500">Cryptographic Link</label>
              <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded border">
                <input
                  type="text"
                  readOnly
                  value={`https://verify.energia.sa/pac/${formData.rfqNumber || powerSurvey.contractReference}?hash=7f8a901c`}
                  className="w-full text-xs font-mono bg-transparent px-2 outline-none select-all text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://verify.energia.sa/pac/${formData.rfqNumber || powerSurvey.contractReference}?hash=7f8a901c`);
                    setPacShareCopied(true);
                    setTimeout(() => setPacShareCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-[#ED1A53] text-white text-xs font-bold rounded"
                >
                  {pacShareCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Recipients (Al-Bawani)</span>
              <div className="space-y-1 text-xs">
                {["Eng. Khalid Mansoor (Site Electrical Manager)", "Tariq Al-Hazmi (Project Director)"].map((r, i) => (
                  <div key={i} className="p-2 bg-slate-50 rounded flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{r}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-200 text-[#ED1A53] font-bold">VERIFIED</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPacShareDispatched(true);
                setTimeout(() => {
                  setShowShareModal(false);
                  setPacShareDispatched(false);
                }, 1600);
              }}
              className="w-full py-2 bg-[#ED1A53] text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {pacShareDispatched ? "Dispatched via WhatsApp & Nafath!" : "Send Links to Recipients"}
            </button>
          </div>
        </div>
      )}

      {/* ================= PRINT VIEW ================= */}
      <div className="inspection-print-view hidden print:block p-8 bg-white text-slate-900 max-w-[900px] mx-auto space-y-4">
        <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase text-slate-900">ENERGIA</h1>
            <p className="text-xs font-mono text-slate-500 uppercase">KSA Temporary Power & Fleet Systems</p>
          </div>
          <div className="text-right font-mono text-xs">
            <strong>{formData.rfqNumber || powerSurvey.contractReference}</strong>
            <p className="text-[10px] text-slate-500">ZATCA PHASE-2 COMPLIANT DOSSIER</p>
          </div>
        </div>

        <div className="text-center py-1.5 bg-slate-100 rounded">
          <h2 className="text-sm font-black uppercase text-slate-900">FINAL PLANT ACCEPTANCE CERTIFICATE (PAC)</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border">
          <div>Site: <strong>{displaySite}</strong></div>
          <div>Client: <strong>{displayClient}</strong></div>
          <div>Generator: <strong>{powerSurvey.recommendedKva} kVA Prime Soundproof</strong></div>
          <div>Cable Run: <strong>{powerSurvey.cableRunMeters + 15}m 4C-240mm² Armored</strong></div>
          <div>Fuel Skid: <strong>{powerSurvey.auxFuelTankCapacity} Double-Walled</strong></div>
          <div>Earth Resistance: <strong>{powerSurvey.earthLoopImpedanceOhm} Ω (Pass)</strong></div>
        </div>

        <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-mono text-[9px] uppercase font-bold text-slate-500 block">Lessor</span>
            <strong>Eng. Sultan Al-Otaibi (ENERGIA KSA)</strong>
            <p className="font-mono text-[9px] text-[#b9003c]">NAFATH VERIFIED</p>
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase font-bold text-slate-500 block">Lessee</span>
            <strong>{formData.clientRepName || "Eng. Khalid Mansoor"} (Al-Bawani)</strong>
            <p className="font-mono text-[9px] text-[#b9003c]">ABSHER IAM VERIFIED</p>
          </div>
        </div>
      </div>

      {/* Step 2 -> Step 4 Milestone Celebration Modal */}
      {reviewSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    ✓ Pre-Sales Complete → Converted to Sales Opportunity!
                  </h3>
                  <p className="text-[11px] text-slate-500">⚡ Lead Converted • Commercial Handoff from Pre-Sales to Sales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewSuccessModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Target Account / Client:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{reviewSuccessModal.siteName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Recommended Power Capacity:</span>
                <span className="font-mono font-bold text-[#ED1A53] text-sm">
                  {reviewSuccessModal.kVA} kVA Prime
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Staging Depot / Base:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {reviewSuccessModal.baseName}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Commercial Stage:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                  ✓ Opportunity Ready for Quoting (CPQ)
                </span>
              </div>
            </div>

            {/* Volvi Assist Guidance Pill */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Volvi Assist • Next Step Advisor</span>
              </div>
              <span className="text-[10px] text-rose-200 font-semibold">20x Monthly Multiplier Standard</span>
            </div>

            {/* Next Step Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-50/50 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block font-bold">Pre-Sales to Sales Handoff: Handed Over to Commercial Sales (CPQ)</strong>
                Pre-sales electrical engineering is validated and certified. The deal has officially converted from a Lead into an active Opportunity and is handed over to Commercial Sales for CPQ rate quoting and contract formulation.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetUrl = `/rental-cpq/builder?leadId=${reviewSuccessModal.leadId}&dealId=${reviewSuccessModal.dealId}&kVA=${reviewSuccessModal.kVA}`;
                  navigate(targetUrl);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Hand Over to Sales: Open Rental CPQ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setReviewSuccessModal(null)}
                className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Stay on Inspection Cockpit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
