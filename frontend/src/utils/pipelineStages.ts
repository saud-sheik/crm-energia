import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

export interface PipelineStageInfo {
  id?: string;
  name: string;
  order: number;
  probability?: number;
  color: string;
  badgeColor: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
}

export const CANONICAL_PIPELINE_STAGES: PipelineStageInfo[] = [
  {
    name: "Discovery",
    order: 1,
    probability: 10,
    color: "bg-[#F8F4F8] text-[#4D2D56] border-[#E1D4E5] font-semibold",
    badgeColor: "bg-[#F8F4F8] text-[#4D2D56] border-[#E1D4E5] font-semibold",
    headerBg: "bg-[#F8F4F8]",
    headerText: "text-[#4D2D56]",
    headerBorder: "border-[#E1D4E5]"
  },
  {
    name: "Requirements",
    order: 2,
    probability: 20,
    color: "bg-[#FAF4F1] text-[#6B3322] border-[#E6D4CC] font-semibold",
    badgeColor: "bg-[#FAF4F1] text-[#6B3322] border-[#E6D4CC] font-semibold",
    headerBg: "bg-[#FAF4F1]",
    headerText: "text-[#6B3322]",
    headerBorder: "border-[#E6D4CC]"
  },
  {
    name: "Solution/Scope",
    order: 3,
    probability: 40,
    color: "bg-[#FAF5EE] text-[#69421E] border-[#E5D7C6] font-semibold",
    badgeColor: "bg-[#FAF5EE] text-[#69421E] border-[#E5D7C6] font-semibold",
    headerBg: "bg-[#FAF5EE]",
    headerText: "text-[#69421E]",
    headerBorder: "border-[#E5D7C6]"
  },
  {
    name: "Quote Preparation",
    order: 4,
    probability: 60,
    color: "bg-[#FAF3F5] text-[#662335] border-[#E6D0D7] font-semibold",
    badgeColor: "bg-[#FAF3F5] text-[#662335] border-[#E6D0D7] font-semibold",
    headerBg: "bg-[#FAF3F5]",
    headerText: "text-[#662335]",
    headerBorder: "border-[#E6D0D7]"
  },
  {
    name: "Quote Sent",
    order: 5,
    probability: 70,
    color: "bg-[#FAF2F4] text-[#701A32] border-[#E6CBD3] font-semibold",
    badgeColor: "bg-[#FAF2F4] text-[#701A32] border-[#E6CBD3] font-semibold",
    headerBg: "bg-[#FAF2F4]",
    headerText: "text-[#701A32]",
    headerBorder: "border-[#E6CBD3]"
  },
  {
    name: "Negotiation",
    order: 6,
    probability: 80,
    color: "bg-[#F7F2F6] text-[#541B44] border-[#E1CFDE] font-semibold",
    badgeColor: "bg-[#F7F2F6] text-[#541B44] border-[#E1CFDE] font-semibold",
    headerBg: "bg-[#F7F2F6]",
    headerText: "text-[#541B44]",
    headerBorder: "border-[#E1CFDE]"
  },
  {
    name: "Agreed",
    order: 7,
    probability: 90,
    color: "bg-[#FAF6F1] text-[#5E4320] border-[#E4D9C7] font-semibold",
    badgeColor: "bg-[#FAF6F1] text-[#5E4320] border-[#E4D9C7] font-semibold",
    headerBg: "bg-[#FAF6F1]",
    headerText: "text-[#5E4320]",
    headerBorder: "border-[#E4D9C7]"
  },
  {
    name: "Won",
    order: 8,
    probability: 100,
    color: "bg-[#F3F7F5] text-[#184531] border-[#CEDFD6] font-bold",
    badgeColor: "bg-[#F3F7F5] text-[#184531] border-[#CEDFD6] font-bold",
    headerBg: "bg-[#F3F7F5]",
    headerText: "text-[#184531]",
    headerBorder: "border-[#CEDFD6]"
  },
  {
    name: "Lost",
    order: 9,
    probability: 0,
    color: "bg-[#F5F6F7] text-[#47515D] border-[#DBDFE4]",
    badgeColor: "bg-[#F5F6F7] text-[#47515D] border-[#DBDFE4]",
    headerBg: "bg-[#F5F6F7]",
    headerText: "text-[#47515D]",
    headerBorder: "border-[#DBDFE4]"
  }
];

export const STAGE_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  "Discovery": { bg: "bg-[#F8F4F8]", text: "text-[#4D2D56]", border: "border-[#E1D4E5]" },
  "Requirements": { bg: "bg-[#FAF4F1]", text: "text-[#6B3322]", border: "border-[#E6D4CC]" },
  "Solution/Scope": { bg: "bg-[#FAF5EE]", text: "text-[#69421E]", border: "border-[#E5D7C6]" },
  "Quote Preparation": { bg: "bg-[#FAF3F5]", text: "text-[#662335]", border: "border-[#E6D0D7]" },
  "Quote Sent": { bg: "bg-[#FAF2F4]", text: "text-[#701A32]", border: "border-[#E6CBD3]" },
  "Negotiation": { bg: "bg-[#F7F2F6]", text: "text-[#541B44]", border: "border-[#E1CFDE]" },
  "Agreed": { bg: "bg-[#FAF6F1]", text: "text-[#5E4320]", border: "border-[#E4D9C7]" },
  "Won": { bg: "bg-[#F3F7F5]", text: "text-[#184531]", border: "border-[#CEDFD6]" },
  "Lost": { bg: "bg-[#F5F6F7]", text: "text-[#47515D]", border: "border-[#DBDFE4]" },
  // Backward compatibility mappings
  "Proposal": { bg: "bg-[#FAF3F5]", text: "text-[#662335]", border: "border-[#E6D0D7]" },
  "Needs Analysis": { bg: "bg-[#FAF4F1]", text: "text-[#6B3322]", border: "border-[#E6D4CC]" },
  "Closed Won": { bg: "bg-[#F3F7F5]", text: "text-[#184531]", border: "border-[#CEDFD6]" },
  "Closed Lost": { bg: "bg-[#F5F6F7]", text: "text-[#47515D]", border: "border-[#DBDFE4]" }
};

export function normalizeStageName(rawStage: string | undefined | null): string {
  if (!rawStage) return "Discovery";
  const s = rawStage.trim();
  if (s === "Proposal" || s === "PROPOSAL_QUOTE") return "Quote Preparation";
  if (s === "Needs Analysis" || s === "REQUIREMENTS") return "Requirements";
  if (s === "Solution" || s === "SOLUTION_DESIGN" || s === "Solution Design") return "Solution/Scope";
  if (s === "QUOTE_SENT") return "Quote Sent";
  if (s === "NEGOTIATION") return "Negotiation";
  if (s === "AGREED_PENDING_ORDER" || s === "Agreed / Pending Order") return "Agreed";
  if (s === "Closed Won" || s === "CLOSED_WON" || s === "Won") return "Won";
  if (s === "Closed Lost" || s === "CLOSED_LOST" || s === "Lost") return "Lost";
  if (s === "DISCOVERY") return "Discovery";
  return s;
}

export function getStageHeaderColor(stageName: string, isClosed: boolean = false) {
  const normalized = normalizeStageName(stageName);
  return (
    STAGE_COLOR_MAP[normalized] ||
    (isClosed
      ? { bg: "bg-[#F5F6F7]", text: "text-[#47515D]", border: "border-[#DBDFE4]" }
      : { bg: "bg-[#F8F4F8]", text: "text-[#4D2D56]", border: "border-[#E1D4E5]" })
  );
}

export function getStageBadgeClass(stageName: string): string {
  const normalized = normalizeStageName(stageName);
  const found = CANONICAL_PIPELINE_STAGES.find((s) => s.name.toLowerCase() === normalized.toLowerCase());
  return found?.badgeColor || "bg-[#F8F4F8] text-[#4D2D56] border-[#E1D4E5]";
}

export function usePipelineStages() {
  return useQuery<PipelineStageInfo[]>({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const res = await apiClient.get<any[]>("/api/v1/pipeline-stages");
      if (Array.isArray(res) && res.length > 0) {
        return res.map((s) => {
          const matched = CANONICAL_PIPELINE_STAGES.find(
            (c) => c.name.toLowerCase() === s.name.toLowerCase()
          );
          return {
            id: s.id,
            name: s.name,
            order: s.order || 0,
            probability: s.probability || matched?.probability || 0,
            color: matched?.color || "bg-[#F8F4F8] text-[#4D2D56] border-[#E1D4E5]",
            badgeColor: matched?.badgeColor || "bg-[#F8F4F8] text-[#4D2D56] border-[#E1D4E5]",
            headerBg: matched?.headerBg || "bg-[#F8F4F8]",
            headerText: matched?.headerText || "text-[#4D2D56]",
            headerBorder: matched?.headerBorder || "border-[#E1D4E5]"
          };
        });
      }
      return CANONICAL_PIPELINE_STAGES;
    },
    staleTime: 5 * 60 * 1000,
    initialData: CANONICAL_PIPELINE_STAGES
  });
}
