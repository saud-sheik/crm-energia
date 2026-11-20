import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  Truck,
  FileText,
  ChevronRight,
  PlusCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  User,
  X,
  Sparkles,
  Bot
} from "lucide-react";
import { siteInspectionApi } from "../api/siteInspection";
import {
  getStatusStyle,
  getInspectionRag,
  SiteInspectionRecord,
  SiteInspectionGateResult,
  getAssignmentDisplay,
  APPROVER_ROLES,
} from "../lib/siteInspection";
import { SiteInspectionRequestModal } from "./SiteInspectionRequestModal";
import { useAuth } from "../context/AuthContext";
import { useVolviAssist } from "../context/VolviAssistContext";

export function useLeadSiteInspection(leadId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-site-inspection", leadId],
    queryFn: () => siteInspectionApi.getLeadSiteInspection(leadId!),
    enabled: Boolean(leadId),
  });

  const requestMutation = useMutation({
    mutationFn: (options?: any) => siteInspectionApi.requestInspection(leadId!, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-site-inspection", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });

  return {
    ...query,
    gate: query.data?.gate as SiteInspectionGateResult | undefined,
    inspection: query.data?.inspection as SiteInspectionRecord | null | undefined,
    requestInspection: requestMutation.mutateAsync,
    isRequesting: requestMutation.isPending,
  };
}

export function SiteInspectionCard({
  leadId,
  leadStatus,
}: {
  leadId: string;
  leadStatus?: string;
}) {
  const { user } = useAuth();
  const { triggerGuidance } = useVolviAssist();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<{
    inspectionId: string;
    siteArea?: string;
    assignedInspector?: string;
    inspectorEmail?: string;
  } | null>(null);
  const { gate, inspection, isLoading, isError, requestInspection, isRequesting } =
    useLeadSiteInspection(leadId);

  const userRole = (user?.role || "").toLowerCase();
  const isApprover = APPROVER_ROLES.includes(userRole);
  const isAssignedInspector =
    Boolean(inspection) &&
    userRole === "site_manager" &&
    (!inspection?.assignedToId || inspection.assignedToId === user?.id);

  const status = inspection?.status || gate?.status || "NOT_REQUESTED";
  const statusInfo = getStatusStyle(status);
  const assignmentDisplay = getAssignmentDisplay(inspection);

  const isGateLocked = gate ? !gate.allowed : status !== "APPROVED";

  const activeServices = inspection?.services?.filter((s) => s.isActive) || [];

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border-2 border-[#E5D4DE] dark:border-[#551938]/40 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(85,25,56,0.05)] space-y-3.5 relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-[#F0E4EC] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F8F4F6] text-[#551938] dark:bg-slate-800 dark:text-rose-300 flex items-center justify-center border border-[#E5D4DE] dark:border-slate-700">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#EEDFE8] text-[#551938] dark:bg-slate-800 dark:text-rose-300 border border-[#DECAD7]">
                  Pre-Sales
                </span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Site Inspection
                </h3>
                {inspection?.inspectionNumber && (
                  <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {inspection.inspectionNumber}
                  </span>
                )}
                {inspection?.priority && inspection.priority !== "NORMAL" && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      inspection.priority === "URGENT"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                        : "bg-face-field text-face-muted dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {inspection.priority}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-face-muted font-medium block">
                Required for Qualification
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.badgeBg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
              {assignmentDisplay?.headerStatusOverride || statusInfo.label}
            </span>
          </div>
        </div>

        {/* Lock Notice when gate is active & not approved */}
        {isGateLocked && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Lead Qualification Gate Locked
              </p>
              <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
                {gate?.message || "Requires site manager audit and supervisor approval."}
              </p>
            </div>
          </div>
        )}

        {/* Inspection Details if present */}
        {inspection ? (
          <div className="space-y-3 pt-1">
            {/* Assigned Site Inspector / Request & Acceptance State Block */}
            {assignmentDisplay && (
              <div
                className={`p-2.5 rounded-xl border flex items-start justify-between gap-2.5 ${
                  assignmentDisplay.state === "UNASSIGNED"
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
                    : assignmentDisplay.state === "DECLINED"
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                    : "bg-face-field dark:bg-slate-800/60 border-face-line dark:border-slate-800"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {assignmentDisplay.email || assignmentDisplay.name !== "Not assigned yet" ? (
                    <div className="w-8 h-8 rounded-full bg-face-green-light dark:bg-face-green-dark/40 text-face-green dark:text-face-green-mint font-bold text-xs flex items-center justify-center shrink-0 border border-face-green/20 dark:border-face-green-dark/60 mt-0.5">
                      {assignmentDisplay.initials || "SI"}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-face-muted dark:text-slate-400 block tracking-wider leading-none">
                      {assignmentDisplay.title}
                    </span>
                    <p className="text-xs font-bold text-face-ink dark:text-white truncate mt-0.5">
                      {assignmentDisplay.name}
                    </p>
                    {assignmentDisplay.email && (
                      <p className="text-[10px] text-face-muted dark:text-slate-400 truncate">
                        {assignmentDisplay.email}
                      </p>
                    )}
                    {assignmentDisplay.subline && (
                      <p className="text-[10px] text-face-muted dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{assignmentDisplay.subline}</span>
                        {assignmentDisplay.isOverdue && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[9px] font-black uppercase rounded">
                            Overdue
                          </span>
                        )}
                      </p>
                    )}
                    {assignmentDisplay.approverHint && isApprover && (
                      <p className="text-[10px] text-face-green dark:text-face-green-mint font-semibold mt-1">
                        {assignmentDisplay.approverHint}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    assignmentDisplay.pillVariant === "green"
                      ? "bg-face-green-light text-face-green dark:bg-face-green-dark/30 dark:text-face-green-mint border border-face-green/30 dark:border-face-green-dark"
                      : assignmentDisplay.pillVariant === "red"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {assignmentDisplay.pillText}
                </span>
              </div>
            )}

            {/* Stage B SLA RAG Countdown */}
            {(() => {
              const ragInfo = getInspectionRag(inspection);
              return (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${ragInfo.badgeBg} text-xs font-bold`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${ragInfo.dotColor}`} />
                    <span>{ragInfo.label}</span>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold">{ragInfo.countdown}</span>
                </div>
              );
            })()}

            {inspection.siteAreaName && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-face-ink dark:text-slate-300 bg-face-field dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-face-line dark:border-slate-800">
                <MapPin className="w-3.5 h-3.5 text-face-green shrink-0" />
                <span className="truncate">Area: {inspection.siteAreaName}</span>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-face-field dark:bg-slate-800/60 p-2.5 rounded-xl border border-face-line dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-face-muted block tracking-wider">
                  Base → Site
                </span>
                <p className="text-sm font-extrabold text-face-ink dark:text-white mt-0.5">
                  {inspection.baseToSiteStraightKm != null
                    ? `${inspection.baseToSiteStraightKm} km`
                    : "—"}
                </p>
                <span className="text-[9px] text-face-muted">
                  {inspection.baseName || "Base not set"}
                </span>
              </div>

              <div className="bg-face-field dark:bg-slate-800/60 p-2.5 rounded-xl border border-face-line dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-face-muted block tracking-wider">
                  Cycle Distance
                </span>
                <p className="text-sm font-extrabold text-face-ink dark:text-white mt-0.5">
                  {inspection.totalCycleKm != null ? `${inspection.totalCycleKm} km` : "—"}
                </p>
                <span className="text-[9px] text-face-muted">
                  {inspection.estFuelLitres != null
                    ? `~${inspection.estFuelLitres}L Diesel`
                    : "Est. Fuel"}
                </span>
              </div>
            </div>

            {/* Technical Survey Scopes */}
            <div>
              <span className="text-[10px] uppercase font-bold text-face-muted block mb-1.5 tracking-wider">
                Technical Survey Scope ({activeServices.length > 0 ? activeServices.length : 3})
              </span>
              {activeServices.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeServices.map((svc) => (
                    <span
                      key={svc.serviceType}
                      className="px-2 py-0.5 bg-rose-50 text-[#ED1A53] border border-rose-200 text-[10px] font-bold rounded-md"
                    >
                      {svc.serviceType} · {svc.distanceKm} km
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-rose-50 text-[#ED1A53] border border-rose-200 text-[10px] font-bold rounded-md">
                    DOL Motor Inrush Check
                  </span>
                  <span className="px-2 py-0.5 bg-rose-50 text-[#ED1A53] border border-rose-200 text-[10px] font-bold rounded-md">
                    Cable Run Distance
                  </span>
                  <span className="px-2 py-0.5 bg-rose-50 text-[#ED1A53] border border-rose-200 text-[10px] font-bold rounded-md">
                    Crane & Flatbed Access
                  </span>
                </div>
              )}
            </div>

            {/* Meta summary footer */}
            <div className="flex items-center justify-between text-[11px] text-face-muted pt-1 border-t border-face-line dark:border-slate-800">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-face-muted" />
                {inspection.attachments?.length || 0} attachment{inspection.attachments?.length !== 1 ? "s" : ""}
              </span>
              {!isAssignedInspector && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-face-muted dark:text-slate-400">
                  <Lock className="w-3 h-3 text-face-muted" />
                  Read-only
                </span>
              )}
            </div>

            {/* Link to form */}
            <Link
              to={`/site-inspections/${inspection.id}`}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#ED1A53] hover:bg-[#d81248] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <span>{isAssignedInspector ? "Open Inspection Portal" : "View Inspection (Read-only)"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Empty / Request CTA */
          <div className="space-y-3 pt-1">
            <p className="text-xs text-face-muted leading-relaxed">
              No technical site survey has been requested yet. Dispatch a Field Service Engineer to assess motor inrush surge, cable run distance, ground compaction, and crane offloading access before quoting.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isRequesting}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#ED1A53] hover:bg-[#d81248] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-[#ED1A53]/20 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isRequesting ? "Dispatching..." : "Dispatch Field Engineer for Site Survey"}</span>
            </button>
          </div>
        )}
      </div>

      <SiteInspectionRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (payload) => {
          const res = await requestInspection(payload);
          if (res?.id) {
            const inspectorName =
              res.assignedTo?.name ||
              (res.assignedTo as any)?.fullName ||
              "Eng. Tariq Al-Ghamdi (Field Operations)";
            const inspectorEmail = res.assignedTo?.email || "tariq.ghamdi@energia.com.sa";
            setDispatchedSuccess({
              inspectionId: res.id,
              siteArea: payload.siteAreaName || "Client Site Location",
              assignedInspector: inspectorName,
              inspectorEmail: inspectorEmail
            });
            triggerGuidance({
              stepNumber: 2,
              stageName: "Step 1 Completed • Field Survey Dispatched",
              message: `Survey Dispatched to ${inspectorName} (${payload.siteAreaName || "Client Site Location"})`,
              explanation: "Field Engineer will inspect site ground compaction (>=150 kPa), cable route distance, and DOL inrush headroom.",
              recommendedAction: "Open Site Survey Cockpit",
              actionLabel: "Open Site Survey Cockpit",
              actionPath: `/site-inspections/${res.id}`,
              technicalTip: "SEC Standard: Inrush multiplier 3.0x requires 250 kVA Prime generator minimum.",
              suggestedPrompt: "Recommend generator for 260 kW with 3x DOL motor inrush"
            });
          }
        }}
        isSubmitting={isRequesting}
      />

      {/* Step 1 -> Step 2 Milestone Pop-up */}
      {dispatchedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    ✓ Field Engineer Dispatched for Site Survey!
                  </h3>
                  <p className="text-[11px] text-slate-500">Technical Sizing &amp; Feasibility Order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchedSuccess(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Site Target Area:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{dispatchedSuccess.siteArea}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Inspection Reference:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  INS-{dispatchedSuccess.inspectionId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Assigned Field Inspector:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{dispatchedSuccess.assignedInspector}</span>
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Lifecycle Status:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                  ⏳ Dispatched to Field Engineering
                </span>
              </div>
            </div>

            {/* Volvi Assist Guidance Pill */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Volvi Assist • Next Step Advisor</span>
              </div>
              <span className="text-[10px] text-rose-200 font-semibold">Grounded in SEC Standards</span>
            </div>

            {/* Next Step Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-50/50 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white block font-bold">Next in Lifecycle: Step 2 (Technical Sizing Cockpit)</strong>
                Proceed to the Technical Sizing Cockpit to enter peak electrical load, motor starting inrush kW, cable run meters, and operations hub logistics.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/site-inspections/${dispatchedSuccess.inspectionId}`)}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Proceed to Step 2: Site Survey Cockpit</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDispatchedSuccess(null)}
                className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Stay on Lead View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
