import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Mail, Phone, Building2, Pencil, Check, X, History, UserCheck,
  ChevronRight, Calendar, DollarSign, Activity, ShoppingBag, FileText, ChevronDown, ChevronUp, Loader2,
  Users, TrendingUp, MessageSquare, CheckSquare, AlertCircle, Sparkles, Send, Upload, Plus,
  FilePlus, Award, ShieldAlert, CheckCircle2, Clock, MapPin, Video, ExternalLink, Pin,
  FileEdit, Landmark, Inbox, User, Receipt, AlertTriangle, Target, Lock, XCircle,
  Copy, Search, RefreshCw, Briefcase, Zap, Smartphone, Navigation, Layers, Package
} from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { formatDistanceToNow } from "date-fns";
import { CommentThreadSection } from "../components/CommentThreadSection";
import { QualificationDrawer } from "../components/QualificationDrawer";
import { LeadConversionModal } from "../components/LeadConversionModal";
import { HandoffChatWidget } from "../components/HandoffChatWidget";
import { AiRequirementSummaryCard } from "../components/AiRequirementSummaryCard";
import { LeadAttributionCard } from "../components/LeadAttributionCard";
import { DossierSmartStack } from "../components/DossierSmartStack";
import { LeadCampaignBadge } from "../components/LeadCampaignBadge";
import { SiteInspectionCard, useLeadSiteInspection } from "../components/SiteInspectionCard";
import { getStatusStyle } from "../lib/siteInspection";
import { useVolviAssist } from "../context/VolviAssistContext";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Mode states for inline edit
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editExpectedValue, setEditExpectedValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Mode states for assignee reassign
  const [isReassigning, setIsReassigning] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);

  // Clean Horizontal Tab State
  const [activeTab, setActiveTab] = useState<"timeline" | "tasks" | "history" | "handoff_chat">("timeline");

  // Quick Action Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isQualifyDrawerOpen, setIsQualifyDrawerOpen] = useState(false);
  const [gateBlockedBanner, setGateBlockedBanner] = useState<string | null>(null);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);
  const { gate, inspection } = useLeadSiteInspection(id);
  const { triggerGuidance } = useVolviAssist();

  // Queries
  const { data: lead, isLoading } = useQuery<any>({
    queryKey: ["lead", id],
    queryFn: async () => {
      // Direct single-record PK lookup — previously fetched ALL leads and searched client-side
      const res = await fetch(`/api/v1/leads/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error("Lead not found");
      return res.json();
    },
    enabled: !!id && !!token
  });

  // Proactive Volvi Assist Step 1 & 2 Guidance
  useEffect(() => {
    if (!lead?.id) return;
    const timer = setTimeout(() => {
      if (!inspection) {
        triggerGuidance({
          stepNumber: 1,
          stageName: "Step 1 Active • Pre-Sales Sizing Advisory",
          message: `Inbound Lead Captured for ${lead.company || lead.contact?.name || "Client"}`,
          explanation: "Continuous power demand captured. Dispatch Field Engineer for site survey to verify 3x motor starting inrush and cable routing.",
          recommendedAction: "Dispatch Site Survey",
          actionLabel: "Dispatch Site Survey ➔",
          actionPath: `#site-inspection-card-section`,
          onAction: () => {
            const el = document.getElementById("site-inspection-card-section");
            el?.scrollIntoView({ behavior: "smooth" });
          },
          technicalTip: "SEC Standard: Inrush multiplier 3.0x requires 250 kVA Prime generator with 25% safety reserve headroom.",
          suggestedPrompt: "Recommend generator for 260 kW with 3x DOL motor inrush"
        });
      } else if (inspection.status === "APPROVED") {
        triggerGuidance({
          stepNumber: 3,
          stageName: "Step 3 • Commercial Quoting (CPQ)",
          message: `Site Survey Approved for ${lead.company || "Client"}`,
          explanation: "Technical clearance granted. Proceed to Commercial Sales CPQ Builder to calculate multi-month rates and generate quote.",
          recommendedAction: "Build Rental Quote in CPQ",
          actionLabel: "Build Rental Quote in CPQ ➔",
          actionPath: `/rental-cpq/builder?leadId=${lead.id}&kVA=350`,
          technicalTip: "Rental CPQ automatically applies 20x monthly multiplier (10 free days/mo) and 15% KSA VAT.",
          suggestedPrompt: "How does the rental CPQ calculate generator sizing and fuel tank pricing?"
        });
      } else {
        triggerGuidance({
          stepNumber: 2,
          stageName: "Step 2 Active • Pre-Sales Technical Feasibility",
          message: `Site Inspection ${inspection.inspectionNumber} Active`,
          explanation: `Site survey is in status "${inspection.status}". Open Site Inspections Desk to review load calculations or approve.`,
          recommendedAction: "Review Site Inspection Feasibility",
          actionLabel: "Open Site Inspections Desk ➔",
          actionPath: `/site-inspections`,
          technicalTip: "SEC Grid Regulation: Check crane rigging access, soil compaction, and bunded fuel clearances.",
          suggestedPrompt: "What are the site inspection criteria for high ambient desert operation?"
        });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [lead?.id, inspection?.status]);

  // Activity Timeline Filter & Note States
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [noteText, setNoteText] = useState("");

  // Quick Action Form States
  const [callDirection, setCallDirection] = useState("Outbound");
  const [callDuration, setCallDuration] = useState("120");
  const [callOutcome, setCallOutcome] = useState("Connected");
  const [callNotes, setCallNotes] = useState("");

  // Consultative Discovery Call Guide State
  const [showDiscoveryGuide, setShowDiscoveryGuide] = useState(false);
  const [discoveryDuty, setDiscoveryDuty] = useState<"continuous" | "intermittent">("continuous");
  const [discoveryHz, setDiscoveryHz] = useState<"400V_50Hz" | "480V_60Hz" | "220_380V_60Hz">("400V_50Hz");
  const [discoveryMethod, setDiscoveryMethod] = useState<"DOL" | "SOFT_STARTER" | "VFD">("DOL");
  const [discoveryNameplateCheck, setDiscoveryNameplateCheck] = useState(false);
  const [showFullSpecs, setShowFullSpecs] = useState(false);

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");

  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("PDF");

  // WhatsApp manual consent recording state
  const [isRecordingConsent, setIsRecordingConsent] = useState(false);
  const [consentSource, setConsentSource] = useState<"verbal" | "written" | "form" | "other">("verbal");

  const handleOpenConversionModal = () => {
    if (gate && !gate.allowed) {
      setGateBlockedBanner(gate.message);
      return;
    }
    setIsConversionModalOpen(true);
  };

  const handleOpenQualifyDrawer = () => {
    if (gate && !gate.allowed) {
      setGateBlockedBanner(gate.message);
      return;
    }
    setIsQualifyDrawerOpen(true);
  };

  // Other Queries
  const requiresSiteInspection = lead?.requiresSiteInspection === true;

  const { data: pipelineStages } = useQuery<any[]>({
    queryKey: ["pipelineStages"],
    queryFn: async () => {
      const res = await fetch("/api/v1/pipeline", { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch stages");
      return res.json();
    },
    enabled: !!token
  });

  const { data: salespersons } = useQuery<any[]>({
    queryKey: ["salespersons"],
    queryFn: async () => {
      const res = await fetch("/api/v1/salespersons", { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch representatives");
      return res.json();
    },
    enabled: !!token
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["leadActivities", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/activities`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && !!token,
    refetchInterval: 60000, // Poll every 60s
    refetchOnWindowFocus: true,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["leadTasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/tasks?leadId=${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && !!token
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["leadDocuments", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/documents?leadId=${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && !!token
  });

  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: ["leadMeetings", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/meetings?leadId=${id}`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && !!token
  });

  const { data: aiSummary } = useQuery<any>({
    queryKey: ["ai-requirement-summary", "lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/ai-summary`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!token,
    staleTime: 5 * 60 * 1000
  });

  const { data: accountHistory } = useQuery<any>({
    queryKey: ["leadAccountHistory", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/account-history`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) return { relatedLeads: [], deals: [], quotes: [] };
      return res.json();
    },
    enabled: !!id && !!token
  });

  // Prefill state
  useEffect(() => {
    if (lead) {
      setEditProjectName(lead.subject || "");
      setEditExpectedValue(String((lead.leadScore || 50) * 100));
      setEditNotes(lead.body || "");
      setEditEmail(lead.email || "");
      setEditPhone(lead.phone || lead.whatsappPhone || "");
      setEmailTo(lead.email || "");
    }
  }, [lead]);

  // Clear unread WhatsApp count when rep opens a WhatsApp lead
  useEffect(() => {
    if (
      lead &&
      token &&
      ((lead.communicationChannel || "").toLowerCase() === "whatsapp" ||
        (lead.source || "").toLowerCase() === "whatsapp") &&
      (lead.unreadWhatsappCount || 0) > 0
    ) {
      fetch(`/api/v1/leads/${lead.id}/clear-unread`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ["leads"] }))
        .catch(() => { }); // Silent fail — non-critical
    }
  }, [lead?.id, lead?.unreadWhatsappCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mutations
  const updateDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          subject: editProjectName,
          leadScore: parseFloat(editExpectedValue) / 100 || 0,
          body: editNotes,
          email: editEmail,
          phone: editPhone
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setIsEditingDetails(false);
    }
  });

  const toggleSiteInspectionMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ requiresSiteInspection: value })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update lead status");
      }
      return res.json();
    },
    onMutate: async (newStatus: string) => {
      await queryClient.cancelQueries({ queryKey: ["lead", id] });
      const prev = queryClient.getQueryData(["lead", id]);
      queryClient.setQueryData(["lead", id], (old: any) => old ? { ...old, status: newStatus } : old);
      return { prev };
    },
    onError: (err: any, _newStatus, context: any) => {
      if (context?.prev) {
        queryClient.setQueryData(["lead", id], context.prev);
      }
      setStatusErrorMessage(err.message || "Failed to update status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  });

  const reassignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/reassign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ newAssignedToId: newAssigneeId, reason: reassignReason })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      setIsReassigning(false);
      setReassignReason("");
    }
  });

  const { data: missingInfo } = useQuery({
    queryKey: ["leadMissingInfo", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/missing-info`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!token
  });

  const [requestDetailsSuccess, setRequestDetailsSuccess] = useState<string | null>(null);
  const requestDetailsMutation = useMutation({
    mutationFn: async (channel?: string) => {
      const res = await fetch(`/api/v1/leads/${id}/request-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ channel })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      queryClient.invalidateQueries({ queryKey: ["leadMissingInfo", id] });
      setRequestDetailsSuccess(data.message || "Automated information request dispatched to customer.");
      setTimeout(() => setRequestDetailsSuccess(null), 6000);
    }
  });

  // Re-enrich mutation — hoisted here to satisfy React rules-of-hooks (used in Company Intelligence card)
  const reEnrichMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/enrich`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      // Poll twice — enrichment takes ~1-3s after the 202 is returned
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["lead", id] }), 2500);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["lead", id] }), 5000);
    }
  });

  // On-demand Domain Contact Discovery (Hunter.io Domain Search)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyEmailToClipboard = (email: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email);
    }
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const { data: discoveredContactsData, isLoading: isLoadingDiscoveredContacts } = useQuery({
    queryKey: ["leadDiscoveredContacts", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/discovered-contacts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.discovery || null;
    },
    enabled: !!id && !!token
  });

  const findContactsMutation = useMutation({
    mutationFn: async (refresh: boolean = false) => {
      const res = await fetch(`/api/v1/leads/${id}/find-contacts${refresh ? "?refresh=true" : ""}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to discover contacts");
      return data;
    },
    onSuccess: (data) => {
      if (data?.discovery) {
        queryClient.setQueryData(["leadDiscoveredContacts", id], data.discovery);
      }
      queryClient.invalidateQueries({ queryKey: ["leadDiscoveredContacts", id] });
    }
  });

  const [whatsAppText, setWhatsAppText] = useState("");

  const [skipReason, setSkipReason] = useState("");
  const [isSkippingSummary, setIsSkippingSummary] = useState(false);
  const [whatsAppTemplateError, setWhatsAppTemplateError] = useState<string | null>(null);
  const [summaryLanguage, setSummaryLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    if (lead?.preferredLanguage === "en" || lead?.preferredLanguage === "ar") {
      setSummaryLanguage(lead.preferredLanguage);
    }
  }, [lead?.preferredLanguage]);

  const logCallMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/call-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          direction: callDirection,
          durationSeconds: parseInt(callDuration, 10),
          outcome: callOutcome,
          notes: callNotes
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      const hasPhone = Boolean(lead?.phone || lead?.whatsappPhone);
      if (hasPhone) {
        const lang = lead?.preferredLanguage || "ar";
        const recap = callNotes
          ? (lang === "ar" ? `ملخص المكالمة: ${callNotes}` : `Call Summary: ${callNotes}`)
          : (lang === "ar" ? "ملخص المكالمة الهاتفية" : "Call summary recap");
        setWhatsAppText(recap);
        setWhatsAppTemplateError(null);
        setActiveModal("call-summary");
      } else {
        setActiveModal(null);
      }
      setCallNotes("");
    }
  });

  const skipCallSummaryMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/v1/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          type: "note",
          outcome: `Skipped WhatsApp call summary: ${reason}`,
          notes: `Call summary WhatsApp message skipped by rep. Mandatory reason: ${reason}`
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setSkipReason("");
      setIsSkippingSummary(false);
      setWhatsAppTemplateError(null);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/email-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          toEmail: emailTo,
          subject: emailSubject,
          body: emailBody
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setEmailSubject("");
      setEmailBody("");
      alert("Email sent successfully!");
    },
    onError: (error: any) => {
      let msg = error.message;
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) msg = parsed.error + (parsed.details ? `: ${parsed.details}` : "");
      } catch (e) { }
      alert(`Failed to send email:\n${msg}`);
    }
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          phone: lead?.phone || lead?.whatsappPhone,
          text: whatsAppText,
          language: summaryLanguage
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setWhatsAppText("");
      setWhatsAppTemplateError(null);
    },
    onError: (err: any) => {
      let errorMsg = err.message || "Failed to send WhatsApp message";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorMsg = parsed.error;
          if (parsed.requiresTemplate) {
            errorMsg = `No approved WhatsApp template configured for language '${summaryLanguage.toUpperCase()}' — contact your system administrator to configure Twilio Content SID.`;
          }
        }
      } catch (e) { }
      setWhatsAppTemplateError(errorMsg);
    }
  });

  const recordConsentMutation = useMutation({
    mutationFn: async (source: string) => {
      const res = await fetch(`/api/v1/leads/${id}/whatsapp-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ source })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setIsRecordingConsent(false);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          title: taskTitle,
          priority: taskPriority,
          dueDate: taskDueDate || null,
          description: taskDescription
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadTasks", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setTaskTitle("");
      setTaskDescription("");
    }
  });

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          title: meetingTitle,
          date: meetingDate,
          time: meetingTime,
          location: meetingLocation,
          agenda: meetingAgenda
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadMeetings", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setMeetingTitle("");
      setMeetingAgenda("");
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          leadId: id,
          name: docName,
          fileType: docType,
          fileSize: 204800,
          fileUrl: `/uploads/${docName}`
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadDocuments", id] });
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setActiveModal(null);
      setDocName("");
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          type: "note",
          notes: noteText,
          title: "Internal Note"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
      setNoteText("");
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: async (actId: string) => {
      const res = await fetch(`/api/v1/activities/${actId}/pin`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
    }
  });

  if (isLoading) {
    return <div className="text-center font-bold py-16 text-on-surface-variant">Loading Customer 360 Workspace...</div>;
  }

  if (!lead) {
    return <div className="text-center font-bold py-16 text-error">Lead workspace not found.</div>;
  }

  // ─── Channel Relevance Calculations ──────────────────────────────────────────
  const hasWhatsAppActivity = activities.some((a: any) => a.type === "whatsapp_sms");
  const isWhatsAppRelevant =
    (lead.communicationChannel || "").toLowerCase() === "whatsapp" ||
    (lead.source || "").toLowerCase() === "whatsapp" ||
    !!lead.whatsappPhone ||
    hasWhatsAppActivity;

  const hasEmailActivity = activities.some((a: any) => (a.type || "").toLowerCase().includes("email"));
  const isSyntheticEmail = !!(lead.email && lead.email.endsWith("@whatsapp.local"));
  const hasRealEmail = !!(lead.email && !isSyntheticEmail);
  const isEmailRelevant = hasRealEmail || hasEmailActivity;

  const stages = pipelineStages?.map(s => s.stage) || [];
  const currentStageIndex = stages.indexOf(lead.status);

  // ─── Contact Activities & Risk Computation ───────────────────────────
  const contactActivities = activities.filter((a: any) => {
    const t = (a.type || "").toLowerCase();
    return (
      t.includes("call") ||
      t.includes("whatsapp") ||
      t.includes("email") ||
      t.includes("meeting") ||
      t.includes("sms")
    );
  });

  const lastContactActivity = contactActivities.length > 0
    ? contactActivities.reduce((latest: any, curr: any) => {
      const tCurr = new Date(curr.createdAt || curr.date || 0).getTime();
      const tLatest = new Date(latest.createdAt || latest.date || 0).getTime();
      return tCurr > tLatest ? curr : latest;
    }, contactActivities[0])
    : null;

  const lastContactDate = lastContactActivity
    ? new Date(lastContactActivity.createdAt || lastContactActivity.date)
    : null;

  const daysSinceLastContact =
    lastContactDate && !isNaN(lastContactDate.getTime())
      ? Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const hasActivities = activities.length > 0;

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-5 space-y-4">

      {/* 1. Maroon Executive Command Header — Single-Glance Operational Strip */}
      {(() => {
        const serviceNeeded =
          lead.serviceType ||
          lead.service ||
          lead.subject ||
          lead.requirements ||
          lead.requirement ||
          (lead.body ? (lead.body.length > 55 ? lead.body.slice(0, 55) + "…" : lead.body) : "Commercial Equipment & Power");

        const salesmanName =
          lead.assignedTo?.name ||
          salespersons?.find((s: any) => s.id === (lead.assignedToId || lead.assignedTo))?.name ||
          (typeof lead.assignedTo === "string" ? lead.assignedTo : null) ||
          "Unassigned";

        const formattedDateTime = lead.createdAt
          ? `${new Date(lead.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })} • ${new Date(lead.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
          : "Recently Ingested";

        return (
          <div className="bg-gradient-to-r from-[#45142B] via-[#4d1630] to-[#3a0e23] border border-[#5d1b3a] rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_32px_-6px_rgba(69,20,43,0.35)] text-white relative overflow-hidden">
            {/* Subtle atmospheric brand gradient overlay */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-[#ED1A53]/15 to-transparent pointer-events-none -mr-20 -mt-20 blur-2xl" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                {/* Top Nav & Status Pill */}
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-200/70 flex-wrap">
                  <Link to="/leads" className="hover:text-white flex items-center gap-1 font-bold text-rose-200 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Leads
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-300/40" />
                  <span className="font-mono font-bold text-rose-100">{lead.leadNumber || "LEAD-360"}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs ${lead.status === "CONVERTED" || lead.status === "Won"
                      ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                      : lead.status === "NOT_CONVERTED" || lead.status === "Lost"
                        ? "bg-rose-500/25 text-rose-200 border border-rose-400/40"
                        : "bg-white/15 text-white border border-white/20 font-mono"
                    }`}>
                    {lead.status || "NEW"}
                  </span>
                  <LeadCampaignBadge attribution={lead.campaignAttribution} />

                  {/* High-Density Missing Info Pill */}
                  {missingInfo && !missingInfo.isComplete && (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[11px] font-bold text-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Missing: {missingInfo.missing?.join(", ") || "Email & Phone"}</span>
                      <button
                        onClick={() => requestDetailsMutation.mutate(undefined)}
                        disabled={requestDetailsMutation.isPending}
                        className="ml-1 text-[10px] text-amber-200 font-extrabold underline hover:text-white cursor-pointer"
                        title="Dispatch automated request for contact details"
                      >
                        {requestDetailsMutation.isPending ? "Sending..." : "Request Details"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Lead Name & Operational Details on ONE Sleek Compact Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight shrink-0">
                    {(lead.firstName || lead.lastName ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() : "Unnamed Lead").replace(/&amp;/g, "&")}
                  </h1>
                  {lead.company && (
                    <span className="text-sm font-semibold text-rose-200/90 truncate shrink-0">
                      • {lead.company.replace(/&amp;/g, "&")}
                    </span>
                  )}

                  {/* Elegant Vertical Divider */}
                  <div className="hidden md:block h-4 w-px bg-white/25 mx-1 shrink-0" />

                  {/* 1. Service Needed */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] text-white backdrop-blur-xs transition-colors shrink-0">
                    <Briefcase className="w-3 h-3 text-[#ED1A53] shrink-0" />
                    <span className="text-[9px] uppercase font-bold text-rose-200/70">Service:</span>
                    <span className="font-bold text-white truncate max-w-[200px]" title={serviceNeeded}>
                      {serviceNeeded}
                    </span>
                  </div>

                  {/* 2. Handled By Salesman */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] text-white backdrop-blur-xs transition-colors shrink-0">
                    <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[9px] uppercase font-bold text-rose-200/70">Handled By:</span>
                    <span className="font-bold text-white truncate">
                      {salesmanName}
                    </span>
                  </div>

                  {/* 3. Date & Time Ingested */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] text-white backdrop-blur-xs transition-colors shrink-0">
                    <Clock className="w-3 h-3 text-amber-300 shrink-0" />
                    <span className="text-[9px] uppercase font-bold text-rose-200/70">Received:</span>
                    <span className="font-bold text-white">
                      {formattedDateTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Convert to Deal */}
              <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
                {lead.status !== "CONVERTED" && lead.status !== "NOT_CONVERTED" && lead.status !== "Won" && lead.status !== "Lost" ? (
                  <button
                    onClick={handleOpenConversionModal}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#f32b62] hover:to-[#c41240] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-black/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all border border-rose-400/30"
                  >
                    <Target className="w-4 h-4" />
                    <span>Convert to Deal</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 backdrop-blur-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {lead.status === "CONVERTED" || lead.status === "Won" ? "Converted" : "Not Converted"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Status Rejection Error Banner */}
      {statusErrorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{statusErrorMessage}</span>
          </div>
          <button onClick={() => setStatusErrorMessage(null)} className="text-rose-500 hover:text-rose-700 text-sm font-bold">×</button>
        </div>
      )}

      {/* Site Inspection Gate Blocked Banner */}
      {gateBlockedBanner && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lead Qualification Gate Locked</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">{gateBlockedBanner}</p>
              {inspection?.id ? (
                <Link
                  to={`/site-inspections/${inspection.id}`}
                  className="inline-flex items-center gap-1 font-bold text-[#ED1A53] hover:underline mt-1"
                >
                  <span>Open Site Inspection &amp; Assessment Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("site-inspection-card-section");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                      el.classList.add("ring-4", "ring-[#ED1A53]/50", "rounded-2xl");
                      setTimeout(() => el.classList.remove("ring-4", "ring-[#ED1A53]/50", "rounded-2xl"), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1 font-bold text-[#ED1A53] hover:underline mt-1 cursor-pointer"
                >
                  <span>⚡ Request On-Site Technical Sizing Audit ➔</span>
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setGateBlockedBanner(null)} className="text-amber-600 hover:text-amber-800 font-bold text-sm">×</button>
        </div>
      )}

      {/* 2. Sleek Segmented Pipeline Progression Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] p-2 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.06)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">

          {/* Linked Chevron / Pill Segmented Path */}
          {(() => {
            const workflowStages = requiresSiteInspection
              ? [
                { key: "NEW", num: "1", label: "New Enquiry", desc: "Ingested" },
                { key: "CONTACTED", num: "2", label: "Contacted", desc: "Outreach" },
                { key: "SITE_INSPECTION", num: "3", label: "Site Inspection", desc: inspection?.status === "APPROVED" ? "Approved" : inspection?.status ? getStatusStyle(inspection.status).label : "Required" },
                { key: "QUALIFIED", num: "4", label: "Qualified", desc: "Needs & Budget" },
                { key: "CONVERTED", num: "5", label: "Converted", desc: "Deal Created" },
              ]
              : [
                { key: "NEW", num: "1", label: "New Enquiry", desc: "Ingested" },
                { key: "CONTACTED", num: "2", label: "Contacted", desc: "Outreach" },
                { key: "QUALIFIED", num: "3", label: "Qualified", desc: "Needs & Budget" },
                { key: "CONVERTED", num: "4", label: "Converted", desc: "Deal Created" },
              ];
            const totalStages = workflowStages.length;
            const gridCols = totalStages === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4";
            return (
              <div className={`flex-1 grid ${gridCols} gap-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl overflow-hidden p-1 border border-slate-200/70 dark:border-slate-700/60`}>
                {workflowStages.map((stage, idx) => {
                  const currentStatus = (lead.status || "NEW").toUpperCase();
                  const isNotConverted = currentStatus === "NOT_CONVERTED" || currentStatus === "LOST";
                  const isApproved = inspection?.status === "APPROVED";

                  let isCurrent = false;
                  let isPast = false;

                  if (stage.key === "NEW") {
                    isCurrent = currentStatus === "NEW";
                    isPast = currentStatus !== "NEW" && !isNotConverted;
                  } else if (stage.key === "CONTACTED") {
                    isCurrent = currentStatus === "CONTACTED" && !isApproved;
                    isPast = ["QUALIFIED", "CONVERTED"].includes(currentStatus) || (currentStatus === "CONTACTED" && isApproved);
                  } else if (stage.key === "SITE_INSPECTION") {
                    isCurrent = currentStatus === "CONTACTED" && !isApproved;
                    isPast = isApproved || ["QUALIFIED", "CONVERTED"].includes(currentStatus);
                  } else if (stage.key === "QUALIFIED") {
                    isCurrent = currentStatus === "QUALIFIED";
                    isPast = currentStatus === "CONVERTED";
                  } else if (stage.key === "CONVERTED") {
                    isCurrent = currentStatus === "CONVERTED";
                    isPast = false;
                  }

                  const handleStageClick = () => {
                    if (stage.key === "SITE_INSPECTION") {
                      if (inspection?.id) {
                        navigate(`/site-inspections/${inspection.id}`);
                      } else {
                        const el = document.getElementById("site-inspection-card-section");
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-4", "ring-[#ED1A53]/50", "rounded-2xl");
                          setTimeout(() => el.classList.remove("ring-4", "ring-[#ED1A53]/50", "rounded-2xl"), 2000);
                        } else {
                          navigate("/site-inspections");
                        }
                      }
                      return;
                    }
                    if ((stage.key === "QUALIFIED" || stage.key === "CONVERTED") && gate && !gate.allowed) {
                      setGateBlockedBanner(gate.message);
                      return;
                    }
                    setStatusErrorMessage(null);
                    updateStatusMutation.mutate(stage.key);
                  };

                  return (
                    <div key={stage.key} className="relative flex items-center flex-1">
                      <button
                        onClick={handleStageClick}
                        className={`w-full group relative flex items-center gap-2 py-2 px-2.5 rounded-lg transition-all duration-150 cursor-pointer select-none ${isCurrent
                            ? "bg-[#45142B] dark:bg-[#45142B] text-white font-extrabold shadow-sm z-20"
                            : isPast
                              ? "bg-emerald-50/90 dark:bg-emerald-950/40 hover:bg-emerald-100/90 text-emerald-900 dark:text-emerald-300 z-10"
                              : "bg-transparent hover:bg-white/70 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400"
                          }`}
                        title={`Click to set stage to ${stage.label}`}
                      >
                        {/* Checkpoint Node Circle */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs ${isCurrent
                              ? "bg-white text-[#45142B]"
                              : isPast
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                        >
                          {isPast ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <span>{stage.num}</span>
                          )}
                        </div>

                        {/* Step Label & Sub-status */}
                        <div className="min-w-0 flex-1 text-left">
                          <p className={`text-xs font-black truncate leading-tight ${isCurrent ? "text-white" : isPast ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                            {stage.label}
                          </p>
                          <span className={`text-[9px] block truncate ${isCurrent ? "text-rose-200" : isPast ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-400"}`}>
                            {isCurrent ? "Active Step" : isPast ? "Done" : stage.desc}
                          </span>
                        </div>
                      </button>

                      {/* Arrowhead Divider between steps on desktop */}
                      {idx < totalStages - 1 && (
                        <div className="hidden sm:flex items-center absolute -right-2 z-30 pointer-events-none">
                          <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] ${isPast ? "text-emerald-500" : isCurrent ? "text-rose-300" : "text-slate-300 dark:text-slate-600"}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Separate Disqualified / Lost Step Action */}
          {(() => {
            const currentStatus = (lead.status || "NEW").toUpperCase();
            const isNotConverted = currentStatus === "NOT_CONVERTED" || currentStatus === "LOST";

            return (
              <button
                onClick={() => updateStatusMutation.mutate("NOT_CONVERTED")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${isNotConverted
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-500/50"
                    : "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700"
                  }`}
                title="Mark lead as Not Converted / Lost"
              >
                <XCircle className={`w-3.5 h-3.5 ${isNotConverted ? "text-white" : "text-rose-500"}`} />
                <span>{isNotConverted ? "Lost" : "Close Lost"}</span>
              </button>
            );
          })()}

        </div>
      </div>

      {/* 3. UNIFIED AI TECHNICAL LOAD SIZING & COMMERCIAL SCOPE ADVISORY (Normal Card Theme) */}
      {(() => {
        const bodyText = `${lead.body || ""} ${lead.notes || ""} ${lead.industry || ""}`.toLowerCase();
        const qual = lead.qualificationData || {};
        const isMotorOrPower =
          qual.detectedMotorLoad ||
          bodyText.includes("pump") ||
          bodyText.includes("motor") ||
          bodyText.includes("dewatering") ||
          bodyText.includes("crane") ||
          bodyText.includes("generator") ||
          bodyText.includes("kva") ||
          bodyText.includes("kw");

        const channelLabel =
          lead.source?.toLowerCase().includes("whatsapp") ? "WhatsApp Inbound" :
            lead.source?.toLowerCase().includes("instagram") ? "Instagram Direct Message" :
              lead.source?.toLowerCase().includes("website") ? "Website Sizing Form" :
                `${lead.source || "Omnichannel"} Inbound`;

        const appName = qual.applicationType || (bodyText.includes("pump") || bodyText.includes("dewatering") ? "Dewatering & Submersible Pumps" : bodyText.includes("crane") ? "Tower Cranes & Hoists" : "Industrial Temporary Power");
        const recKva = qual.recommendedKva || 250;

        const deliverables: string[] = aiSummary?.primaryDeliverables || [];
        const specs: string[] = aiSummary?.technicalSpecs || [];
        const intentScore: number | null = typeof aiSummary?.intentScore === "number" ? aiSummary.intentScore : (lead.leadScore ? Math.min(95, lead.leadScore + 20) : 85);
        const budgetBenchmark = aiSummary?.budgetAndCommercials || aiSummary?.budgetBenchmark || (lead.budget ? (typeof lead.budget === "number" ? `SAR ${lead.budget.toLocaleString()}` : String(lead.budget).startsWith("SAR") ? lead.budget : `SAR ${lead.budget}`) : "SAR 150,000");
        const deliveryTimeline = aiSummary?.timelineAndConstraints || aiSummary?.deliveryTimeline || "Standard 30-day quote validity";
        const winProb = hasActivities ? Math.min(95, Math.max(30, Math.round((lead.leadScore || 50) * 1.3))) : 65;
        const rawQuote = aiSummary?.coreRequest || aiSummary?.rawSummaryText || lead.body || "";

        return (
          <div className="bg-white dark:bg-slate-900 border-2 border-[#E5D4DE] dark:border-[#551938]/40 rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-2px_rgba(85,25,56,0.05)] text-slate-900 dark:text-slate-100 space-y-2.5">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#F0E4EC] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F8F4F6] text-[#551938] dark:bg-slate-800 dark:text-rose-300 border border-[#E5D4DE] dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#EEDFE8] text-[#551938] dark:bg-slate-800 dark:text-rose-300 border border-[#DECAD7]">
                      Pre-Sales Sizing
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      AI Technical Load Sizing &amp; Scope Advisory
                    </h3>
                    {isMotorOrPower && (
                      <span className="text-[9px] font-bold bg-rose-50 dark:bg-rose-950 text-[#ED1A53] dark:text-rose-300 border border-rose-200/60 px-1.5 py-0.2 rounded-full font-mono">
                        ⚡ Motor Inrush Protection
                      </span>
                    )}
                    {intentScore !== null && (
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 px-1.5 py-0.2 rounded-full">
                        🎯 Intent: <strong className="text-[#ED1A53] dark:text-rose-400">{intentScore}%</strong>
                      </span>
                    )}
                    <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                      Win Prob: <strong className="text-emerald-600 dark:text-emerald-400">{winProb}%</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ingested via <b>{channelLabel}</b> • Application: <b>{appName}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDiscoveryGuide(!showDiscoveryGuide)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border active:scale-95 cursor-pointer ${showDiscoveryGuide
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
                    }`}
                  title="Open 5-Minute Technical Discovery Call Checklist"
                >
                  <Phone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>5-Min Discovery Call {showDiscoveryGuide ? "▲" : "▼"}</span>
                </button>

                {(specs.length > 0 || deliverables.length > 0 || rawQuote) && (
                  <button
                    type="button"
                    onClick={() => setShowFullSpecs(!showFullSpecs)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-200/80 dark:border-slate-700 active:scale-95 cursor-pointer"
                    title={showFullSpecs ? "Hide full specs" : "Show full specifications & deliverables"}
                  >
                    <span>{showFullSpecs ? "Less" : "Full Specs"}</span>
                    {showFullSpecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}

                <Link
                  to={`/rental-cpq/builder?leadId=${lead.id}&kVA=${recKva}`}
                  className="px-3 py-1 rounded-lg bg-[#ED1A53] hover:bg-[#d81248] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-[#ED1A53]/25 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Configure {recKva} kVA in CPQ ↗</span>
                </Link>
              </div>
            </div>

            {/* 4-Pillar High-Density Metric Grid (Compact Space-Efficient Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {/* Pillar 1: Client Scope & Application */}
              <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-purple-100/80 dark:border-purple-950/60 rounded-xl flex flex-col justify-between space-y-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Package className="w-3 h-3 text-[#ED1A53]" /> Client Stated Scope
                  </span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 mt-0.5" title={lead.body || "Need urgent temporary power for site operation"}>
                    {lead.body || "Need urgent temporary power for site operation"}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                  <span className="truncate">Scope: {deliverables[0] || "Turnkey Rental Package"}</span>
                  <span className="text-[#ED1A53] dark:text-rose-400 font-bold shrink-0 ml-1">3 mos</span>
                </div>
              </div>

              {/* Pillar 2: Engineering Inrush & Sizing */}
              <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-purple-100/80 dark:border-purple-950/60 rounded-xl flex flex-col justify-between space-y-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Inrush &amp; Surge Sizing
                  </span>
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white mt-0.5 truncate">
                    {isMotorOrPower ? "2.5x–3.5x DOL Motor Inrush" : "Continuous Duty Sizing"}
                  </p>
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center gap-1 font-medium">
                  <span>⚠️ 400V 50 Hz verified</span>
                </div>
              </div>

              {/* Pillar 3: Recommended Fleet Package */}
              <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-purple-100/80 dark:border-purple-950/60 rounded-xl flex flex-col justify-between space-y-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-500" /> Recommended Fleet
                  </span>
                  <p className="font-black text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                    {recKva} kVA Prime Soundproof
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Tier: Heavy Ind.</span>
                  <span>Alt: 150 kVA</span>
                </div>
              </div>

              {/* Pillar 4: Commercial Target & Budget */}
              <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-slate-800/40 border border-purple-100/80 dark:border-purple-950/60 rounded-xl flex flex-col justify-between space-y-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-[#ED1A53]" /> Commercial Target
                  </span>
                  <p className="font-black text-xs text-slate-900 dark:text-white mt-0.5 font-mono truncate">
                    {budgetBenchmark}
                  </p>
                </div>
                <div className="text-[10px] text-[#ED1A53] dark:text-rose-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between font-bold">
                  <span>100% Advance</span>
                  <span className="text-slate-400 font-normal">30-day val.</span>
                </div>
              </div>
            </div>

            {/* Interactive 5-Minute Discovery Call Checklist */}
            {showDiscoveryGuide && (
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-3 text-xs animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-200/60 dark:border-amber-900/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px]">
                      5-Minute Consultative Discovery Call Guide (Sophia ➔ Client)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Ask {lead.firstName || "Tariq"} these 3 quick questions before quoting</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Question 1: Duty Cycle */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-800/50 space-y-1.5 shadow-2xs">
                    <label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                      1. Duty Cycle (Continuous vs Cycling)
                    </label>
                    <select
                      value={discoveryDuty}
                      onChange={(e: any) => setDiscoveryDuty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="continuous">Continuous 24/7 Heavy Load</option>
                      <option value="intermittent">Intermittent / Cycling / Night Noise Limit</option>
                    </select>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                      {discoveryDuty === "continuous"
                        ? "➔ Recommend Pure Diesel Generator (250 kVA Prime) with 2,500L External Tank."
                        : "➔ Recommend 150 kVA Hybrid Battery Storage (BESS) + Inverter. Cuts diesel consumption by 60% and avoids engine wet-stacking."}
                    </p>
                  </div>

                  {/* Question 2: Grid Voltage & Frequency */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-800/50 space-y-1.5 shadow-2xs">
                    <label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                      2. Frequency &amp; Voltage Standard
                    </label>
                    <select
                      value={discoveryHz}
                      onChange={(e: any) => setDiscoveryHz(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="400V_50Hz">400V / 230V @ 50 Hz (Standard KSA)</option>
                      <option value="480V_60Hz">480V @ 60 Hz (Saudi Aramco / US Spec)</option>
                      <option value="220_380V_60Hz">380V / 220V @ 60 Hz (SEC Grid)</option>
                    </select>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium leading-snug">
                      ⚠️ Crucial check: Sending 50 Hz to a 60 Hz pump motor burns out the coils within 30 minutes!
                    </p>
                  </div>

                  {/* Question 3: Starting Method & Nameplate */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-800/50 space-y-1.5 shadow-2xs">
                    <label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                      3. Motor Starting Method
                    </label>
                    <select
                      value={discoveryMethod}
                      onChange={(e: any) => setDiscoveryMethod(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="DOL">Direct-On-Line (DOL, 6x Inrush Surge)</option>
                      <option value="SOFT_STARTER">Soft Starter (2.5x Surge)</option>
                      <option value="VFD">Variable Frequency Drive (VFD, 1.2x Smooth)</option>
                    </select>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={discoveryNameplateCheck}
                        onChange={(e) => setDiscoveryNameplateCheck(e.target.checked)}
                        className="rounded accent-[#ED1A53]"
                      />
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        WhatsApp Pump Nameplate Photo Requested
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Full Specs & Deliverables Accordion */}
            {showFullSpecs && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3 text-xs animate-fade-in">
                {rawQuote && (
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border-l-2 border-[#ED1A53] pl-3 py-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Client Request Snippet:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 italic font-medium">
                      &ldquo;{rawQuote}&rdquo;
                    </p>
                  </div>
                )}

                {(specs.length > 0 || deliverables.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {deliverables.length > 0 && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700 shadow-2xs">
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
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700 shadow-2xs">
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
          </div>
        );
      })()}

      {/* 5. Clean 2-Column Workspace */}
      <div className="grid grid-cols-12 gap-6 items-start">

        {/* SIDEBAR: Site Inspection + Dossier Smart Stack + Tasks */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          {/* Site Inspection Card */}
          <div id="site-inspection-card-section">
            <SiteInspectionCard leadId={id!} leadStatus={lead?.status} />
          </div>

          {/* ── BUNDLED DOSSIER SMART STACK (iOS Widget Bundle) ── */}
          {/* Bundles Customer Details, Campaign Attribution, and Company Intelligence into an expandable stack */}
          <DossierSmartStack
            title="Dossier & Company Intel"
            defaultTab="customer"
            items={[
              {
                id: "customer",
                label: "Customer Details",
                shortLabel: "Customer",
                icon: <User className="w-3.5 h-3.5" />,
                badge: lead.source || "Inbound",
                content: (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Contact & Account Information
                      </h4>
                      <button
                        onClick={() => setIsEditingDetails(!isEditingDetails)}
                        className="p-1 text-slate-400 hover:text-[#ED1A53] rounded-lg transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        {isEditingDetails ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </button>
                    </div>

                    {isEditingDetails ? (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Project Name</label>
                          <input
                            type="text"
                            value={editProjectName}
                            onChange={e => setEditProjectName(e.target.value)}
                            className="enterprise-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Expected Value ($)</label>
                          <input
                            type="number"
                            value={editExpectedValue}
                            onChange={e => setEditExpectedValue(e.target.value)}
                            className="enterprise-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                          <input
                            type="email"
                            placeholder="e.g. client@company.com"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="enterprise-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                          <input
                            type="text"
                            placeholder="e.g. +919876543210"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="enterprise-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                          <textarea
                            rows={3}
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            className="enterprise-input w-full"
                          />
                        </div>
                        {/* Site Inspection Required Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Site Inspection Required</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Enable for Waste Management / Disposal services. Disable for Equipment Rental, Procurement, etc.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              toggleSiteInspectionMutation.mutate(!lead.requiresSiteInspection)
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lead.requiresSiteInspection
                                ? "bg-blue-600"
                                : "bg-slate-300 dark:bg-slate-600"
                              }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${lead.requiresSiteInspection ? "translate-x-4" : "translate-x-1"
                                }`}
                            />
                          </button>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={() => setIsEditingDetails(false)}
                            className="enterprise-btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateDetailsMutation.mutate()}
                            className="enterprise-btn-primary text-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{lead.company || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Person</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.firstName} {lead.lastName}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                          <span className="font-medium text-blue-600 break-all flex items-center gap-1">
                            {lead.email || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {lead.phone || lead.whatsappPhone || "N/A"}
                            </span>
                            {lead.optedOutWhatsapp && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-600" /> WhatsApp Opted Out
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Consent</span>
                            {(() => {
                              const status = (lead.whatsappConsentStatus || "UNSPECIFIED").toUpperCase();
                              if (status === "OPTED_IN" && !lead.optedOutWhatsapp) {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                    Opted in {lead.whatsappConsentSource ? `(${lead.whatsappConsentSource})` : ""}
                                  </span>
                                );
                              }
                              if (status === "OPTED_OUT" || lead.optedOutWhatsapp) {
                                return (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
                                    Opted out
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                                  Not specified
                                </span>
                              );
                            })()}
                          </div>

                          {!isRecordingConsent ? (
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[11px] text-slate-500">
                                {lead.whatsappConsentStatus === "OPTED_IN" && lead.whatsappOptInAt
                                  ? `Recorded ${formatDistanceToNow(new Date(lead.whatsappOptInAt), { addSuffix: true })}`
                                  : "No verified consent on record"}
                              </span>
                              <button
                                onClick={() => setIsRecordingConsent(true)}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                              >
                                Record consent
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px]">Record WhatsApp Consent</span>
                                <button
                                  onClick={() => setIsRecordingConsent(false)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Consent Source <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={consentSource}
                                  onChange={(e: any) => setConsentSource(e.target.value)}
                                  className="w-full text-xs bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg p-1.5 focus:outline-none"
                                >
                                  <option value="verbal">Verbal (Call / In-Person)</option>
                                  <option value="written">Written (Email / Chat / Letter)</option>
                                  <option value="form">Form (Online / Offline Form)</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsRecordingConsent(false)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={recordConsentMutation.isPending}
                                  onClick={() => recordConsentMutation.mutate(consentSource)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  {recordConsentMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Save Consent
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.source || "Inbound"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Value</span>
                            {(() => {
                              const realVal =
                                lead.estimatedValue ??
                                lead.expectedValue ??
                                lead.opportunity?.amount ??
                                lead.deal?.amount;
                              if (
                                realVal !== undefined &&
                                realVal !== null &&
                                realVal !== "" &&
                                !isNaN(Number(realVal)) &&
                                Number(realVal) > 0
                              ) {
                                return (
                                  <span className="font-bold text-emerald-600">
                                    {formatCurrency(Number(realVal))}
                                  </span>
                                );
                              }
                              if (lead.budgetRange) {
                                return (
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {lead.budgetRange}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-slate-400 dark:text-slate-500 font-medium">
                                  Not estimated
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Owner Assignee */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Representative</span>
                        <button
                          onClick={() => setIsReassigning(!isReassigning)}
                          className="text-xs text-blue-600 font-bold hover:underline"
                        >
                          {isReassigning ? "Cancel" : "Reassign"}
                        </button>
                      </div>

                      {isReassigning ? (
                        <div className="space-y-2 text-xs">
                          <select
                            value={newAssigneeId}
                            onChange={(e) => setNewAssigneeId(e.target.value)}
                            className="enterprise-input w-full"
                          >
                            <option value="">Select Salesperson</option>
                            {salespersons?.map((sp: any) => (
                              <option key={sp.id} value={sp.id}>{sp.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => reassignMutation.mutate()}
                            className="w-full py-1.5 enterprise-btn-primary text-xs font-bold"
                          >
                            Confirm Reassign
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                          {(() => {
                            const repName = lead.assignedTo?.name || salespersons?.find((s: any) => s.id === (lead.assignedToId || lead.assignedTo))?.name || (typeof lead.assignedTo === "string" ? lead.assignedTo : null);
                            return (
                              <>
                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                  {repName ? repName.substring(0, 2).toUpperCase() : "UN"}
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{repName || "Unassigned"}</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              },
              {
                id: "attribution",
                label: "Campaign Attribution",
                shortLabel: "Attribution",
                icon: <Target className="w-3.5 h-3.5" />,
                badge: "Touchpoints",
                badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
                content: (
                  <LeadAttributionCard leadId={id!} embedded={true} />
                )
              },
              {
                id: "intelligence",
                label: "Company Intelligence",
                shortLabel: "Company Intel",
                icon: <Building2 className="w-3.5 h-3.5" />,
                badge: (lead.enrichmentStatus === "enriched" ? "Enriched" : lead.enrichmentStatus === "pending" ? "Fetching" : null),
                badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                content: (() => {
                  const status = lead.enrichmentStatus as string;

                  if (status === "pending") {
                    return (
                      <div className="space-y-3 py-2">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Enriching via Hunter.io…</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">Live</span>
                        </div>
                        <div className="space-y-2.5 animate-pulse pt-1">
                          {[85, 60, 75, 50, 90].map((w, i) => (
                            <div key={i} className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full" style={{ width: `${w}%` }} />
                          ))}
                          <p className="text-[10px] text-slate-400 text-center pt-2">Fetching company data from Hunter.io…</p>
                        </div>
                      </div>
                    );
                  }

                  const enriched = lead.enrichmentData ? (() => { try { return JSON.parse(lead.enrichmentData); } catch { return null; } })() : null;
                  const hasMeaningfulData = Boolean(
                    enriched &&
                    (enriched.industry || enriched.sector || enriched.sizeRange || enriched.employeeCount || enriched.foundedYear || enriched.country || enriched.city || enriched.companyType || enriched.description || enriched.linkedinHandle)
                  );

                  if (!hasMeaningfulData || status !== "enriched") {
                    return (
                      <div className="py-6 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No enriched data available</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Enrich domain with Hunter.io intelligence</p>
                        </div>
                        <button
                          id="btn-reenrich-lead-empty"
                          onClick={() => reEnrichMutation.mutate()}
                          disabled={reEnrichMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${reEnrichMutation.isPending ? "animate-spin" : ""}`} />
                          <span>{reEnrichMutation.isPending ? "Enriching…" : "Enrich Company"}</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 text-xs pt-1">
                      {enriched.industry && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">Industry</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{enriched.industry}</span>
                        </div>
                      )}
                      {enriched.sector && enriched.sector !== enriched.industry && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">Sector</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{enriched.sector}</span>
                        </div>
                      )}
                      {(enriched.sizeRange || enriched.employeeCount) && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">Headcount</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {enriched.employeeCount ? enriched.employeeCount.toLocaleString() : enriched.sizeRange}
                            {enriched.sizeRange && enriched.employeeCount && <span className="text-slate-400 ml-1">({enriched.sizeRange})</span>}
                          </span>
                        </div>
                      )}
                      {enriched.foundedYear && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">Founded</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{enriched.foundedYear}</span>
                        </div>
                      )}
                      {enriched.country && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">HQ</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {[enriched.city, enriched.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {enriched.companyType && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-medium shrink-0">Type</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-right">{enriched.companyType}</span>
                        </div>
                      )}
                      {enriched.linkedinHandle && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-400 font-medium shrink-0">LinkedIn</span>
                          <a
                            href={`https://linkedin.com/${enriched.linkedinHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 text-right"
                          >
                            View profile <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {enriched.description && (
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{enriched.description}</p>
                        </div>
                      )}
                      {enriched.tags && enriched.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {enriched.tags.slice(0, 5).map((tag: string) => (
                            <span key={tag} className="text-[10px] bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-2 py-0.5 rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Re-enrich button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {lead.enrichedAt ? `Updated ${new Date(lead.enrichedAt).toLocaleDateString()}` : "via Hunter.io"}
                        </span>
                        <button
                          id="btn-reenrich-lead"
                          onClick={() => reEnrichMutation.mutate()}
                          disabled={reEnrichMutation.isPending}
                          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${reEnrichMutation.isPending ? "animate-spin" : ""}`} />
                          <span>{reEnrichMutation.isPending ? "Enriching…" : "Re-enrich"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              }
            ]}
          />
        </div>

        {/* CENTER / MAIN PANEL: Organized into Clean Horizontal Tabs */}
        <div id="activity-timeline" className="col-span-12 lg:col-span-8 flex flex-col gap-4">

          {/* Prominent Inbound Inquiry / Form Summary Banner */}
          {(lead.body || lead.subject) && (
            <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Submitted Inbound Inquiry & Requirements</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                    {lead.source || "Inbound"}
                  </span>
                  {lead.sourceDetail && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {lead.sourceDetail}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/80 whitespace-pre-line">
                {lead.body || lead.subject}
              </p>
            </div>
          )}

          {/* Clean Horizontal Tabs Header (matching Pipeline Kanban & Stitch UI) */}
          <div className="bg-slate-200/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/80 dark:border-slate-700/80 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "timeline"
                  ? "bg-[#45142B] text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              Activity &amp; Notes ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "history"
                  ? "bg-[#45142B] text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              Audit History
            </button>
            <button
              onClick={() => setActiveTab("handoff_chat")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "handoff_chat"
                  ? "bg-[#45142B] text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              Handoff Chat (Internal)
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "tasks"
                  ? "bg-[#45142B] text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Open Tasks ({tasks.filter((t: any) => t.status !== "Completed").length})</span>
            </button>
          </div>

          {/* TAB 1: ACTIVITY & NOTES */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border-2 border-[#E5D4DE] dark:border-[#551938]/40 rounded-[20px] p-4 sm:p-5 space-y-4 flex flex-col shadow-[0_4px_20px_-2px_rgba(85,25,56,0.05)]">

                {/* Timeline Header & Filters */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-primary" /> Activity Timeline
                    </h3>
                    <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                      {activities.length}
                    </span>
                  </div>

                  {/* Filter Links */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                    {[
                      { key: "all", label: "All", show: true },
                      { key: "note", label: "Notes", show: true },
                      { key: "call", label: "Calls", show: true },
                      { key: "email", label: "Emails", show: isEmailRelevant },
                      { key: "task", label: "Tasks", show: true },
                      { key: "whatsapp", label: "WhatsApp", show: isWhatsAppRelevant },
                    ].filter(f => f.show).map(f => (
                      <button
                        key={f.key}
                        onClick={() => setActivityFilter(f.key)}
                        className={`transition-colors ${activityFilter === f.key
                            ? f.key === "whatsapp"
                              ? "text-emerald-600 font-black underline underline-offset-4"
                              : "text-primary font-bold underline underline-offset-4"
                            : "hover:text-foreground"
                          }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note Composer Bar */}
                {activityFilter !== "whatsapp" && (
                  <div className="flex gap-2 items-center bg-muted/40 p-1.5 rounded-xl border border-border/60">
                    <input
                      type="text"
                      placeholder="Add a quick note or comment..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex-1 bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (noteText.trim()) addNoteMutation.mutate();
                        }
                      }}
                    />
                    <button
                      disabled={!noteText.trim() || addNoteMutation.isPending}
                      onClick={() => addNoteMutation.mutate()}
                      className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-30 transition-all flex items-center gap-1 shrink-0 px-2.5 py-1.5 bg-primary/10 rounded-lg"
                    >
                      <Send className="w-3 h-3" /> Post
                    </button>
                  </div>
                )}

                {/* WhatsApp conversation banner */}
                {activityFilter === "whatsapp" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                      <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      WhatsApp conversation with{" "}
                      <span className="font-black">{lead.firstName} {lead.lastName}</span>
                      {lead.whatsappPhone || lead.phone ? (
                        <span className="text-emerald-600 font-mono ml-auto">{lead.whatsappPhone || lead.phone}</span>
                      ) : null}
                    </div>
                    {lead.optedOutWhatsapp && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Recipient has opted out of WhatsApp messaging (replied STOP). Outbound WhatsApp messages cannot be sent.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scrollable Feed Container */}
                <div className={`overflow-y-auto pr-2 max-h-[420px] scrollbar-thin scrollbar-thumb-slate-200 ${activityFilter === "whatsapp" ? "space-y-4 pt-2 pb-2" : "space-y-3 pt-1"}`}>
                  {activities.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold text-foreground/80">No activity yet</p>
                      <p className="text-[11px] text-muted-foreground">Log calls, emails, or notes to populate this timeline.</p>
                    </div>
                  ) : (
                    activities
                      .filter((act: any) => {
                        if (activityFilter === "all") return true;
                        if (activityFilter === "whatsapp") return act.type === "whatsapp_sms";
                        return (act.type || "").toLowerCase().includes(activityFilter);
                      })
                      .slice()
                      .sort((a: any, b: any) => {
                        if (activityFilter === "whatsapp") {
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        }
                        return 0;
                      })
                      .map((act: any) => {
                        if (act.type === "whatsapp_sms") {
                          const isIncoming = act.outcome === "message received";
                          const authorName = act.createdBy?.name || act.createdByUser?.name || "System Rep";
                          const timeAgo = formatDistanceToNow(new Date(act.createdAt), { addSuffix: true });
                          return (
                            <div key={act.id} className={`flex ${isIncoming ? "justify-start" : "justify-end"} gap-2.5 items-start`}>
                              {isIncoming && (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-3 shadow-2xs">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                                </div>
                              )}
                              <div className={`max-w-[75%] flex flex-col gap-1 ${isIncoming ? "items-start" : "items-end"}`}>
                                <span className="text-[10px] font-bold text-slate-500 px-1 select-none">
                                  {isIncoming ? `${lead.firstName} ${lead.lastName}` : authorName}
                                </span>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${isIncoming ? "bg-slate-100 border border-slate-200 text-slate-900 rounded-tl-xs" : "bg-emerald-600 text-white rounded-tr-xs"
                                  }`}>
                                  {act.mediaUrl && (
                                    <p className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${isIncoming ? "text-primary" : "text-white/90"}`}>
                                      <Upload className="w-3 h-3" /> Media attachment — <a href={act.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline">View</a>
                                    </p>
                                  )}
                                  <p className="whitespace-pre-line">{act.notes}</p>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium px-1">{timeAgo}</span>
                              </div>
                              {!isIncoming && (
                                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-3 shadow-2xs">
                                  <span className="text-[9px] font-black text-white">
                                    {authorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        const isPinned = act.pinned;
                        const authorName = act.createdBy?.name || act.createdByUser?.name || "System Rep";
                        const titleText = act.title || (act.type ? act.type.replace(/_/g, ' ') : "Activity");
                        const timeAgo = formatDistanceToNow(new Date(act.createdAt), { addSuffix: true });
                        const isDupOutcome = act.outcome && act.outcome.includes("Duplicate lead capture");
                        const rawContent = act.notes || (isDupOutcome ? "Lead captured from marketing channel." : act.outcome);

                        // Parse potential JSON arrays / objects cleanly
                        let parsedText = "";
                        let parsedItems: string[] = [];

                        if (rawContent) {
                          const trimmed = String(rawContent).trim();
                          if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
                            try {
                              const parsed = JSON.parse(trimmed);
                              if (Array.isArray(parsed)) {
                                parsedItems = parsed
                                  .map((item: any) => {
                                    if (typeof item === "string") return item;
                                    if (item && typeof item === "object") {
                                      return item.description || item.text || item.label || (item.type ? item.type.replace(/_/g, " ") : "");
                                    }
                                    return "";
                                  })
                                  .filter(Boolean);
                              } else if (parsed && typeof parsed === "object") {
                                if (parsed.description) parsedText = parsed.description;
                                else if (parsed.notes) parsedText = parsed.notes;
                                else if (parsed.message) parsedText = parsed.message;
                                else parsedItems = Object.entries(parsed).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
                              }
                            } catch {
                              parsedText = trimmed;
                            }
                          } else {
                            parsedText = trimmed;
                          }
                        }

                        const isAutomated = act.outcome?.includes("[AUTOMATED]") || act.outcome?.toLowerCase().includes("automated") || act.type === "stage_change";

                        // Activity Icons & Badges based on type
                        let typeIcon = <Activity className="w-3.5 h-3.5 text-blue-600" />;
                        let typeBg = "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
                        if (act.type === "note") {
                          typeIcon = <FileText className="w-3.5 h-3.5 text-indigo-600" />;
                          typeBg = "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
                        } else if (act.type === "call") {
                          typeIcon = <Phone className="w-3.5 h-3.5 text-emerald-600" />;
                          typeBg = "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                        } else if (act.type === "email") {
                          typeIcon = <Mail className="w-3.5 h-3.5 text-sky-600" />;
                          typeBg = "bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
                        } else if (act.type === "stage_change") {
                          typeIcon = <TrendingUp className="w-3.5 h-3.5 text-purple-600" />;
                          typeBg = "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
                        } else if (act.type === "meeting" || act.type === "task") {
                          typeIcon = <Calendar className="w-3.5 h-3.5 text-amber-600" />;
                          typeBg = "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                        }

                        return (
                          <div
                            key={act.id}
                            className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${isPinned
                                ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-2xs"
                                : "bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600"
                              }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  {typeIcon}
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">{authorName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${typeBg}`}>
                                  {titleText}
                                </span>
                                {act.direction && (
                                  <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 uppercase tracking-wider">
                                    {act.direction}
                                  </span>
                                )}
                                {isAutomated ? (
                                  <span className="text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Automated
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    Manual
                                  </span>
                                )}
                                {isPinned && (
                                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                    Pinned
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400 font-medium">
                                <span>{timeAgo}</span>
                                <button
                                  onClick={() => togglePinMutation.mutate(act.id)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                                  title={isPinned ? "Unpin note" : "Pin note to top"}
                                >
                                  <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-blue-600 text-blue-600" : ""}`} />
                                </button>
                              </div>
                            </div>

                            {/* Text Content */}
                            {act.type === "email" && act.outcome && act.outcome !== parsedText && (
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 pl-8">
                                {act.outcome}
                              </p>
                            )}
                            {parsedText && (
                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-line pl-8">
                                {parsedText}
                              </p>
                            )}

                            {/* Formatted Checklist Items */}
                            {parsedItems.length > 0 && (
                              <div className="pl-8 space-y-1 pt-1">
                                {parsedItems.map((item, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="font-semibold">{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Inline WhatsApp Chat Composer */}
                {activityFilter === "whatsapp" && (
                  lead.optedOutWhatsapp ? (
                    <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>WhatsApp composer disabled: recipient has opted out (Status: <strong>{lead.whatsappConsentStatus || "OPTED_OUT"}</strong>).</span>
                      </div>
                      {lead.whatsappOptOutAt && (
                        <span className="text-[10px] text-red-500/80 shrink-0">
                          {formatDistanceToNow(new Date(lead.whatsappOptOutAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Reply:</span>
                        {[
                          "Hi! Thanks for reaching out. How can we assist you with our Porta Cabin solutions today?",
                          "We've sent the requested catalog & specs. When would be a good time for a 5-min review call?",
                          "Would you be available for a quick site visit or video demo of our modular units?"
                        ].map((tpl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setWhatsAppText(tpl)}
                            className="px-2.5 py-1 rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors shrink-0 max-w-[220px] truncate font-medium text-[11px]"
                            title={tpl}
                          >
                            {tpl}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Send WhatsApp message to ${lead.firstName}...`}
                          value={whatsAppText}
                          onChange={(e) => setWhatsAppText(e.target.value)}
                          className="flex-1 bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (whatsAppText.trim()) sendWhatsAppMutation.mutate();
                            }
                          }}
                        />
                        <button
                          disabled={!whatsAppText.trim() || sendWhatsAppMutation.isPending}
                          onClick={() => sendWhatsAppMutation.mutate()}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS & MEETINGS */}
          {activeTab === "tasks" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] p-5 space-y-6 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.06)] text-xs">
              {/* Tasks section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <CheckSquare className="w-4 h-4 text-[#ED1A53]" /> Open Tasks &amp; Action Items ({tasks.filter((t: any) => t.status !== "Completed").length} Pending)
                  </h4>
                  <button onClick={() => setActiveModal("task")} className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95">
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-slate-400 italic py-2">No pending tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{task.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Priority: {task.priority} · Status: {task.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Meetings section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" /> Scheduled Meetings ({meetings.length})
                  </h4>
                  <button onClick={() => setActiveModal("meeting")} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Schedule
                  </button>
                </div>
                {meetings.length === 0 ? (
                  <p className="text-slate-400 italic py-2">No meetings scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {meetings.map((m: any) => (
                      <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{m.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.meetingDate} at {m.meetingTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" /> Attached Documents ({documents.length})
                  </h4>
                  <button onClick={() => setActiveModal("document")} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Upload
                  </button>
                </div>
                {documents.length === 0 ? (
                  <p className="text-slate-400 italic py-2">No documents attached.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((d: any) => (
                      <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{d.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{d.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY */}
          {activeTab === "history" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] p-5 space-y-4 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.06)] text-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Audit & Transition History</h3>
                <p className="text-xs text-slate-500">Chronological audit trail of ownership, stage updates, and system events</p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Current Lead Status: {lead.status || "NEW"}</span>
                      <span className="text-[11px] text-slate-400">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : "Recent"}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Assigned Owner: {lead.assignedTo?.name || "System Round Robin"}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Lead Ingested & Captured</span>
                      <span className="text-[11px] text-slate-400">{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "Initial"}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Channel: {lead.source || "Inbound Form"} {lead.sourceDetail ? `(${lead.sourceDetail})` : ""}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HANDOFF CHAT & TEAM DISCUSSIONS */}
          {activeTab === "handoff_chat" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[20px] p-5 space-y-6 shadow-[0_8px_24px_-4px_rgba(100,116,180,0.06)]">
              <CommentThreadSection leadId={id} />
              <HandoffChatWidget dealId={lead.convertedDealId || id} />
            </div>
          )}

        </div>

      </div>

      {/* QUICK ACTION MODALS */}

      {/* Call Log Modal */}
      {activeModal === "call" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" /> Log Call Interaction
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Direction</label>
                <select value={callDirection} onChange={e => setCallDirection(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs">
                  <option value="Outbound">Outbound</option>
                  <option value="Inbound">Inbound</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Duration (Seconds)</label>
                <input type="number" value={callDuration} onChange={e => setCallDuration(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Outcome</label>
                <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs">
                  <option value="Connected">Connected</option>
                  <option value="Left Voice Mail">Left Voice Mail</option>
                  <option value="Busy">Busy</option>
                  <option value="No Answer">No Answer</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Call Notes</label>
                <textarea rows={3} value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Summary of discussion..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-outline rounded font-bold text-xs">Cancel</button>
                <button onClick={() => logCallMutation.mutate()} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold text-xs">Save Call Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Call WhatsApp Summary Modal (No silent close — must send or log skip reason) */}
      {activeModal === "call-summary" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" /> Post-Call WhatsApp Summary
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Action Required
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-on-surface-variant font-medium">
                Target: <strong>{lead?.phone || lead?.whatsappPhone}</strong>
              </span>

              {/* Language Selector (Arabic / English) */}
              <div className="flex items-center gap-1 bg-surface border border-outline rounded-lg p-0.5">
                <button
                  onClick={() => setSummaryLanguage("ar")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${summaryLanguage === "ar" ? "bg-emerald-600 text-white" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                >
                  العربية (AR)
                </button>
                <button
                  onClick={() => setSummaryLanguage("en")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${summaryLanguage === "en" ? "bg-emerald-600 text-white" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                >
                  English (EN)
                </button>
              </div>
            </div>

            {whatsAppTemplateError && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  WhatsApp Business Template Guidance
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">{whatsAppTemplateError}</p>
              </div>
            )}

            {lead?.optedOutWhatsapp && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  WhatsApp Messaging Disabled
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">
                  Recipient has opted out of WhatsApp communications (STOP received). Outbound WhatsApp summaries cannot be sent. Please use "Skip &amp; Log Reason" to complete logging this call.
                </p>
              </div>
            )}

            {!isSkippingSummary ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">WhatsApp Message Summary</label>
                  <textarea
                    rows={4}
                    value={whatsAppText}
                    onChange={(e) => setWhatsAppText(e.target.value)}
                    className="w-full bg-surface border border-outline rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                    placeholder="Review and edit call summary before sending..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => setIsSkippingSummary(true)}
                    className="w-full sm:w-1/2 py-2 px-3 border border-outline rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Skip &amp; Log Reason
                  </button>
                  <button
                    onClick={() => sendWhatsAppMutation.mutate()}
                    disabled={sendWhatsAppMutation.isPending || !whatsAppText.trim() || lead?.optedOutWhatsapp}
                    className="w-full sm:w-1/2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    {sendWhatsAppMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Summary</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-red-700 mb-1">
                    Mandatory Reason for Skipping WhatsApp Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    placeholder="e.g. Customer explicitly requested no WhatsApp / Phone number not registered..."
                    className="w-full bg-surface border border-red-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => setIsSkippingSummary(false)}
                    className="w-full sm:w-1/2 py-2 px-3 border border-outline rounded-lg font-bold text-xs text-on-surface-variant hover:bg-surface-container"
                  >
                    ← Back to Send
                  </button>
                  <button
                    onClick={() => skipReason.trim() && skipCallSummaryMutation.mutate(skipReason.trim())}
                    disabled={!skipReason.trim() || skipCallSummaryMutation.isPending}
                    className="w-full sm:w-1/2 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {skipCallSummaryMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Confirm &amp; Log Skip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {activeModal === "email" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" /> Compose Email
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Recipient</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Subject</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Project Proposal / Follow-up..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Message Body</label>
                <textarea rows={5} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Dear Customer..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-outline rounded font-bold text-xs">Cancel</button>
                <button onClick={() => sendEmailMutation.mutate()} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-xs">Send Email</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {activeModal === "task" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-purple-600" /> Create Task
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Task Title</label>
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Follow up call..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Priority</label>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Due Date</label>
                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Description</label>
                <textarea rows={3} value={taskDescription} onChange={e => setTaskDescription(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-outline rounded font-bold text-xs">Cancel</button>
                <button onClick={() => createTaskMutation.mutate()} className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-bold text-xs">Save Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {activeModal === "meeting" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" /> Schedule Meeting
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Meeting Title</label>
                <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="Demo Presentation..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Date</label>
                  <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1">Time</label>
                  <input type="text" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Location / Video Link</label>
                <input type="text" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Google Meet / HQ Room 2" className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Agenda</label>
                <textarea rows={3} value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-outline rounded font-bold text-xs">Cancel</button>
                <button onClick={() => createMeetingMutation.mutate()} className="px-4 py-2 bg-amber-600 text-white rounded font-bold text-xs">Schedule Meeting</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {activeModal === "doc" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload Customer Document
              </h3>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">Document Name</label>
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Technical Specifications PDF..." className="w-full bg-surface border border-outline rounded p-2 text-xs" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1">FileType</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-surface border border-outline rounded p-2 text-xs">
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLSX">XLSX</option>
                  <option value="CAD/BOM">CAD / BOM</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-outline rounded font-bold text-xs">Cancel</button>
                <button onClick={() => uploadDocMutation.mutate()} className="px-4 py-2 bg-primary text-white rounded font-bold text-xs">Upload Document</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Drawer Modal */}
      <QualificationDrawer
        isOpen={isQualifyDrawerOpen}
        onClose={() => setIsQualifyDrawerOpen(false)}
        lead={lead}
        token={token}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["lead", id] });
          queryClient.invalidateQueries({ queryKey: ["leadActivities", id] });
        }}
      />

      {/* Structured Lead Conversion Modal */}
      {lead && (
        <LeadConversionModal
          isOpen={isConversionModalOpen}
          onClose={() => setIsConversionModalOpen(false)}
          lead={lead}
          onConverted={(res) => {
            queryClient.invalidateQueries({ queryKey: ["lead", id] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
          }}
        />
      )}
    </div>
  );
}
