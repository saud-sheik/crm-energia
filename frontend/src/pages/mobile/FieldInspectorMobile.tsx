import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  MessageSquare,
  Search,
  RefreshCw,
  Camera,
  Check,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Building2,
  FileText,
  User,
  Shield,
  Phone,
  Compass,
  Monitor,
  ExternalLink,
  Layers,
  Send,
  Calendar,
  AlertCircle,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { siteInspectionApi, MasterDataResponse } from "../../api/siteInspection";
import {
  saveOfflinePhoto,
  getOfflinePhotosForInspection,
  syncOfflinePhotos,
  OfflinePhotoRecord,
} from "../../lib/offlinePhotoQueue";
import {
  getStatusStyle,
  getInspectionRag,
  SiteInspectionRecord,
  SiteInspectionServiceItem,
  SiteInspectionAttachmentItem,
} from "../../lib/siteInspection";
import { useAuth } from "../../context/AuthContext";

type TabFilter = "today" | "pending" | "in_review" | "approved" | "all";

const DEFAULT_BASES = [
  { id: "11111111-1111-4111-a111-111111111111", code: "JUBAIL", name: "Jubail Operations Base", region: "Eastern Province", latitude: 27.0, longitude: 49.65 },
  { id: "22222222-2222-4222-a222-222222222222", code: "JAFURAH", name: "Jafurah Operations Base", region: "Eastern Province", latitude: 25.55, longitude: 49.85 },
  { id: "33333333-3333-4333-a333-333333333333", code: "YANBU", name: "Yanbu Operations Base", region: "Western Province", latitude: 24.09, longitude: 38.06 },
  { id: "44444444-4444-4444-a444-444444444444", code: "RIYADH", name: "Riyadh Operations Base", region: "Central Province", latitude: 24.71, longitude: 46.68 },
];

const DEFAULT_FACILITIES = [
  { id: "f1010000-0000-4000-a000-000000000001", serviceType: "SEWAGE", name: "Ras Tanura STP", lat: 26.65, lng: 50.15 },
  { id: "f1020000-0000-4000-a000-000000000002", serviceType: "SEWAGE", name: "Jubail Industrial Wastewater Treatment Plant", lat: 27.02, lng: 49.58 },
  { id: "f1030000-0000-4000-a000-000000000003", serviceType: "SEWAGE", name: "Yanbu Municipal Wastewater Facility", lat: 24.05, lng: 38.12 },
  { id: "f2010000-0000-4000-a000-000000000001", serviceType: "GENERAL", name: "Jubail Ind. Waste Landfill #4", lat: 27.08, lng: 49.52 },
  { id: "f2020000-0000-4000-a000-000000000002", serviceType: "GENERAL", name: "Dammam Municipal Landfill", lat: 26.35, lng: 49.98 },
  { id: "f2030000-0000-4000-a000-000000000003", serviceType: "GENERAL", name: "Yanbu Industrial Sanitary Landfill", lat: 23.98, lng: 38.22 },
  { id: "f3010000-0000-4000-a000-000000000001", serviceType: "HAZARDOUS", name: "Bee'ah/EDCO Hazmat Complex Jubail", lat: 26.96, lng: 49.61 },
  { id: "f3020000-0000-4000-a000-000000000002", serviceType: "HAZARDOUS", name: "SEPCO Environmental Services Yanbu", lat: 24.12, lng: 38.02 },
  { id: "f3030000-0000-4000-a000-000000000003", serviceType: "HAZARDOUS", name: "National Environmental Preservation Co (BEEA) Jubail", lat: 27.04, lng: 49.49 },
];

const PHOTO_TAGS = [
  "Gate / Access Point",
  "Waste Storage Area",
  "Hazard / Road Obstacle",
  "Facility Overview",
  "Terrain & Manholes",
  "Other Evidence"
];

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressed);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.82
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function FieldInspectorMobile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabFilter>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [bottomNav, setBottomNav] = useState<"duties" | "active" | "profile">("duties");

  // Decline Modal
  const [declineModalItem, setDeclineModalItem] = useState<SiteInspectionRecord | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Schedule Modal
  const [scheduleModalItem, setScheduleModalItem] = useState<SiteInspectionRecord | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  // Full Screen Mobile Survey Stepper State
  const [activeSurveyInspection, setActiveSurveyInspection] = useState<SiteInspectionRecord | null>(null);
  const [surveyStep, setSurveyStep] = useState<number>(1);
  const [surveyFormData, setSurveyFormData] = useState<Partial<SiteInspectionRecord>>({});
  const [surveyServices, setSurveyServices] = useState<SiteInspectionServiceItem[]>([]);
  const [surveyFeedback, setSurveyFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedPhotoTag, setSelectedPhotoTag] = useState<string>("Gate / Access Point");
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [completenessErrors, setCompletenessErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Network Online / Offline Detection
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSurveyFeedback({ text: "🟢 Network Restored: Online", type: "success" });
      setTimeout(() => setSurveyFeedback(null), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSurveyFeedback({ text: "🟠 Offline Mode: Edits saved locally on device", type: "error" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Voice Dictation (Speech-to-Text)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const toggleVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported on this browser.");
      return;
    }

    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        setSurveyFeedback({ text: "🎙️ Listening... Speak your observation now", type: "success" });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSurveyFormData((prev) => ({
            ...prev,
            observations: (prev.observations ? prev.observations + " " : "") + transcript,
          }));
          setSurveyFeedback({ text: `Recorded: "${transcript}"`, type: "success" });
          setTimeout(() => setSurveyFeedback(null), 3500);
        }
      };

      recognition.onerror = () => {
        setIsVoiceRecording(false);
        setSurveyFeedback({ text: "Could not capture voice. Please type notes.", type: "error" });
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
    } catch {
      setIsVoiceRecording(false);
    }
  };

  // Offline Photos Queue (IndexedDB)
  const [offlinePhotos, setOfflinePhotos] = useState<OfflinePhotoRecord[]>([]);
  const [isSyncingPhotos, setIsSyncingPhotos] = useState(false);

  const loadOfflinePhotos = async (id: string) => {
    try {
      const list = await getOfflinePhotosForInspection(id);
      setOfflinePhotos(list);
    } catch {
      setOfflinePhotos([]);
    }
  };

  const handleSyncOfflinePhotos = async () => {
    if (!activeSurveyInspection || !isOnline || isSyncingPhotos) return;
    setIsSyncingPhotos(true);
    setSurveyFeedback({ text: "Syncing offline photos to server...", type: "success" });

    try {
      const result = await syncOfflinePhotos(activeSurveyInspection.id, async (record) => {
        const formData = new FormData();
        formData.append("files", record.blob, record.fileName);
        const uploadedArr = await siteInspectionApi.uploadAttachments(activeSurveyInspection.id, formData);
        if (uploadedArr && uploadedArr.length > 0 && record.tag) {
          const newAtt = uploadedArr[0];
          try {
            await siteInspectionApi.updateAttachment(activeSurveyInspection.id, newAtt.id, {
              tag: record.tag,
              caption: `${record.tag} - Synced from offline queue`,
            });
          } catch {}
        }
      });

      setIsSyncingPhotos(false);
      await loadOfflinePhotos(activeSurveyInspection.id);
      const fresh = await siteInspectionApi.getInspection(activeSurveyInspection.id);
      setActiveSurveyInspection(fresh);

      if (result.syncedCount > 0) {
        setSurveyFeedback({
          text: `Synced ${result.syncedCount} offline photo(s) successfully!`,
          type: "success",
        });
      } else {
        setSurveyFeedback({ text: "All offline photos are synced.", type: "success" });
      }
      setTimeout(() => setSurveyFeedback(null), 3000);
    } catch (err: any) {
      setIsSyncingPhotos(false);
      setSurveyFeedback({ text: err.message || "Failed to sync photos", type: "error" });
    }
  };

  // Auto-persist local draft to localStorage whenever fields change
  useEffect(() => {
    if (activeSurveyInspection && activeSurveyInspection.id) {
      const draftKey = `si_local_draft_${activeSurveyInspection.id}`;
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            formData: surveyFormData,
            services: surveyServices,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {}
    }
  }, [surveyFormData, surveyServices, activeSurveyInspection]);

  // Fetch Inspections for Inspector
  const {
    data: inspections = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["site-inspections", "mine"],
    queryFn: () => siteInspectionApi.listInspections({ mine: true }),
    refetchInterval: 5000,
  });

  // Fetch Master Data
  const { data: masterData } = useQuery<MasterDataResponse>({
    queryKey: ["site-inspections-master"],
    queryFn: () => siteInspectionApi.getMasterData(),
  });

  const bases = masterData?.bases?.length ? masterData.bases : DEFAULT_BASES;
  const facilities = masterData?.facilities?.length ? masterData.facilities : DEFAULT_FACILITIES;

  // Active On-Site Inspection (if any is currently started)
  const currentlyOnSiteInspection = useMemo(() => {
    return inspections.find(
      (ins) => ins.startedAt && !["SUBMITTED", "APPROVED", "CANCELLED"].includes(ins.status)
    );
  }, [inspections]);

  // Tab Filtering
  const filteredInspections = useMemo(() => {
    return inspections.filter((ins) => {
      // Tab filter
      if (activeTab === "today") {
        if (["APPROVED", "CANCELLED"].includes(ins.status)) return false;
        if (ins.assignmentState === "DECLINED") return false;
      } else if (activeTab === "pending") {
        if (ins.assignmentState !== "ASSIGNED" && ins.assignmentState !== "PENDING_CONFIRMATION") return false;
      } else if (activeTab === "in_review") {
        if (ins.status !== "SUBMITTED") return false;
      } else if (activeTab === "approved") {
        if (ins.status !== "APPROVED") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (ins.inspectionNumber || "").toLowerCase();
        const client = (ins.clientOrganization || ins.lead?.company || "").toLowerCase();
        const site = (ins.siteName || ins.siteAreaName || "").toLowerCase();
        return num.includes(q) || client.includes(q) || site.includes(q);
      }
      return true;
    });
  }, [inspections, activeTab, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const pendingCount = inspections.filter(
      (i) => i.assignmentState === "ASSIGNED" || i.assignmentState === "PENDING_CONFIRMATION"
    ).length;
    const activeCount = inspections.filter(
      (i) => !["APPROVED", "CANCELLED", "SUBMITTED"].includes(i.status) && i.assignmentState !== "DECLINED"
    ).length;
    const inReviewCount = inspections.filter((i) => i.status === "SUBMITTED").length;
    const urgentCount = inspections.filter(
      (i) => i.priority === "URGENT" && !["APPROVED", "CANCELLED"].includes(i.status)
    ).length;
    return { pendingCount, activeCount, inReviewCount, urgentCount };
  }, [inspections]);

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (id: string) => siteInspectionApi.acceptInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      siteInspectionApi.declineInspection(id, reason),
    onSuccess: () => {
      setDeclineModalItem(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, scheduledVisitAt }: { id: string; scheduledVisitAt: string }) =>
      siteInspectionApi.scheduleVisit(id, scheduledVisitAt),
    onSuccess: () => {
      setScheduleModalItem(null);
      setScheduledDateTime("");
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
    },
  });

  const startVisitMutation = useMutation({
    mutationFn: (id: string) => siteInspectionApi.startVisit(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      // If inspector started visit, prompt opening the survey form
      openSurveyForm(updated);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      siteInspectionApi.saveDraft(id, data),
    onSuccess: () => {
      setSurveyFeedback({ text: "Draft saved locally & synced to server!", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      setTimeout(() => setSurveyFeedback(null), 3000);
    },
    onError: (err: any) => {
      setSurveyFeedback({ text: err.message || "Failed to save draft.", type: "error" });
    },
  });

  const submitSurveyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      siteInspectionApi.submitInspection(id, data),
    onSuccess: () => {
      setSurveyFeedback({ text: "Inspection successfully submitted for approval!", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      setTimeout(() => {
        setActiveSurveyInspection(null);
        setSurveyFeedback(null);
      }, 1500);
    },
    onError: (err: any) => {
      setSurveyFeedback({ text: err.message || "Failed to submit inspection.", type: "error" });
    },
  });

  // Open the Mobile Survey Stepper
  const openSurveyForm = (inspection: SiteInspectionRecord) => {
    setActiveSurveyInspection(inspection);
    setSurveyStep(1);
    setSurveyFeedback(null);
    setCompletenessErrors([]);
    loadOfflinePhotos(inspection.id);

    const draftKey = `si_local_draft_${inspection.id}`;
    let loadedFormData: Partial<SiteInspectionRecord> = {
      ...inspection,
      speedLimitKmh: inspection.speedLimitKmh || 80,
      auditAt: inspection.auditAt ? inspection.auditAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    };
    let loadedServices: SiteInspectionServiceItem[] | null = null;

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          loadedFormData = { ...loadedFormData, ...parsed.formData };
        }
        if (Array.isArray(parsed.services) && parsed.services.length > 0) {
          loadedServices = parsed.services;
        }
      }
    } catch {}

    setSurveyFormData(loadedFormData);

    const types: Array<"SEWAGE" | "GENERAL" | "HAZARDOUS"> = ["SEWAGE", "GENERAL", "HAZARDOUS"];
    const existing = loadedServices || inspection.services || [];
    const merged = types.map((st) => {
      const found = existing.find((s) => s.serviceType === st);
      return (
        found || {
          serviceType: st,
          isActive: false,
          facilityId: null,
          facilityName: "",
          distanceKm: 0,
          roadCondition: "" as const,
          wasteDescription: "",
          estimatedVolume: null,
          volumeUnit: "" as const,
          logisticsNote: "",
        }
      );
    });
    setSurveyServices(merged);
  };

  // Auto GPS Capture
  const handleAutoCaptureGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your mobile browser.");
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        setSurveyFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setSurveyFeedback({ text: `GPS coordinates captured (±${Math.round(pos.coords.accuracy)}m)`, type: "success" });
        setTimeout(() => setSurveyFeedback(null), 3000);
      },
      (err) => {
        setIsCapturingGps(false);
        alert(`Could not capture GPS: ${err.message}. Please check location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Photo Upload Handler with Client-Side Auto-Compression & Offline Queue
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeSurveyInspection) return;
    const file = e.target.files[0];

    try {
      setSurveyFeedback({ text: "Optimizing & compressing photo...", type: "success" });
      const compressed = await compressImageFile(file);

      // If offline, save straight to IndexedDB queue
      if (!isOnline) {
        await saveOfflinePhoto(activeSurveyInspection.id, compressed, compressed.name, selectedPhotoTag);
        await loadOfflinePhotos(activeSurveyInspection.id);
        setSurveyFeedback({
          text: "Offline Mode: Photo saved to device queue!",
          type: "success",
        });
        setTimeout(() => setSurveyFeedback(null), 3000);
        return;
      }

      // If online, try upload
      try {
        const formData = new FormData();
        formData.append("files", compressed);

        setSurveyFeedback({ text: "Uploading photo...", type: "success" });
        const uploadedArr = await siteInspectionApi.uploadAttachments(activeSurveyInspection.id, formData);
        if (uploadedArr && uploadedArr.length > 0) {
          // Update tag if possible
          const newAtt = uploadedArr[0];
          if (newAtt.id && selectedPhotoTag) {
            try {
              await siteInspectionApi.updateAttachment(activeSurveyInspection.id, newAtt.id, {
                tag: selectedPhotoTag,
                caption: `${selectedPhotoTag} - Captured on site`,
              });
            } catch {}
          }
          // Refetch inspection to update preview list
          const fresh = await siteInspectionApi.getInspection(activeSurveyInspection.id);
          setActiveSurveyInspection(fresh);
          setSurveyFeedback({ text: "Photo uploaded & tagged successfully!", type: "success" });
          setTimeout(() => setSurveyFeedback(null), 2500);
        }
      } catch {
        // Fallback to offline store if network fails mid-upload
        await saveOfflinePhoto(activeSurveyInspection.id, compressed, compressed.name, selectedPhotoTag);
        await loadOfflinePhotos(activeSurveyInspection.id);
        setSurveyFeedback({
          text: "Upload timed out: Photo safely queued in offline storage!",
          type: "success",
        });
        setTimeout(() => setSurveyFeedback(null), 3500);
      }
    } catch (err: any) {
      setSurveyFeedback({ text: err.message || "Failed to process photo", type: "error" });
    }
  };

  // Completeness & Pre-Submit Check
  const handleValidateAndSubmit = async () => {
    if (!activeSurveyInspection) return;
    // Check local required fields
    const errors: string[] = [];
    if (!surveyFormData.baseId) errors.push("Please select an Operations Base depot.");
    const activeSc = surveyServices.filter((s) => s.isActive);
    if (activeSc.length === 0) errors.push("At least one Service Scope (Sewage, General, or Hazardous) must be toggled on.");
    if (!surveyFormData.latitude || !surveyFormData.longitude) errors.push("Site GPS coordinates are required.");
    const totalPhotos = (activeSurveyInspection.attachments?.length || 0) + offlinePhotos.length;
    if (totalPhotos === 0) {
      errors.push("At least one on-site photo must be captured.");
    }

    if (errors.length > 0) {
      setCompletenessErrors(errors);
      setSurveyFeedback({ text: "Please resolve the required items above.", type: "error" });
      return;
    }

    setCompletenessErrors([]);
    // Submit
    const payload = {
      ...surveyFormData,
      services: surveyServices,
    };
    submitSurveyMutation.mutate({ id: activeSurveyInspection.id, data: payload });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-face-field dark:bg-slate-950 text-face-ink dark:text-slate-100 flex flex-col font-sans pb-24 select-none shadow-2xl border-x border-face-line dark:border-slate-800 relative">
        {/* ─── Top Mobile App Bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-face-line dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-face-green flex items-center justify-center text-white shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-face-ink dark:text-white">
                  Field Inspector
                </h1>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isOnline
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {isOnline ? "On Duty" : "Offline (Local)"}
                </span>
              </div>
              <p className="text-[11px] font-medium text-face-muted truncate max-w-[190px]">
                {user?.name || "Field Inspector"} · {user?.email || ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl text-face-muted hover:text-face-ink dark:hover:text-white bg-face-field dark:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh duties"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-face-green" : ""}`} />
            </button>
            <Link
              to="/site-inspections"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-face-green-light dark:bg-face-green-dark/40 text-face-green dark:text-face-green-mint transition-colors"
              title="Switch to Desktop CRM"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Desktop</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-2.5 relative">
          <Search className="w-4 h-4 text-face-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inspection #, client, area..."
            className="w-full pl-9 pr-3 py-1.5 bg-face-field dark:bg-slate-800/80 border border-face-line dark:border-slate-700/80 rounded-xl text-xs font-medium text-face-ink dark:text-white placeholder-face-muted focus:outline-hidden focus:ring-2 focus:ring-face-green/20 focus:border-face-green"
          />
        </div>
      </header>

      {/* ─── Active On-Site Banner (If visit in progress) ────────────────────────── */}
      {currentlyOnSiteInspection && !activeSurveyInspection && (
        <div className="mx-4 mt-3 p-3.5 bg-emerald-700 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-200 block">
                Active On-Site Visit
              </span>
              <h3 className="text-xs font-extrabold truncate">
                {currentlyOnSiteInspection.clientOrganization || currentlyOnSiteInspection.inspectionNumber}
              </h3>
            </div>
          </div>
          <button
            onClick={() => openSurveyForm(currentlyOnSiteInspection)}
            className="px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>Resume</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Main Content Views ──────────────────────────────────────────────── */}
      {bottomNav === "duties" && (
        <main className="px-4 py-3 space-y-3">
          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setActiveTab("today")}
              className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                activeTab === "today"
                  ? "bg-face-green text-white border-face-green shadow-xs"
                  : "bg-white dark:bg-slate-900 border-face-line dark:border-slate-800 text-face-muted"
              }`}
            >
              <span className="text-[10px] font-bold block uppercase tracking-wider">Today</span>
              <span className="text-base font-black leading-tight block">{stats.activeCount}</span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-face-line dark:border-slate-800 text-face-muted"
              }`}
            >
              <span className="text-[10px] font-bold block uppercase tracking-wider">Pending</span>
              <span className="text-base font-black leading-tight block">{stats.pendingCount}</span>
            </button>

            <button
              onClick={() => setActiveTab("in_review")}
              className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                activeTab === "in_review"
                  ? "bg-face-blue text-white border-face-blue shadow-xs"
                  : "bg-white dark:bg-slate-900 border-face-line dark:border-slate-800 text-face-muted"
              }`}
            >
              <span className="text-[10px] font-bold block uppercase tracking-wider">In Review</span>
              <span className="text-base font-black leading-tight block">{stats.inReviewCount}</span>
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                activeTab === "approved"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-face-line dark:border-slate-800 text-face-muted"
              }`}
            >
              <span className="text-[10px] font-bold block uppercase tracking-wider">Done</span>
              <span className="text-base font-black leading-tight block">
                {inspections.filter((i) => i.status === "APPROVED").length}
              </span>
            </button>
          </div>

          {/* Duties Card List */}
          {isLoading ? (
            <div className="py-16 text-center text-xs text-face-muted">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-face-green" />
              Loading assigned duties...
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-face-line dark:border-slate-800 p-6 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-face-field dark:bg-slate-800 text-face-muted flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-black text-face-ink dark:text-white">All caught up!</h3>
              <p className="text-xs text-face-muted max-w-xs mx-auto">
                No inspections currently pending in this view.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInspections.map((ins) => {
                const statusInfo = getStatusStyle(ins.status);
                const rag = getInspectionRag(ins);
                const isPendingAccept =
                  ins.assignmentState === "ASSIGNED" || ins.assignmentState === "PENDING_CONFIRMATION";
                const isVisitStarted = Boolean(ins.startedAt);
                const activeScopes = (ins.services || []).filter((s) => s.isActive);

                return (
                  <div
                    key={ins.id}
                    className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 shadow-[0_2px_12px_rgba(40,50,120,0.05)] space-y-3"
                  >
                    {/* Card Header: Inspection #, Priority, Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-face-green dark:text-face-green-mint">
                          {ins.inspectionNumber}
                        </span>
                        {ins.priority && ins.priority !== "NORMAL" && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              ins.priority === "URGENT"
                                ? "bg-face-red-light text-face-red dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-face-field text-face-muted dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {ins.priority}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Client & Site Info */}
                    <div>
                      <h2 className="text-sm font-black text-face-ink dark:text-white line-clamp-1">
                        {ins.clientOrganization || ins.lead?.company || "Unnamed Client"}
                      </h2>
                      <div className="flex items-center gap-1 text-xs text-face-muted mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-face-green shrink-0" />
                        <span className="truncate">{ins.siteAreaName || ins.siteAddress || "Site location not set"}</span>
                      </div>
                    </div>

                    {/* SLA Timer Chip */}
                    <div className={`flex items-center justify-between px-2.5 py-1 rounded-xl border ${rag.badgeBg} text-[11px] font-bold`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${rag.dotColor}`} />
                        <span>{rag.label}</span>
                      </div>
                      <span className="font-mono font-black">{rag.countdown}</span>
                    </div>

                    {/* Active Services Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeScopes.length > 0 ? (
                        activeScopes.map((s) => (
                          <span
                            key={s.serviceType}
                            className="px-2 py-0.5 bg-face-green-light dark:bg-face-green-dark/40 text-face-green-dark dark:text-face-green-mint border border-face-green/20 text-[10px] font-extrabold rounded-md"
                          >
                            {s.serviceType}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-face-muted italic">No service scope selected</span>
                      )}
                    </div>

                    {/* Quick Action Navigation / WhatsApp Buttons */}
                    <div className="pt-2 border-t border-face-line dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* 1-Tap Google Maps Navigation */}
                        {ins.latitude != null && ins.longitude != null ? (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${ins.latitude},${ins.longitude}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl transition-all shadow-xs"
                            title="Navigate in Google Maps"
                          >
                            <Navigation className="w-4 h-4" />
                          </a>
                        ) : null}

                        {/* 1-Tap WhatsApp Contact */}
                        {ins.clientRepPhone ? (
                          <a
                            href={`https://wa.me/${ins.clientRepPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hello ${ins.clientRepName || "Client"}, I am the Nexus site inspector assigned for inspection ${ins.inspectionNumber}. Could you please share your site gate number or WhatsApp live location pin?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all shadow-xs"
                            title="Chat with Client on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        ) : null}
                      </div>

                      {/* Primary Duty Action Button */}
                      <div className="flex items-center gap-2">
                        {isPendingAccept ? (
                          <>
                            <button
                              onClick={() => setDeclineModalItem(ins)}
                              className="px-3 py-1.5 rounded-xl border border-face-red/40 text-face-red bg-face-red-light text-xs font-bold cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => acceptMutation.mutate(ins.id)}
                              disabled={acceptMutation.isPending}
                              className="px-3.5 py-1.5 rounded-xl bg-face-green hover:bg-face-green-dark text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              {acceptMutation.isPending ? "Accepting..." : "Accept"}
                            </button>
                          </>
                        ) : !ins.scheduledVisitAt ? (
                          <button
                            onClick={() => {
                              setScheduleModalItem(ins);
                              setScheduledDateTime(new Date().toISOString().slice(0, 16));
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-face-green hover:bg-face-green-dark text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Schedule</span>
                          </button>
                        ) : !isVisitStarted ? (
                          <button
                            onClick={() => startVisitMutation.mutate(ins.id)}
                            disabled={startVisitMutation.isPending}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Gate Check-In</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openSurveyForm(ins)}
                            className="px-3.5 py-1.5 rounded-xl bg-face-green hover:bg-face-green-dark text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Fill Survey</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ─── Profile & Shift Tab ────────────────────────────────────────────── */}
      {bottomNav === "profile" && (
        <main className="px-4 py-4 space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-face-green flex items-center justify-center text-white font-black text-lg">
                {user?.name?.slice(0, 2).toUpperCase() || "FI"}
              </div>
              <div>
                <h3 className="text-base font-black text-face-ink dark:text-white">{user?.name}</h3>
                <p className="text-xs text-face-muted">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Role: Field Site Inspector
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-face-line dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-face-field dark:bg-slate-800/60 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-face-muted block">Status</span>
                <span className="font-extrabold text-emerald-600 block mt-0.5">🟢 Active On Duty</span>
              </div>
              <div className="bg-face-field dark:bg-slate-800/60 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-face-muted block">Base Depot</span>
                <span className="font-extrabold text-face-ink dark:text-white block mt-0.5">
                  {bases[0]?.name || "Operations Base"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-2 text-xs">
            <h4 className="font-black text-face-ink dark:text-white uppercase tracking-wider text-[11px]">
              Offline Field Capabilities
            </h4>
            <div className="flex items-center justify-between p-2 rounded-xl bg-face-field dark:bg-slate-800">
              <span className="font-bold text-face-muted">Local Inspection Drafts</span>
              <span className="font-mono font-bold text-emerald-600">Cached (Ready)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-face-field dark:bg-slate-800">
              <span className="font-bold text-face-muted">Camera Hardware Access</span>
              <span className="font-mono font-bold text-emerald-600">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-face-field dark:bg-slate-800">
              <span className="font-bold text-face-muted">GPS Stamping</span>
              <span className="font-mono font-bold text-emerald-600">Active</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/site-inspections")}
            className="w-full py-3 bg-face-field hover:bg-face-line dark:bg-slate-800 text-face-ink dark:text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Monitor className="w-4 h-4" />
            <span>Switch to Desktop CRM Workspace</span>
          </button>
        </main>
      )}

      {/* ─── Bottom Mobile Navigation Bar ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-face-line dark:border-slate-800 py-1.5 px-6 flex items-center justify-around shadow-lg">
        <button
          onClick={() => {
            setBottomNav("duties");
            setActiveSurveyInspection(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            bottomNav === "duties" && !activeSurveyInspection
              ? "text-face-green font-black"
              : "text-face-muted font-medium hover:text-face-ink"
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Duties</span>
        </button>

        <button
          onClick={() => {
            if (currentlyOnSiteInspection) {
              openSurveyForm(currentlyOnSiteInspection);
            } else {
              alert("No visit is currently in progress. Start a visit from your duties list.");
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            currentlyOnSiteInspection || activeSurveyInspection
              ? "text-emerald-600 font-black"
              : "text-face-muted font-medium opacity-60"
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">On-Site</span>
        </button>

        <button
          onClick={() => {
            setBottomNav("profile");
            setActiveSurveyInspection(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            bottomNav === "profile"
              ? "text-face-green font-black"
              : "text-face-muted font-medium hover:text-face-ink"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </nav>

      {/* ─── Decline Reason Modal ────────────────────────────────────────────── */}
      {declineModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-face-ink dark:text-white">
              Decline Inspection: {declineModalItem.inspectionNumber}
            </h3>
            <p className="text-xs text-face-muted">
              Please state why you are unable to perform this survey (e.g. outside zone, vehicle maintenance, capacity):
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Mandatory decline reason..."
              rows={3}
              className="w-full p-2.5 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs text-face-ink dark:text-white focus:outline-hidden"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeclineModalItem(null)}
                className="px-3 py-1.5 text-xs font-bold text-face-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  declineMutation.mutate({ id: declineModalItem.id, reason: declineReason })
                }
                disabled={!declineReason.trim() || declineMutation.isPending}
                className="px-4 py-1.5 bg-face-red text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {declineMutation.isPending ? "Declining..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Schedule Visit Modal ────────────────────────────────────────────── */}
      {scheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-face-ink dark:text-white">
              Schedule Visit: {scheduleModalItem.inspectionNumber}
            </h3>
            <p className="text-xs text-face-muted">
              Select the planned date and time for arriving at the client plant/site:
            </p>
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full p-2.5 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white focus:outline-hidden"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setScheduleModalItem(null)}
                className="px-3 py-1.5 text-xs font-bold text-face-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  scheduleMutation.mutate({
                    id: scheduleModalItem.id,
                    scheduledVisitAt: new Date(scheduledDateTime).toISOString(),
                  })
                }
                disabled={!scheduledDateTime || scheduleMutation.isPending}
                className="px-4 py-1.5 bg-face-green text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {scheduleMutation.isPending ? "Saving..." : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full-Screen Mobile Survey Stepper Modal ─────────────────────────── */}
      {activeSurveyInspection && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-center animate-fade-in overflow-hidden">
          <div className="w-full max-w-md h-full bg-face-field dark:bg-slate-950 flex flex-col shadow-2xl overflow-hidden">
          {/* Top Wizard Bar */}
          <div className="bg-white dark:bg-slate-900 border-b border-face-line dark:border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setActiveSurveyInspection(null)}
              className="p-1 rounded-xl text-face-muted hover:text-face-ink dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="font-mono text-xs font-black text-face-green dark:text-face-green-mint block">
                {activeSurveyInspection.inspectionNumber}
              </span>
              <span className="text-[11px] font-bold text-face-muted">
                Step {surveyStep} of 4:{" "}
                {surveyStep === 1
                  ? "Location & Base"
                  : surveyStep === 2
                  ? "Mobilization Route"
                  : surveyStep === 3
                  ? "Service Scopes"
                  : "Photos & Submit"}
              </span>
            </div>
            <button
              onClick={() =>
                saveDraftMutation.mutate({
                  id: activeSurveyInspection.id,
                  data: { ...surveyFormData, services: surveyServices },
                })
              }
              className="text-xs font-bold text-face-green dark:text-face-green-mint cursor-pointer"
            >
              Save Draft
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="h-1 bg-face-line dark:bg-slate-800 w-full shrink-0">
            <div
              className="h-full bg-face-green transition-all duration-300"
              style={{ width: `${(surveyStep / 4) * 100}%` }}
            />
          </div>

          {/* Alert feedback pill */}
          {surveyFeedback && (
            <div
              className={`px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 ${
                surveyFeedback.type === "success"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {surveyFeedback.text}
            </div>
          )}

          {/* Stepper Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── STEP 1: Site & Location ─────────────────── */}
            {surveyStep === 1 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-face-ink dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-face-green" />
                    <span>Site Location & Gate Coordinates</span>
                  </h3>

                  {/* GPS Auto-Capture Button */}
                  <button
                    type="button"
                    onClick={handleAutoCaptureGps}
                    disabled={isCapturingGps}
                    className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Compass className={`w-4 h-4 ${isCapturingGps ? "animate-spin" : ""}`} />
                    <span>{isCapturingGps ? "Capturing GPS Pin..." : "Capture Current GPS Pin"}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={surveyFormData.latitude ?? ""}
                        onChange={(e) =>
                          setSurveyFormData((p) => ({ ...p, latitude: e.target.value ? Number(e.target.value) : null }))
                        }
                        placeholder="e.g. 27.01234"
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-face-ink dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={surveyFormData.longitude ?? ""}
                        onChange={(e) =>
                          setSurveyFormData((p) => ({ ...p, longitude: e.target.value ? Number(e.target.value) : null }))
                        }
                        placeholder="e.g. 49.65432"
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-face-ink dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-face-muted uppercase">Area / Industrial Zone</label>
                    <input
                      type="text"
                      value={surveyFormData.siteAreaName ?? ""}
                      onChange={(e) => setSurveyFormData((p) => ({ ...p, siteAreaName: e.target.value }))}
                      placeholder="e.g. Jubail Support Industrial Area #2"
                      className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-face-muted uppercase">Site Physical Address</label>
                    <input
                      type="text"
                      value={surveyFormData.siteAddress ?? ""}
                      onChange={(e) => setSurveyFormData((p) => ({ ...p, siteAddress: e.target.value }))}
                      placeholder="Street, Gate #, Plant entrance"
                      className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                    />
                  </div>
                </div>

                {/* Client Contact Rep */}
                <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-face-ink dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-face-green" />
                    <span>Client Plant Contact</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Contact Name</label>
                      <input
                        type="text"
                        value={surveyFormData.clientRepName ?? ""}
                        onChange={(e) => setSurveyFormData((p) => ({ ...p, clientRepName: e.target.value }))}
                        placeholder="Client engineer name"
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Phone (WhatsApp)</label>
                      <input
                        type="text"
                        value={surveyFormData.clientRepPhone ?? ""}
                        onChange={(e) => setSurveyFormData((p) => ({ ...p, clientRepPhone: e.target.value }))}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Mobilization & Route ────────────── */}
            {surveyStep === 2 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-face-ink dark:text-white flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-face-green" />
                    <span>Dispatch Base & Transit Route</span>
                  </h3>

                  <div>
                    <label className="text-[10px] font-bold text-face-muted uppercase">Dispatch Depot Base</label>
                    <select
                      value={surveyFormData.baseId ?? ""}
                      onChange={(e) => {
                        const b = bases.find((x) => x.id === e.target.value);
                        setSurveyFormData((p) => ({
                          ...p,
                          baseId: e.target.value,
                          baseName: b?.name || "",
                        }));
                      }}
                      className="w-full p-2.5 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                    >
                      <option value="">Select Base...</option>
                      {bases.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Base to Site (KM)</label>
                      <input
                        type="number"
                        value={surveyFormData.baseToSiteStraightKm ?? 0}
                        onChange={(e) =>
                          setSurveyFormData((p) => ({
                            ...p,
                            baseToSiteStraightKm: Number(e.target.value),
                            totalCycleKm: Number(e.target.value) * 2,
                            estFuelLitres: Math.round(Number(e.target.value) * 2 * 0.35),
                          }))
                        }
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-face-ink dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-face-muted uppercase">Cycle (Roundtrip KM)</label>
                      <input
                        type="number"
                        value={surveyFormData.totalCycleKm ?? 0}
                        onChange={(e) =>
                          setSurveyFormData((p) => ({
                            ...p,
                            totalCycleKm: Number(e.target.value),
                            estFuelLitres: Math.round(Number(e.target.value) * 0.35),
                          }))
                        }
                        className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-face-ink dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-face-muted uppercase">Route & Access Road Conditions</label>
                    <textarea
                      value={surveyFormData.mobilizationRoute ?? ""}
                      onChange={(e) => setSurveyFormData((p) => ({ ...p, mobilizationRoute: e.target.value }))}
                      placeholder="e.g. Highway 613, security checkpoint at Gate #3 requires visitor pass..."
                      rows={2}
                      className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Service Scope Toggles & Volumes ─── */}
            {surveyStep === 3 && (
              <div className="space-y-3">
                {surveyServices.map((svc, idx) => (
                  <div
                    key={svc.serviceType}
                    className={`border rounded-3xl p-4 transition-all ${
                      svc.isActive
                        ? "bg-white dark:bg-slate-900 border-face-green shadow-xs"
                        : "bg-face-field/60 dark:bg-slate-900/40 border-face-line dark:border-slate-800 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            svc.serviceType === "SEWAGE"
                              ? "bg-blue-500"
                              : svc.serviceType === "GENERAL"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="text-xs font-black uppercase text-face-ink dark:text-white">
                          {svc.serviceType} WASTE
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={svc.isActive}
                          onChange={(e) => {
                            const updated = [...surveyServices];
                            updated[idx] = { ...svc, isActive: e.target.checked };
                            setSurveyServices(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-face-green"></div>
                      </label>
                    </div>

                    {svc.isActive && (
                      <div className="mt-3 pt-3 border-t border-face-line dark:border-slate-800 space-y-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-face-muted uppercase">Disposal Facility</label>
                          <select
                            value={svc.facilityId ?? ""}
                            onChange={(e) => {
                              const f = facilities.find((x) => x.id === e.target.value);
                              const updated = [...surveyServices];
                              updated[idx] = {
                                ...svc,
                                facilityId: e.target.value,
                                facilityName: f?.name || "",
                              };
                              setSurveyServices(updated);
                            }}
                            className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                          >
                            <option value="">Select Treatment Facility...</option>
                            {facilities
                              .filter((f) => f.serviceType === svc.serviceType)
                              .map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-face-muted uppercase">Est. Volume</label>
                            <input
                              type="number"
                              value={svc.estimatedVolume ?? ""}
                              onChange={(e) => {
                                const updated = [...surveyServices];
                                updated[idx] = {
                                  ...svc,
                                  estimatedVolume: e.target.value ? Number(e.target.value) : null,
                                };
                                setSurveyServices(updated);
                              }}
                              placeholder="e.g. 50"
                              className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-face-ink dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-face-muted uppercase">Unit</label>
                            <select
                              value={svc.volumeUnit ?? ""}
                              onChange={(e) => {
                                const updated = [...surveyServices];
                                updated[idx] = { ...svc, volumeUnit: e.target.value };
                                setSurveyServices(updated);
                              }}
                              className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                            >
                              <option value="m3">m³</option>
                              <option value="L">Liters</option>
                              <option value="ton">Tons</option>
                              <option value="Tanker Loads">Tanker Loads</option>
                              <option value="Compactor Bins">Compactor Bins</option>
                              <option value="IBC Totes">IBC Totes</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-face-muted uppercase">Waste Description</label>
                          <input
                            type="text"
                            value={svc.wasteDescription ?? ""}
                            onChange={(e) => {
                              const updated = [...surveyServices];
                              updated[idx] = { ...svc, wasteDescription: e.target.value };
                              setSurveyServices(updated);
                            }}
                            placeholder="Description of waste stream"
                            className="w-full p-2 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 4: Camera Photos & Submit ─────────── */}
            {surveyStep === 4 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-face-ink dark:text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-face-green" />
                    <span>On-Site Photo Evidence</span>
                  </h3>

                  {/* Tag Selector for Next Photo */}
                  <div>
                    <label className="text-[10px] font-bold text-face-muted uppercase block mb-1">
                      Category Tag for Photo
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {PHOTO_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedPhotoTag(tag)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 cursor-pointer transition-all ${
                            selectedPhotoTag === tag
                              ? "bg-face-green text-white"
                              : "bg-face-field dark:bg-slate-800 text-face-muted"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hidden camera input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {/* Trigger Photo Snap */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-face-green hover:bg-face-green-dark text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo with Camera</span>
                  </button>

                  {/* Offline Queue Sync Indicator */}
                  {offlinePhotos.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs">
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        📦 {offlinePhotos.length} photo(s) stored offline
                      </span>
                      <button
                        type="button"
                        onClick={handleSyncOfflinePhotos}
                        disabled={!isOnline || isSyncingPhotos}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingPhotos ? "animate-spin" : ""}`} />
                        <span>{isSyncingPhotos ? "Syncing..." : "Sync Photos"}</span>
                      </button>
                    </div>
                  )}

                  {/* Photos Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(activeSurveyInspection.attachments || []).map((att) => (
                      <div
                        key={att.id}
                        className="relative rounded-xl border border-face-line dark:border-slate-800 bg-face-field dark:bg-slate-800 overflow-hidden aspect-square flex flex-col justify-end p-1.5 text-[9px] font-bold text-white shadow-2xs"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <span className="relative z-20 truncate">{att.tag || att.fileName}</span>
                      </div>
                    ))}
                    {offlinePhotos.map((off) => (
                      <div
                        key={off.id}
                        className="relative rounded-xl border-2 border-dashed border-amber-400 bg-amber-900/60 overflow-hidden aspect-square flex flex-col justify-between p-1.5 text-[9px] font-bold text-white shadow-2xs"
                      >
                        <span className="px-1 py-0.2 rounded bg-amber-500 text-black font-black uppercase text-[8px] w-fit">
                          Offline
                        </span>
                        <span className="truncate">{off.tag || off.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field Notes Textarea with Voice Dictation */}
                <div className="bg-white dark:bg-slate-900 border border-face-line dark:border-slate-800 rounded-3xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-face-ink dark:text-white">
                      Field Observations & Remarks
                    </label>
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                        isVoiceRecording
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-face-green-light text-face-green dark:bg-face-green-dark/40 dark:text-face-green-mint"
                      }`}
                    >
                      {isVoiceRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isVoiceRecording ? "Stop Dictation" : "Voice Dictation"}</span>
                    </button>
                  </div>
                  <textarea
                    value={surveyFormData.observations ?? ""}
                    onChange={(e) => setSurveyFormData((p) => ({ ...p, observations: e.target.value }))}
                    placeholder="Type or tap Voice Dictation to speak observations, access hurdles, gate pass details..."
                    rows={3}
                    className="w-full p-2.5 bg-face-field dark:bg-slate-800 border border-face-line dark:border-slate-700 rounded-xl text-xs font-bold text-face-ink dark:text-white focus:outline-hidden"
                  />
                </div>

                {/* Validation Checklist / Errors */}
                {completenessErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-black">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Required items before submission:</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                      {completenessErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stepper Bottom Controls */}
          <div className="bg-white dark:bg-slate-900 border-t border-face-line dark:border-slate-800 p-3 flex items-center justify-between shrink-0">
            {surveyStep > 1 ? (
              <button
                type="button"
                onClick={() => setSurveyStep((p) => p - 1)}
                className="px-4 py-2 bg-face-field dark:bg-slate-800 text-face-ink dark:text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {surveyStep < 4 ? (
              <button
                type="button"
                onClick={() => setSurveyStep((p) => p + 1)}
                className="px-5 py-2 bg-face-green hover:bg-face-green-dark text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer shadow-xs ml-auto"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleValidateAndSubmit}
                disabled={submitSurveyMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitSurveyMutation.isPending ? "Submitting..." : "Submit Inspection"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  </div>
  );
}
