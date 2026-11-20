import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  RefreshCw,
  Package,
  Layers,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  AlertTriangle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { apiClient } from "../lib/apiClient";

export interface CopilotData {
  winProbability?: number | null | string;
  winProbabilitySubtext?: string;
  recommendedAction?: string;
  riskIndicator?: {
    level?: "LOW" | "MEDIUM" | "HIGH" | "INFO";
    label: string;
    reason?: string;
  } | null;
}

interface AiRequirementSummaryCardProps {
  type: "lead" | "opportunity";
  id: string;
  onActionClick?: (actionText: string) => void;
  className?: string;
  copilot?: CopilotData;
}

export const AiRequirementSummaryCard: React.FC<AiRequirementSummaryCardProps> = ({
  type,
  id,
  onActionClick,
  className = "",
  copilot
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const endpoint = type === "lead" ? `/api/v1/leads/${id}/ai-summary` : `/api/v1/opportunities/${id}/ai-summary`;

  const { data, isLoading, isFetching, refetch, error } = useQuery<any>({
    queryKey: ["ai-requirement-summary", type, id],
    queryFn: async () => {
      return await apiClient.get<any>(endpoint);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[20px] p-4 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.06)] flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
        <Sparkles className="w-4 h-4 text-[#ED1A53] animate-spin" />
        <span className="font-semibold">Synthesizing customer commercial scope &amp; requirements...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const deliverables: string[] = data.primaryDeliverables || [];
  const specs: string[] = data.technicalSpecs || [];
  const intentScore: number | null = typeof data.intentScore === "number" ? data.intentScore : null;
  const budgetBenchmark = data.budgetAndCommercials || data.budgetBenchmark || "Budget not specified";
  const deliveryTimeline = data.timelineAndConstraints || data.deliveryTimeline || "Standard 30-day quote validity";
  const specTier = specs[0] || "Standard Commercial Tier Specifications";
  const scopeVolume = deliverables[0] || "Commercial Quotation Scope";
  const rawQuote = data.coreRequest || data.rawSummaryText || "";

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] p-4 sm:p-5 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.07)] text-slate-900 dark:text-slate-100 relative overflow-hidden transition-all duration-200 ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ED1A53] dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/70 dark:border-rose-900/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Customer Scope &amp; AI Synthesis
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-[#ED1A53] dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 px-2 py-0.5 rounded-full font-mono">
              AI Extraction
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Buying Intent Badge */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <TrendingUp className="w-3 h-3 text-[#ED1A53]" />
            {intentScore !== null ? (
              <span className="text-[11px]">
                Intent: <strong className="font-extrabold text-[#ED1A53]">{intentScore}%</strong>{" "}
                <span className="text-slate-400 font-normal">
                  {intentScore >= 75 ? "(High)" : intentScore >= 50 ? "(Moderate)" : "(Evaluating)"}
                </span>
              </span>
            ) : (
              <span className="text-[11px]">Scope: <strong className="text-emerald-600 font-bold">Synthesized</strong></span>
            )}
          </div>

          {/* Win Probability Header Badge (if copilot data provided) */}
          {copilot?.winProbability !== undefined && copilot.winProbability !== null && copilot.winProbability !== "—" && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200">
              <span className="text-[10px] text-slate-400 font-semibold">Win Prob:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">
                {typeof copilot.winProbability === "number" ? `${copilot.winProbability}%` : copilot.winProbability}
              </span>
            </div>
          )}

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
            title={isExpanded ? "Collapse full AI scope" : "Expand full AI scope & client quote"}
          >
            <span>{isExpanded ? "Less Info" : "Full Specs"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4-Column High-Density Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {/* Metric 1: Scope */}
        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
            <Package className="w-3 h-3 text-[#ED1A53]" /> Scope &amp; Deliverables
          </span>
          <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={scopeVolume}>
            {scopeVolume}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {deliverables[1] || (deliverables.length > 0 ? "Standard deliverables apply" : "Deliverables verified")}
          </p>
        </div>

        {/* Metric 2: Specification */}
        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
            <Layers className="w-3 h-3 text-[#ED1A53]" /> Specification Tier
          </span>
          <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={specTier}>
            {specTier}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {specs[1] || "Standard industrial spec"}
          </p>
        </div>

        {/* Metric 3: Timeline */}
        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-[#ED1A53]" /> Timeline &amp; Delivery
          </span>
          <div className="font-bold text-xs text-slate-900 dark:text-white truncate" title={deliveryTimeline}>
            {deliveryTimeline}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            Standard turnaround
          </p>
        </div>

        {/* Metric 4: Budget */}
        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
            <DollarSign className="w-3 h-3 text-[#ED1A53]" /> Budget / Target
          </span>
          <div className="font-bold text-xs text-slate-900 dark:text-white truncate font-mono" title={budgetBenchmark}>
            {budgetBenchmark}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            Extracted from deal details
          </p>
        </div>
      </div>

      {/* Expanded Accordion: Client Raw Request Quote & Full Technical Specs */}
      {isExpanded && (
        <div className="mb-3 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
          {rawQuote && (
            <div className="bg-rose-50/30 dark:bg-rose-950/20 border-l-2 border-[#ED1A53] pl-3 py-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Client Request Snippet:
              </span>
              <p className="text-slate-700 dark:text-slate-300 italic font-medium">
                &ldquo;{rawQuote}&rdquo;
              </p>
            </div>
          )}

          {(specs.length > 1 || deliverables.length > 1) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {deliverables.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Extracted Scope Deliverables:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                    {deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {specs.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Technical Specifications:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                    {specs.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── INTEGRATED AI SALES COPILOT & ACTION STRIP ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="p-3 bg-gradient-to-r from-slate-50 via-slate-50 to-rose-50/20 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-rose-950/20 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2">
          {/* Subheader: Copilot Label + Probability Pill + Risk Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ED1A53] shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                AI Sales Copilot &amp; Insights
              </span>
              <span className="text-[9px] font-bold bg-rose-50 dark:bg-rose-950 text-[#ED1A53] dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 px-1.5 py-0.2 rounded-full font-mono">
                Real-time
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Win Probability (from copilot or default) */}
              {copilot?.winProbability !== undefined && copilot.winProbability !== null && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[10px] text-slate-400 font-semibold">Win Probability:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                    {typeof copilot.winProbability === "number" ? `${copilot.winProbability}%` : copilot.winProbability}
                  </span>
                  {copilot.winProbabilitySubtext && (
                    <span className="text-[9px] text-slate-400 hidden sm:inline">
                      ({copilot.winProbabilitySubtext})
                    </span>
                  )}
                </div>
              )}

              {/* Risk Indicator Tag */}
              {copilot?.riskIndicator && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  copilot.riskIndicator.level === "HIGH" 
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900"
                    : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900"
                }`}>
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="text-[10px]">{copilot.riskIndicator.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Action & Trigger Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Recommended Action:
              </span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                {copilot?.recommendedAction || data.recommendedAction || "Prepare and review quotation package based on customer scope."}
              </p>
              {copilot?.riskIndicator?.reason && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  {copilot.riskIndicator.reason}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                title="Re-run AI extraction query"
              >
                <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin text-[#ED1A53]" : ""}`} />
                <span>Remix</span>
              </button>

              <button
                onClick={() => onActionClick && onActionClick(copilot?.recommendedAction || data.recommendedAction)}
                className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#d81248] hover:to-[#960a2d] text-white text-xs font-bold transition-all shadow-sm shadow-[#ED1A53]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileText className="w-3 h-3" />
                <span>Generate Quote</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
