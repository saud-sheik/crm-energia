import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  PenTool,
  CheckCheck,
  Check,
  Plus,
  RefreshCw,
  Search,
  X,
  FileCheck,
  Truck,
  MapPin,
  ExternalLink,
  ChevronRight,
  Bot
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVolviAssist } from "../../context/VolviAssistContext";
import { rentalContractApi } from "./rentalContractApi";
import { RentalContract, ContractStatus } from "./types";
import { formatCurrency } from "../../utils/currency";

interface CatalogEquipment {
  id: string;
  name: string;
  category: "generator" | "fuel_tank" | "cable" | "distribution" | "transformer";
  kvaRating?: number;
  dailyRate: number;
  specSummary: string;
}

const DEFAULT_CONTRACT_EQUIPMENT: CatalogEquipment[] = [
  {
    id: "cat-c15-500",
    name: "500 kVA Caterpillar C15 Heavy Soundproof",
    category: "generator",
    kvaRating: 500,
    dailyRate: 1450,
    specSummary: "500 kVA Standby / 450 kVA Prime • 400V 50Hz • Sound-Attenuated Enclosure • Sync Switchgear"
  },
  {
    id: "mtu-1000",
    name: "1000 kVA MTU Mega 16V2000 Containerized",
    category: "generator",
    kvaRating: 1000,
    dailyRate: 2600,
    specSummary: "1,000 kVA Heavy Prime • MTU 16V2000 • ISO 20ft CSC Container • Utility Parallel Ready"
  },
  {
    id: "perkins-250",
    name: "250 kVA Perkins 1506A Soundproof Canopy",
    category: "generator",
    kvaRating: 250,
    dailyRate: 850,
    specSummary: "250 kVA Prime • Perkins 1506A • 400V 50Hz • Stage V Low Emission"
  },
  {
    id: "cummins-60",
    name: "60 kVA Cummins 4BTA Trailer Auxiliary",
    category: "generator",
    kvaRating: 60,
    dailyRate: 350,
    specSummary: "60 kVA Standby / 55 kVA Prime • Mobile Trailer • Rapid Response"
  },
  {
    id: "cummins-1250",
    name: "1250 kVA Cummins QSK50 Power Module",
    category: "generator",
    kvaRating: 1250,
    dailyRate: 3100,
    specSummary: "1,250 kVA Continuous • ISO 20ft Container • Extreme Desert Cooling Spec (55°C)"
  },
  {
    id: "tank-2500",
    name: "2,500L External Bunded Fuel Tank",
    category: "fuel_tank",
    dailyRate: 90,
    specSummary: "2,500 Liters • Double-Wall Environmental Steel Containment • Auto Fuel Transfer Pump"
  },
  {
    id: "tank-5000",
    name: "5,000L External Bulk Fuel Tank",
    category: "fuel_tank",
    dailyRate: 150,
    specSummary: "5,000 Liters • Bunded Bulk Fuel Storage • Dual Quick-Connect Lines • Spill Kit"
  },
  {
    id: "cable-50m",
    name: "50m Power Trailing Cables (4-Core)",
    category: "cable",
    dailyRate: 60,
    specSummary: "50m 4-Core 240mm² Flexible Copper Power Cables + Lug Terminations"
  },
  {
    id: "switch-sync",
    name: "Automatic Transfer & Sync Switchboard",
    category: "distribution",
    dailyRate: 180,
    specSummary: "Basler DGC-2020 Auto-Sync Controller • 1600A Motorized Circuit Breaker"
  }
];

export default function RentalContractsManager() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { triggerGuidance } = useVolviAssist();

  // Track whether we just completed a countersign so we can prioritise Step 7 guidance
  const justCountersignedRef = useRef<{ kva: number; site: string; dealId: string; startDate: string; endDate: string } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const dealIdFromUrl = searchParams.get("dealId");
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "ALL");

  useEffect(() => {
    const validTabs = ["ALL", "ACTIVE", "CLIENT_SIGNING", "COMPANY_SIGNING", "LEGAL_REVIEW", "DRAFT", "AWAITING_CLIENT_SIGNATURE", "AWAITING_COMPANY_SIGNATURE"];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      // Normalize legacy URL param names to new tab IDs
      if (tabFromUrl === "CLIENT_SIGNING") setActiveTab("AWAITING_CLIENT_SIGNATURE");
      else if (tabFromUrl === "COMPANY_SIGNING") setActiveTab("AWAITING_COMPANY_SIGNATURE");
      else setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Milestone Celebration Modals
  const [contractGeneratedSuccess, setContractGeneratedSuccess] = useState<{
    contractNumber: string;
    dealTitle: string;
    totalValue?: number;
    monthlyRate?: number;
  } | null>(null);

  const [contractSignedSuccess, setContractSignedSuccess] = useState<{
    contractNumber: string;
    dealTitle: string;
    dealId?: string;
    kva?: number;
    startDate?: string;
    endDate?: string;
    site?: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [signingMode, setSigningMode] = useState<"client" | "company">("client");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);

  // Sign form state
  const [clientSignatoryName, setClientSignatoryName] = useState<string>("");
  const [clientSignatoryTitle, setClientSignatoryTitle] = useState<string>("Procurement Director");

  // Generate form state
  const [genDealId, setGenDealId] = useState<string>("");
  const [genStartDate, setGenStartDate] = useState<string>("2026-12-01");
  const [genEndDate, setGenEndDate] = useState<string>("2027-02-28");
  const [genTotalValue, setGenTotalValue] = useState<number>(75000);
  const [genMonthlyRate, setGenMonthlyRate] = useState<number>(25000);
  const [genDeposit, setGenDeposit] = useState<number>(10000);
  const [genSlaHours, setGenSlaHours] = useState<2 | 4>(4);
  const [genBackupUnit, setGenBackupUnit] = useState<boolean>(true);
  const [genSiteLocation, setGenSiteLocation] = useState<string>("Jubail Industrial Plant 2");
  const [genEquipmentSummary, setGenEquipmentSummary] = useState<string>(
    "1x 250 kVA Prime Generator + 1x 2,500L External Fuel Tank + 50m Power Cables"
  );

  // Inline Quick-Create Opportunity for Direct Contracts
  const [showQuickContractDealForm, setShowQuickContractDealForm] = useState<boolean>(false);
  const [quickContractDealName, setQuickContractDealName] = useState<string>("");
  const [quickContractCompanyName, setQuickContractCompanyName] = useState<string>("");
  const [quickContractAmount, setQuickContractAmount] = useState<number>(75000);
  const [isCreatingQuickContractDeal, setIsCreatingQuickContractDeal] = useState<boolean>(false);

  const handleQuickCreateContractDeal = async () => {
    if (!quickContractDealName.trim()) {
      alert("Please enter a Project / Deal Name.");
      return;
    }
    try {
      setIsCreatingQuickContractDeal(true);
      const displayName = quickContractCompanyName.trim()
        ? `${quickContractCompanyName.trim()} — ${quickContractDealName.trim()}`
        : quickContractDealName.trim();

      const res = await fetch("/api/v1/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: displayName,
          title: displayName,
          amount: quickContractAmount || genTotalValue || 75000,
          estimatedValue: quickContractAmount || genTotalValue || 75000,
          stage: "CONTRACT_FORMULATION"
        })
      });

      if (!res.ok) {
        throw new Error("Failed to create opportunity");
      }

      const newDeal = await res.json();
      // Optimistically update candidate deals list and auto-select in contract modal
      queryClient.setQueryData(["dealsForRentalContracts"], (old: any[] = []) => [
        newDeal,
        ...(Array.isArray(old) ? old : [])
      ]);
      setGenDealId(newDeal.id);
      if (quickContractAmount && quickContractAmount !== genTotalValue) {
        setGenTotalValue(quickContractAmount);
      }
      setShowQuickContractDealForm(false);
      setQuickContractDealName("");
      setQuickContractCompanyName("");
    } catch (err: any) {
      alert(err.message || "Could not create new deal");
    } finally {
      setIsCreatingQuickContractDeal(false);
    }
  };

  // Equipment Database Search & Selection State
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState<string>("");
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState<boolean>(false);

  const filteredEquipment = DEFAULT_CONTRACT_EQUIPMENT.filter((eq) => {
    if (!equipmentSearchTerm.trim()) return true;
    const term = equipmentSearchTerm.toLowerCase();
    return (
      eq.name.toLowerCase().includes(term) ||
      (eq.kvaRating && `${eq.kvaRating}`.includes(term)) ||
      eq.category.toLowerCase().includes(term) ||
      eq.specSummary.toLowerCase().includes(term)
    );
  });

  const handleSelectEquipment = (item: CatalogEquipment) => {
    const formattedItem = `1x ${item.name} (${item.specSummary})`;
    
    // If the field is default or empty, set directly. Otherwise append cleanly
    if (
      !genEquipmentSummary.trim() ||
      genEquipmentSummary === "1x 500 kVA Grid-Spec Generator + 1x 2,500L External Fuel Tank + 50m Power Cables" ||
      genEquipmentSummary === "1x 250 kVA Prime Generator + 1x 2,500L External Fuel Tank + 50m Power Cables"
    ) {
      setGenEquipmentSummary(formattedItem);
    } else if (!genEquipmentSummary.includes(item.name)) {
      setGenEquipmentSummary((prev) => `${prev} + 1x ${item.name}`);
    }

    // Auto-calculate suggested monthly tariff and contract value for generator packages
    if (item.category === "generator" && item.dailyRate) {
      const suggestedMonthly = item.dailyRate * 20;
      setGenMonthlyRate(suggestedMonthly);
      setGenTotalValue(suggestedMonthly * 3);
      if (item.kvaRating && item.kvaRating >= 500) {
        setGenSlaHours(2); // Auto-recommend 2-hour priority SLA for critical 500kVA+ units
      }
    }

    setIsEquipmentDropdownOpen(false);
    setEquipmentSearchTerm("");
  };

  // Fetch Contracts (Always fetch full list so KPI metrics and tab badges reflect actual counts)
  const { data: contracts = [], isLoading, refetch } = useQuery<RentalContract[]>({
    queryKey: ["rentalContracts"],
    queryFn: () => rentalContractApi.getContracts("ALL", token),
    enabled: !!token,
    refetchInterval: 20000
  });

  // Fetch Candidate Deals for Contract Generation
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["dealsForRentalContracts"],
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

  // Auto-fill and auto-open contract generation when dealId arrives from URL (from Credit Desk)
  useEffect(() => {
    if (dealIdFromUrl && deals.length > 0) {
      setGenDealId(dealIdFromUrl);
      const match = deals.find((d: any) => d.id === dealIdFromUrl);
      if (match) {
        const val = Number(match.amount || match.dealValue || match.estimatedValue || 0);
        if (val > 0) {
          setGenTotalValue(val);
          setGenMonthlyRate(Math.round(val));
        }
        if (match.name || match.title) {
          setGenSiteLocation(match.name || match.title);
        }
        const dealText = `${match.name || ''} ${match.title || ''}`;
        if (dealText.includes("250 kVA") || dealText.includes("250kva") || dealText.includes("250")) {
          setGenEquipmentSummary("1x 250 kVA Prime Generator + 1x 2,500L External Fuel Tank + 50m Power Cables");
        } else if (dealText.includes("100 kVA") || dealText.includes("100kva")) {
          setGenEquipmentSummary("1x 100 kVA Heavy Duty Generator + 1x 1,000L External Fuel Tank + 30m Power Cables");
        } else if (dealText.includes("1000 kVA") || dealText.includes("1000kva")) {
          setGenEquipmentSummary("1x 1000 kVA Mega-Power Generator + 1x 5,000L External Fuel Tank + 80m Power Cables");
        }
      }
      setIsGenerateModalOpen(true);
    }
  }, [dealIdFromUrl, deals]);

  // Dynamic Volvi Guidance for Contract Generation & Signing workflow
  useEffect(() => {
    if (isGenerateModalOpen) {
      const match = deals.find((d: any) => d.id === genDealId);
      const title = match?.name || match?.title || "saud (250 kVA)";
      triggerGuidance({
        stepNumber: 6,
        stageName: "Step 6 of 8 • Master Rental Agreement Drafting",
        message: `Generate Contract for ${title}`,
        explanation: "Review hire window, SLA guarantees, and consolidated equipment clause. Click 'GENERATE CONTRACT' below to assemble the contract draft and open the digital signing queue.",
        recommendedAction: "Click 'GENERATE CONTRACT' in dialog",
        actionLabel: "Generate Contract (Step 6)",
        actionPath: "/rental-contracts",
        technicalTip: "The contract includes 4-hour emergency SLA, 12h replacement guarantee, and ZATCA bilingual compliance terms."
      });
      return;
    }

    // Check if there are contracts awaiting Energia countersignature
    const companyPending = contracts.find((c) => c.status === "AWAITING_COMPANY_SIGNATURE");

    // --- Priority 0: We JUST countersigned a deal → guide to Step 7 Fleet Dispatch ---
    if (justCountersignedRef.current) {
      const { kva, site, dealId, startDate, endDate } = justCountersignedRef.current;
      const fleetUrl = `/fleet-availability?autoReserve=true&dealId=${dealId}&kva=${kva}&site=${encodeURIComponent(site)}${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;
      triggerGuidance({
        stepNumber: 7,
        stageName: "Step 7 of 8 • Fleet Yard & Dispatch",
        message: "Contract Executed — Reserve & Dispatch Generator",
        explanation: `Rental agreement is fully executed (${kva} kVA). Go to the Fleet Yard to assign a physical unit and release it for site delivery.`,
        recommendedAction: "Open Fleet Dispatch and lock reservation",
        actionLabel: "Open Fleet Dispatch (Step 7)",
        actionPath: fleetUrl,
        technicalTip: "Gate Pass generation requires pre-delivery load bank certificate and driver ID verification."
      });
      return;
    }

    // --- Priority 1: ACTIVE contract with WON deal → guide to Step 7 ---
    // Pick the most recently activated WON contract (contractSignedAt most recent)
    const wonActiveContract = contracts
      .filter((c) => c.status === "ACTIVE" && (c.deal as any)?.status === "WON")
      .sort((a, b) => new Date(b.companySignedAt || b.updatedAt).getTime() - new Date(a.companySignedAt || a.updatedAt).getTime())[0];
    if (wonActiveContract) {
      const wonDeal = wonActiveContract.deal;
      const wonName = wonDeal?.name || wonDeal?.title || "Active Deal";
      const wonKvaMatch = wonName.match(/(\d+)\s*kva/i);
      const wonKva = wonKvaMatch ? parseInt(wonKvaMatch[1], 10) : 250;
      const wonSite = wonActiveContract.siteLocation || "Operational Site";
      const fleetUrl = `/fleet-availability?autoReserve=true&dealId=${wonActiveContract.dealId}&kva=${wonKva}&site=${encodeURIComponent(wonSite)}${wonActiveContract.contractStartDate ? `&startDate=${wonActiveContract.contractStartDate}` : ""}${wonActiveContract.contractEndDate ? `&endDate=${wonActiveContract.contractEndDate}` : ""}`;
      triggerGuidance({
        stepNumber: 7,
        stageName: "Step 7 of 8 • Fleet Yard & Dispatch",
        message: `Dispatch Generator for ${wonName}`,
        explanation: `${wonName} is fully executed. Reserve the ${wonKva} kVA unit in the Fleet Yard and dispatch to ${wonSite}.`,
        recommendedAction: "Open Fleet Dispatch and lock reservation",
        actionLabel: "Open Fleet Dispatch (Step 7)",
        actionPath: fleetUrl,
        technicalTip: "Asset mobilisation triggers telematics pairing, GPS geofencing, and automated daily engine runtime logs."
      });
      return;
    }
    if (companyPending) {
      const cClient = companyPending.deal?.name || companyPending.account?.name || "saud (250 kVA)";
      triggerGuidance({
        stepNumber: 6,
        stageName: "Step 6 Active • Executive Countersignature",
        message: `Countersign Contract (${companyPending.contractNumber})`,
        explanation: `Client signature recorded for ${cClient}. Apply Energia Regional Director countersignature to activate the rental agreement and commit the deal to Won.`,
        recommendedAction: "Click 'Countersign & Win (100%)'",
        actionLabel: "Countersign Contract (Step 6)",
        actionPath: "/rental-contracts?tab=AWAITING_COMPANY_SIGNATURE",
        technicalTip: "Director countersignature releases generator reservation and unlocks yard dispatch."
      });
      return;
    }

    // Check if there are contracts awaiting client signature or drafts
    const clientPending = contracts.find(
      (c) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "DRAFT"
    );
    if (clientPending) {
      const cClient = clientPending.deal?.name || clientPending.account?.name || "saud (250 kVA)";
      triggerGuidance({
        stepNumber: 6,
        stageName: "Step 6 Active • Record Client Signature",
        message: `Client Signature Required (${clientPending.contractNumber})`,
        explanation: `Contract generated for ${cClient}. Click 'Record Client Sign' to record the client procurement approval.`,
        recommendedAction: "Click 'Record Client Sign' in table",
        actionLabel: "Sign Contract (Step 6)",
        actionPath: "/rental-contracts?tab=AWAITING_CLIENT_SIGNATURE",
        technicalTip: "Energia standard requires authorized procurement signature or PO attachment before director countersignature."
      });
    }
  }, [isGenerateModalOpen, genDealId, deals, contracts, triggerGuidance]);

  // Mutations
  const generateMutation = useMutation({
    mutationFn: (payload: any) => rentalContractApi.generateContract(payload, token),
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      setIsGenerateModalOpen(false);
      const match = deals.find((d: any) => d.id === variables.dealId);
      setContractGeneratedSuccess({
        contractNumber: data?.contractNumber || `EN-CON-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        dealTitle: match?.name || match?.title || "Saudi Aramco - Khurais Gas Operations",
        totalValue: variables.totalContractValue,
        monthlyRate: variables.monthlyRecurringRate
      });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to generate rental contract");
    }
  });

  const submitLegalMutation = useMutation({
    mutationFn: (id: string) => rentalContractApi.submitLegalReview(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rentalContracts"] })
  });

  const approveLegalMutation = useMutation({
    mutationFn: (id: string) => rentalContractApi.approveLegalReview(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rentalContracts"] })
  });

  const signClientMutation = useMutation({
    mutationFn: (payload: { id: string; signatoryName: string; signatoryTitle: string }) =>
      rentalContractApi.signClient(
        payload.id,
        {
          signatoryName: payload.signatoryName,
          signatoryTitle: payload.signatoryTitle,
          signatureData: "DIGITALLY_VERIFIED_CLIENT_SIGNATURE"
        },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      setIsSignModalOpen(false);
      setSelectedContract(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to sign contract");
    }
  });

  const signCompanyMutation = useMutation({
    mutationFn: (id: string) =>
      rentalContractApi.signCompany(id, "ENERGIA_AUTHORIZED_EXECUTIVE_COUNTERSIGN", token),
    onSuccess: (data: any, contractId: string) => {
      queryClient.invalidateQueries({ queryKey: ["rentalContracts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setIsSignModalOpen(false);
      const contract = selectedContract || contracts.find((c) => c.id === contractId);
      const cNum = contract?.contractNumber || "EN-CON-2026-ACTIVE";
      const dealName = contract?.deal?.name || contract?.deal?.title || "Saudi Aramco Operations";
      const targetClient = (contract as any)?.clientOrganization || contract?.deal?.account?.name || contract?.deal?.name || "Client";
      const targetSite = contract?.siteLocation || "Operational Site";

      // Extract kVA from deal name (e.g. "saud - 250 kVA Prime Rental" → 250)
      const kvaMatch = dealName.match(/(\d+)\s*kva/i) || dealName.match(/(\d+)\s*kVA/);
      const kva = kvaMatch ? parseInt(kvaMatch[1], 10) : 250;

      // Build auto-reserve URL with all contract data
      const startDate = contract?.contractStartDate || "";
      const endDate = contract?.contractEndDate || "";
      const autoReserveUrl = `/fleet-availability?autoReserve=true&dealId=${contract?.dealId || ""}&contractId=${contractId}&client=${encodeURIComponent(targetClient)}&site=${encodeURIComponent(targetSite)}&kva=${kva}${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`;

      // Mark as just countersigned so the guidance effect prioritises Step 7
      justCountersignedRef.current = { kva, site: targetSite, dealId: contract?.dealId || "", startDate, endDate };

      setContractSignedSuccess({
        contractNumber: cNum,
        dealTitle: dealName,
        dealId: contract?.dealId,
        kva,
        startDate,
        endDate,
        site: targetSite,
      });

      triggerGuidance({
        stepNumber: 7,
        stageName: "Step 6 Completed • Contract Executed",
        message: `Rental Agreement Executed (${cNum})`,
        explanation: "Both signatures and legal clauses verified. Proceed to Operations Fleet Yard to assign physical serial number and dispatch equipment.",
        recommendedAction: "Reserve Asset & Dispatch",
        actionLabel: "Open Fleet Yard & Dispatch",
        actionPath: autoReserveUrl,
        technicalTip: "Gate Pass generation requires pre-delivery load bank certificate and driver ID verification.",
        suggestedPrompt: "Show live available fleet in Riyadh & Jubail yards"
      });
      setSelectedContract(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to countersign contract");
    }
  });

  // KPI Calculations across entire contract repository
  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const awaitingClientSignCount = contracts.filter(
    (c) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "DRAFT"
  ).length;
  const awaitingCompanySignCount = contracts.filter(
    (c) => c.status === "AWAITING_COMPANY_SIGNATURE"
  ).length;
  const awaitingSignCount = awaitingClientSignCount + awaitingCompanySignCount;
  const legalReviewCount = contracts.filter((c) => c.status === "LEGAL_REVIEW").length;
  const draftCount = contracts.filter((c) => c.status === "DRAFT").length;
  const prioritySlaCount = contracts.filter((c) => c.breakdownResponseSlaHours === 2).length;

  const totalActiveValue = contracts
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + Number(c.totalContractValue || 0), 0);

  // Filter contracts based on active tab and search query
  const filteredContracts = contracts.filter((c) => {
    // 1. Tab Status Filter
    if (activeTab === "ACTIVE" && c.status !== "ACTIVE") return false;
    if (
      (activeTab === "AWAITING_CLIENT_SIGNATURE" || activeTab === "CLIENT_SIGNING") &&
      c.status !== "AWAITING_CLIENT_SIGNATURE" &&
      c.status !== "DRAFT"
    ) return false;
    if (
      (activeTab === "AWAITING_COMPANY_SIGNATURE" || activeTab === "COMPANY_SIGNING") &&
      c.status !== "AWAITING_COMPANY_SIGNATURE"
    ) return false;
    if (activeTab === "LEGAL_REVIEW" && c.status !== "LEGAL_REVIEW") return false;
    if (activeTab === "DRAFT" && c.status !== "DRAFT") return false;

    // 2. Search Text Filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const num = c.contractNumber.toLowerCase();
    const comp = (c.account?.name || c.deal?.account?.name || "").toLowerCase();
    const deal = (c.deal?.title || c.deal?.name || "").toLowerCase();
    return num.includes(term) || comp.includes(term) || deal.includes(term);
  });

  const handleOpenSignModal = (contract: RentalContract, mode: "client" | "company") => {
    setSelectedContract(contract);
    setSigningMode(mode);
    setClientSignatoryName(
      contract.clientSignatoryName ||
        (contract.deal?.account?.name ? `${contract.deal.account.name} Representative` : "")
    );
    setIsSignModalOpen(true);
  };

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    if (signingMode === "client") {
      if (!clientSignatoryName.trim()) {
        alert("Signatory full name is required.");
        return;
      }
      signClientMutation.mutate({
        id: selectedContract.id,
        signatoryName: clientSignatoryName,
        signatoryTitle: clientSignatoryTitle
      });
    } else {
      signCompanyMutation.mutate(selectedContract.id);
    }
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genDealId) {
      alert("Please select a target Opportunity.");
      return;
    }

    generateMutation.mutate({
      dealId: genDealId,
      contractStartDate: genStartDate,
      contractEndDate: genEndDate,
      totalContractValue: genTotalValue,
      monthlyRecurringRate: genMonthlyRate,
      securityDepositAmount: genDeposit,
      breakdownResponseSlaHours: genSlaHours,
      backupUnitCommitment: genBackupUnit,
      siteLocation: genSiteLocation,
      equipmentSummary: genEquipmentSummary
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 lg:p-8 font-sans selection:bg-[#ED1A53]/20 selection:text-[#ED1A53]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-700 border border-slate-300/80">
                Energia Legal & Operations
              </span>
              <span className="text-xs text-slate-500 font-mono">100% Commercial Deal Execution</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-[#ED1A53]" />
              Equipment Rental Contracts & Legal SLAs
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Hire agreements, breakdown response SLAs (2h/4h), damage liability clauses, and dual digital e-sign.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition cursor-pointer"
              title="Refresh Contracts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#D81248] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#ED1A53]/30 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Generate Rental Contract
            </button>
          </div>
        </div>

        {/* Metrics Grid (Pinterest Web 2.0 Elevated Cards with Circular Telemetry Rings) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeDasharray="88, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-emerald-700 font-mono">Live</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Active Hire Contracts
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {activeCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-600 font-bold text-[11px] font-mono">
                Revenue: {formatCurrency(totalActiveValue)}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 shadow-2xs group-hover:scale-105 transition-transform">
                <PenTool className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-purple-500" strokeDasharray="50, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-purple-700 font-mono">Sign</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Awaiting Signature
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {awaitingSignCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-purple-600 font-bold text-[11px] font-mono">
                Dual E-Sign Required
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-amber-500" strokeDasharray="30, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-amber-700 font-mono">Legal</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                In Legal Review
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight font-mono">
                {legalReviewCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-amber-600 font-bold text-[11px] font-mono">
                Contract Underwriting
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group text-slate-900">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-[#ED1A53] shadow-2xs group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-rose-500" strokeDasharray="95, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-rose-700 font-mono">2h SLA</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                2h Priority SLA Fleet
              </span>
              <div className="text-2xl lg:text-3xl font-black text-[#ED1A53] tracking-tight font-mono">
                {prioritySlaCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-rose-600 font-bold text-[11px] font-mono">
                Critical Prime Power
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search (Rose Alabaster Panel) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-[24px] bg-white shadow-[0_12px_28px_-6px_rgba(140,22,60,0.06),0_4px_10px_-2px_rgba(140,22,60,0.03)] border-2 border-[#EED5DE] text-slate-900">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "ALL", label: `All Contracts (${contracts.length})` },
              { id: "ACTIVE", label: `Active (${activeCount})` },
              { id: "AWAITING_CLIENT_SIGNATURE", label: `Awaiting Client Sign (${awaitingClientSignCount})` },
              { id: "AWAITING_COMPANY_SIGNATURE", label: `Awaiting Energia Sign (${awaitingCompanySignCount})` },
              { id: "LEGAL_REVIEW", label: `Legal Review (${legalReviewCount})` },
              { id: "DRAFT", label: `Drafts (${draftCount})` }
            ].map((tab) => {
              const isActive =
                activeTab === tab.id ||
                (tab.id === "AWAITING_CLIENT_SIGNATURE" && activeTab === "CLIENT_SIGNING") ||
                (tab.id === "AWAITING_COMPANY_SIGNATURE" && activeTab === "COMPANY_SIGNING");
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#45142B] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search contract #, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#45142B]"
            />
          </div>
        </div>

        {/* Contracts Table (Rose Alabaster Panel) */}
        <div className="bg-white rounded-[24px] shadow-[0_12px_28px_-6px_rgba(140,22,60,0.06),0_4px_10px_-2px_rgba(140,22,60,0.03)] border-2 border-[#EED5DE] overflow-hidden text-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-200/80 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="px-4 py-3">Contract Ref & Client</th>
                  <th className="px-4 py-3">Equipment Deployed</th>
                  <th className="px-4 py-3">SLA Guarantee</th>
                  <th className="px-4 py-3">Hire Window & Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Loading rental contracts...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <FileCheck className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                      No contracts matching filter. Click &ldquo;Generate Rental Contract&rdquo; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const clientName =
                      c.account?.name || c.deal?.account?.name || "Corporate Customer";
                    const is2hSla = c.breakdownResponseSlaHours === 2;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="font-mono font-bold flex items-center gap-1.5">
                            <span className="text-[#45142B] font-extrabold">{c.contractNumber}</span>
                          </div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {clientName}
                          </div>
                          {c.siteLocation && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {c.siteLocation}
                            </div>
                          )}
                          {c.status === "AWAITING_COMPANY_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "company")}
                              className="mt-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCheck className="w-3 h-3" /> Countersign &amp; Win (100%)
                            </button>
                          )}
                          {c.status === "AWAITING_CLIENT_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "client")}
                              className="mt-1 px-2.5 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" /> Record Client Sign
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-1 max-w-xs">
                          <div className="font-mono text-[11px] text-slate-700 line-clamp-2">
                            {c.equipmentSummary || "Generator Power Assets"}
                          </div>
                          {c.backupUnitCommitment && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block font-mono">
                              ✓ 12h Swap Guarantee
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold inline-flex items-center gap-1 ${
                              is2hSla
                                ? "bg-rose-50 text-[#ED1A53] border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            <Zap className="w-3 h-3" /> {c.breakdownResponseSlaHours}h Response SLA
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Cover: {c.insuranceResponsibility?.replace("_", " ")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-0.5 font-mono">
                          <div className="font-black text-slate-900 text-xs">
                            {formatCurrency(c.totalContractValue)}
                          </div>
                          {c.monthlyRecurringRate && (
                            <div className="text-[11px] text-slate-500">
                              {formatCurrency(c.monthlyRecurringRate)}/mo
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.contractStartDate).toLocaleDateString()} →{" "}
                            {new Date(c.contractEndDate).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {c.status === "ACTIVE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit font-mono">
                              <CheckCheck className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                          {c.status === "AWAITING_CLIENT_SIGNATURE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit font-mono">
                              <PenTool className="w-3 h-3" /> Client Sign Pending
                            </span>
                          )}
                          {c.status === "AWAITING_COMPANY_SIGNATURE" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit font-mono">
                              <PenTool className="w-3 h-3" /> Energia Sign Pending
                            </span>
                          )}
                          {c.status === "LEGAL_REVIEW" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit font-mono">
                              <Shield className="w-3 h-3" /> Legal Review
                            </span>
                          )}
                          {c.status === "DRAFT" && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit font-mono">
                              Draft
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right space-y-1">
                          {c.status === "DRAFT" && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleOpenSignModal(c, "client")}
                                className="px-2.5 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <PenTool className="w-3 h-3" /> Record Client Sign
                              </button>
                              <button
                                onClick={() => submitLegalMutation.mutate(c.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Shield className="w-3 h-3" /> Submit Legal
                              </button>
                            </div>
                          )}

                          {c.status === "LEGAL_REVIEW" && (
                            <button
                              onClick={() => approveLegalMutation.mutate(c.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Clear Legal Review
                            </button>
                          )}

                          {c.status === "AWAITING_CLIENT_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "client")}
                              className="px-2.5 py-1.5 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-[11px] font-bold transition flex items-center gap-1 ml-auto shadow-sm cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" /> Record Client Sign
                            </button>
                          )}

                          {c.status === "AWAITING_COMPANY_SIGNATURE" && (
                            <button
                              onClick={() => handleOpenSignModal(c, "company")}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 ml-auto shadow-sm cursor-pointer"
                            >
                              <CheckCheck className="w-3 h-3" /> Countersign & Win (100%)
                            </button>
                          )}

                          {c.status === "ACTIVE" && (
                            <span className="text-[11px] text-emerald-600 font-mono font-bold block">
                              ✓ Fully Executed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: E-Signature Signoff (White Card Modal) */}
        {isSignModalOpen && selectedContract && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-slate-900">
                    {signingMode === "client" ? "Client Digital Signature" : "Energia Countersignature"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSignModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold font-mono text-[#ED1A53]">
                  {selectedContract.contractNumber}
                </div>
                <div className="text-slate-800 font-semibold">
                  {selectedContract.account?.name || selectedContract.deal?.title}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Value: {formatCurrency(selectedContract.totalContractValue)} | SLA:{" "}
                  {selectedContract.breakdownResponseSlaHours}h response
                </div>
              </div>

              <form onSubmit={handleSignSubmit} className="space-y-4">
                {signingMode === "client" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Authorized Signatory Name</label>
                      <input
                        type="text"
                        value={clientSignatoryName}
                        onChange={(e) => setClientSignatoryName(e.target.value)}
                        placeholder="Full Legal Name"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 font-semibold">Official Title / Designation</label>
                      <input
                        type="text"
                        value={clientSignatoryTitle}
                        onChange={(e) => setClientSignatoryTitle(e.target.value)}
                        placeholder="e.g. Procurement Director / General Manager"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                    <div className="font-bold">⚡ Executive Countersignature Confirmation:</div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      By countersigning, this rental contract becomes active, the generator dispatch is released, and the parent Deal is automatically marked <strong>Closed Won (100%)</strong>.
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center font-mono text-[11px] text-slate-500">
                  [ Digital Signature & Timestamp Cryptographically Signed ]
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
                  >
                    {signingMode === "client" ? "Record Client Signoff" : "Countersign & Activate Contract"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Generate Contract (White Card Modal) */}
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#ED1A53]" />
                  <h3 className="font-bold text-base text-slate-900">Generate Equipment Rental Contract</h3>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Target Opportunity *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickContractDealForm(!showQuickContractDealForm)}
                      className="text-[11px] font-bold text-[#ED1A53] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {showQuickContractDealForm ? "Select Existing Opportunity" : "+ Quick-Create Opportunity"}
                    </button>
                  </div>

                  {showQuickContractDealForm ? (
                    <div className="p-3 bg-slate-50 border border-[#ED1A53]/40 rounded-xl space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#ED1A53]" /> Direct Contract Deal Intake
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Creates & links at 90% PO Stage</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-600">Project / Deal Name *</label>
                        <input
                          type="text"
                          value={quickContractDealName}
                          onChange={(e) => setQuickContractDealName(e.target.value)}
                          placeholder="e.g. 500 kVA Substation Blackout Emergency Power"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#45142B]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-600">Client / Company Name</label>
                          <input
                            type="text"
                            value={quickContractCompanyName}
                            onChange={(e) => setQuickContractCompanyName(e.target.value)}
                            placeholder="e.g. Saudi Electricity Co."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#45142B]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-600">Contract Total (SAR)</label>
                          <input
                            type="number"
                            value={quickContractAmount}
                            onChange={(e) => setQuickContractAmount(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowQuickContractDealForm(false)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingQuickContractDeal}
                          onClick={handleQuickCreateContractDeal}
                          className="px-3 py-1 rounded-md bg-[#ED1A53] hover:bg-[#D81248] text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isCreatingQuickContractDeal ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Create & Auto-Select</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={genDealId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setGenDealId(selectedId);
                        const d = deals.find((item: any) => item.id === selectedId);
                        if (d) {
                          const val = Number(d.dealValue || d.amount || d.estimatedValue || 0);
                          if (val > 0) {
                            setGenTotalValue(val);
                            setGenMonthlyRate(Math.round(val / 3));
                            setGenDeposit(Math.round(val * 0.1));
                          }
                          const siteLoc = d.siteLocation || d.lead?.city || d.account?.billingCity || d.account?.name;
                          if (siteLoc) {
                            setGenSiteLocation(`${siteLoc} Operational Site`);
                          }
                          const dealText = `${d.name || ''} ${d.title || ''}`;
                          if (dealText.includes("250 kVA") || dealText.includes("250kva") || dealText.includes("250")) {
                            setGenEquipmentSummary("1x 250 kVA Prime Generator + 1x 2,500L External Fuel Tank + 50m Power Cables");
                          } else if (dealText.includes("100 kVA") || dealText.includes("100kva")) {
                            setGenEquipmentSummary("1x 100 kVA Heavy Duty Generator + 1x 1,000L External Fuel Tank + 30m Power Cables");
                          } else if (dealText.includes("1000 kVA") || dealText.includes("1000kva")) {
                            setGenEquipmentSummary("1x 1000 kVA Mega-Power Generator + 1x 5,000L External Fuel Tank + 80m Power Cables");
                          }
                        }
                      }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    >
                      <option value="">-- Select Opportunity --</option>
                      {deals.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title || d.name} ({formatCurrency(d.dealValue || d.amount || 0)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Hire Start Date</label>
                    <input
                      type="date"
                      value={genStartDate}
                      onChange={(e) => setGenStartDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Hire End Date</label>
                    <input
                      type="date"
                      value={genEndDate}
                      onChange={(e) => setGenEndDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Total Contract Value (SAR)</label>
                    <input
                      type="number"
                      value={genTotalValue}
                      onChange={(e) => setGenTotalValue(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Monthly Rate (SAR/mo)</label>
                    <input
                      type="number"
                      value={genMonthlyRate}
                      onChange={(e) => setGenMonthlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#45142B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-semibold">Breakdown SLA Guarantee</label>
                    <select
                      value={genSlaHours}
                      onChange={(e: any) => setGenSlaHours(parseInt(e.target.value) as 2 | 4)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                    >
                      <option value={4}>4-Hour Standard Response SLA</option>
                      <option value={2}>2-Hour Priority / Critical SLA</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genBackupUnit}
                        onChange={(e) => setGenBackupUnit(e.target.checked)}
                        className="rounded border-slate-300 text-[#ED1A53] focus:ring-[#ED1A53]"
                      />
                      <span className="text-xs text-slate-700 font-semibold">12h Unit Swap Guarantee</span>
                    </label>
                  </div>
                </div>

                {/* Interactive Equipment Database Search & Selection */}
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#ED1A53]" />
                      <span>Search & Add Equipment from Fleet Database</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {DEFAULT_CONTRACT_EQUIPMENT.length} Fleet Specs
                    </span>
                  </div>

                  {/* Search Bar Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={equipmentSearchTerm}
                      onFocus={() => setIsEquipmentDropdownOpen(true)}
                      onChange={(e) => {
                        setEquipmentSearchTerm(e.target.value);
                        setIsEquipmentDropdownOpen(true);
                      }}
                      placeholder="Search equipment by kVA, model, brand (e.g. 500, CAT, MTU, Tank)..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#45142B]"
                    />
                    {equipmentSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setEquipmentSearchTerm("");
                          setIsEquipmentDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Autocomplete Dropdown List */}
                    {isEquipmentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {filteredEquipment.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            No equipment found matching "{equipmentSearchTerm}".
                          </div>
                        ) : (
                          filteredEquipment.map((eq) => (
                            <div
                              key={eq.id}
                              onClick={() => handleSelectEquipment(eq)}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span className="truncate">{eq.name}</span>
                                  {eq.kvaRating && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-[#ED1A53] border border-rose-200 font-bold shrink-0">
                                      {eq.kvaRating} kVA
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {eq.specSummary}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-emerald-600 text-[11px] block">
                                  SAR {eq.dailyRate.toLocaleString()} / Day
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold block hover:text-[#ED1A53]">
                                  + Select
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick-Add Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Add:</span>
                    {[
                      DEFAULT_CONTRACT_EQUIPMENT[0], // CAT 500 kVA
                      DEFAULT_CONTRACT_EQUIPMENT[1], // MTU 1000 kVA
                      DEFAULT_CONTRACT_EQUIPMENT[2], // Perkins 250 kVA
                      DEFAULT_CONTRACT_EQUIPMENT[5], // Tank 2500L
                      DEFAULT_CONTRACT_EQUIPMENT[7]  // Cables 50m
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectEquipment(item)}
                        className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:text-slate-900 hover:border-[#45142B] hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5 text-[#ED1A53]" />
                        <span>{item.kvaRating ? `${item.kvaRating} kVA` : item.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>

                  {/* Consolidated Legal Equipment Summary Box */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Consolidated Legal Equipment Summary (Contract Clause)
                    </label>
                    <textarea
                      rows={2}
                      value={genEquipmentSummary}
                      onChange={(e) => setGenEquipmentSummary(e.target.value)}
                      required
                      placeholder="Selected equipment package specifications will populate here..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#45142B] font-mono leading-relaxed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-semibold">Site Location</label>
                  <input
                    type="text"
                    value={genSiteLocation}
                    onChange={(e) => setGenSiteLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#45142B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generateMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#ED1A53] hover:bg-[#C71042] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
                  >
                    {generateMutation.isPending ? "Generating..." : "Generate Contract"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Milestone Modal: Contract Generated Successfully */}
        {contractGeneratedSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      ✓ Master Lease Agreement Generated!
                    </h3>
                    <p className="text-[11px] text-slate-500">Legal &amp; Commercial Contract Execution</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContractGeneratedSuccess(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Contract Reference:</span>
                  <span className="font-mono font-black text-[#ED1A53] text-sm">
                    {contractGeneratedSuccess.contractNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Target Account / Project:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{contractGeneratedSuccess.dealTitle}</strong>
                </div>
                {contractGeneratedSuccess.totalValue ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Total Contract Value:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(contractGeneratedSuccess.totalValue)}
                    </span>
                  </div>
                ) : null}
                {contractGeneratedSuccess.monthlyRate ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Monthly Recurring Rate:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(contractGeneratedSuccess.monthlyRate)}/mo
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Contract Status:</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                    ⏳ Ready for Bilingual Signatures
                  </span>
                </div>
              </div>

              {/* Volvi Assist Guidance Pill */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Volvi Assist • Next Step Advisor</span>
                </div>
                <span className="text-[10px] text-rose-200 font-semibold">Bilingual Master Lease Executed</span>
              </div>

              {/* Next Step Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-50/50 to-white dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-start gap-2.5">
                <FileCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white block font-bold">Next Action: Client &amp; Energia Signatures</strong>
                  The contract is compiled with ZATCA tax clauses and Aramco SLA terms. Dispatch the agreement for electronic signing.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("AWAITING_CLIENT_SIGNATURE");
                    setContractGeneratedSuccess(null);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Proceed to Signing Queue ✍️</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setContractGeneratedSuccess(null)}
                  className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close &amp; View All Contracts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Modal: Contract Signed & Executed Successfully */}
        {contractSignedSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      🎉 Contract Fully Executed &amp; Active!
                    </h3>
                    <p className="text-[11px] text-slate-500">Commercial Deal Closed &amp; Legally Binding</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContractSignedSuccess(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Active Agreement:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {contractSignedSuccess.contractNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Account / Project:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{contractSignedSuccess.dealTitle}</strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Execution Status:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    ✓ Both Signatures Verified (Active)
                  </span>
                </div>
              </div>

              {/* Volvi Guide Guidance Pill */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#45142B] text-white border border-[#ED1A53]/30 shadow-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Volvi Guide • Next Step Advisor</span>
                </div>
                <span className="text-[10px] text-rose-200 font-semibold">Bilingual Master Lease Executed</span>
              </div>

              {/* Next Step Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-50/50 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white block font-bold text-emerald-800 dark:text-emerald-300">
                    ⚡ Auto-Mobilization Ready: Step 7 (Fleet Yard &amp; Dispatch)
                  </strong>
                  Contract executed with 2-hour priority SLA. Launching the Fleet Desk will auto-open the spot reservation modal with your 500 kVA generator locked and driver Gate Pass pre-authorized.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const s = contractSignedSuccess;
                    const url = `/fleet-availability?autoReserve=true&client=${encodeURIComponent(s?.dealTitle || "")}&dealId=${s?.dealId || ""}&kva=${s?.kva || 250}&site=${encodeURIComponent(s?.site || "")}${s?.startDate ? `&startDate=${s.startDate}` : ""}${s?.endDate ? `&endDate=${s.endDate}` : ""}`;
                    navigate(url);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#ED1A53] via-[#C71042] to-[#A00B33] hover:from-[#d81248] hover:to-[#8a0729] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-[#ED1A53]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Auto-Launch Step 7: Fleet Reservation &amp; Dispatch</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ACTIVE");
                    setContractSignedSuccess(null);
                  }}
                  className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Stay in Contracts &amp; SLAs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

