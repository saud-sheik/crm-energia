import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, Bell, Sparkles, LogOut, Command, Shield, Moon, Sun, Monitor,
  LayoutDashboard, Home, Inbox, Trello, FileText, Receipt, Users, BarChart, Settings, Database, Clock, ChevronDown, Bot, ArrowUpRight, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { useVolviAssist } from "../context/VolviAssistContext";
import { siteInspectionApi } from "../api/siteInspection";
import { rentalContractApi } from "../modules/rental-contracts/rentalContractApi";
import { CommandPalette } from "./CommandPalette";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationDrawer } from "./NotificationDrawer";
import { QuickActionFab } from "./QuickActionFab";
import { AiCopilotDrawer } from "./AiCopilotDrawer";
import { DemoStoryGuide } from "./DemoStoryGuide";
import { TopWorkspaceNav } from "./TopWorkspaceNav";
import { Sidebar } from "./Sidebar";
import { ContextSwitchBar } from "./ContextSwitchBar";
import { WorkspaceTransition } from "./WorkspaceTransition";
import { OrbitProvider } from "../context/OrbitContext";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { brand } = useBrand();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { isAssistOpen, openAssist, closeAssist } = useVolviAssist();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
  });

  // Feature Flag: Sales Orbit vs Traditional Sidebar (default to orbit mode)
  const [useOrbitNav, setUseOrbitNav] = useState(() => {
    const saved = localStorage.getItem("use_orbit_nav");
    return saved === null ? true : saved === "true";
  });

  // Legacy sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === null ? true : saved === "true";
  });

  // Dark mode & Role color scheme toggle handler
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    if (user?.role === "sales_rep") {
      document.documentElement.classList.add("role-sales-rep");
    } else {
      document.documentElement.classList.remove("role-sales-rep");
    }
  }, [isDarkMode, user?.role]);

  useEffect(() => {
    localStorage.setItem("use_orbit_nav", String(useOrbitNav));
  }, [useOrbitNav]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "n") {
          e.preventDefault();
          navigate("/leads/new");
        } else if (key === "a") {
          e.preventDefault();
          navigate("/accounts");
        } else if (key === "p") {
          e.preventDefault();
          navigate("/pipeline");
        } else if (key === "r") {
          e.preventDefault();
          navigate("/ai-reports");
        } else if (key === "t") {
          e.preventDefault();
          navigate("/home");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch("/api/v1/notifications", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
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

  // Fetch approved site surveys requiring commercial CPQ quoting
  const { data: approvedSurveys = [] } = useQuery({
    queryKey: ["site-inspections-approved-layout"],
    queryFn: () => siteInspectionApi.listInspections({ status: "APPROVED" }),
    staleTime: 15000,
    enabled: !!token
  });

  const pendingContractCount = contracts.filter(
    (c: any) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "AWAITING_COMPANY_SIGNATURE"
  ).length;

  const unreadCount = notifications.filter(n => !n.isRead).length + pendingContractCount;

  // Active task notification for the top pop-up (prioritizes active contracts over already-quoted surveys)
  const activeTaskNotification = (() => {
    // 1. Highest priority: Contract awaiting signatures
    const pendingContract = contracts.find(
      (c: any) => c.status === "AWAITING_CLIENT_SIGNATURE" || c.status === "AWAITING_COMPANY_SIGNATURE"
    );
    if (pendingContract) {
      const clientName = pendingContract.deal?.name || pendingContract.account?.name || "saud (250 kVA)";
      const isCompanySign = pendingContract.status === "AWAITING_COMPANY_SIGNATURE";
      return {
        badge: isCompanySign ? "Director Countersign" : "Client Signature",
        title: `${pendingContract.contractNumber} • ${clientName}`,
        message: isCompanySign
          ? `Client signature verified. Apply Energia Director countersignature to activate contract & release dispatch.`
          : `Master rental contract generated. Click to apply authorized client digital signature.`,
        link: `/rental-contracts?tab=${isCompanySign ? "AWAITING_COMPANY_SIGNATURE" : "AWAITING_CLIENT_SIGNATURE"}`,
        actionLabel: isCompanySign ? "Countersign Contract" : "Sign Contract"
      };
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
      return {
        badge: "Survey Approved",
        title: `${clientOrg} • ${siteName}`,
        message: `Technical sizing & BOQ items verified (${kvaVal} kVA). Ready to generate commercial proposal in Step 4 CPQ.`,
        link: `/rental-cpq/builder?leadId=${s.leadId}&dealId=${s.dealId || ""}&kVA=${kvaVal}&cables=60&fuelTank=2500&site=${encodeURIComponent(siteName)}&fromSurvey=true`,
        actionLabel: "Generate Quote in CPQ"
      };
    }

    const unread = notifications.find(n => !n.isRead);
    if (unread) {
      return {
        badge: "Action Required",
        title: unread.title,
        message: unread.message,
        link: unread.link || "/pipeline",
        actionLabel: "Open Task Page"
      };
    }
    return null;
  })();

  const [isTopNotifOpen, setIsTopNotifOpen] = useState(true);

  const initials = user?.name 
    ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() 
    : "U";

  return (
    <OrbitProvider>
      <div className={`flex flex-col h-screen w-full font-sans overflow-hidden transition-colors duration-300 ${
        brand.isEnergia ? "bg-[#FAF6F8] text-slate-900" : "bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      }`}>
        {/* MAIN CONTENT AREA CONTAINER WITH PERSISTENT SIDEBAR */}
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            onOpenSearch={() => setIsCommandPaletteOpen(true)}
            onOpenAi={() => openAssist()}
          />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Ambient Logo Pink Tint at Top Background */}
            {brand.isEnergia && (
              <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#ED1A53]/12 via-[#ED1A53]/3 to-transparent pointer-events-none z-0" />
            )}

            {brand.isEnergia && (
              <header className="h-16 shrink-0 bg-white/75 backdrop-blur-md border-b border-[#ED1A53]/15 z-30 flex items-center justify-between px-6 shadow-[0_4px_20px_rgba(237,26,83,0.04)] relative">
                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-[#ED1A53]/20 shadow-xs">
                    <div className="relative flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="absolute w-3 h-3 rounded-full bg-emerald-500/40 animate-ping"></span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      KSA East & Central Hubs (Riyadh • Jubail • Dammam)
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="flex-1 flex items-center gap-2.5 px-3.5 py-1.5 bg-white/90 hover:bg-white border border-[#ED1A53]/15 shadow-xs rounded-xl text-slate-600 text-xs font-medium transition cursor-text text-left"
                  >
                    <Search className="w-4 h-4 text-[#ED1A53] shrink-0" />
                    <span className="truncate">Search generator serial, CR license, contract # or client...</span>
                    <kbd className="ml-auto px-1.5 py-0.5 text-[9px] font-mono bg-rose-50 border border-rose-200/60 rounded text-[#ED1A53]">Ctrl+K</kbd>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* VOLVI COPILOT BOT BUTTON & TOP TASK NOTIFICATION POP-UP */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTaskNotification && !isTopNotifOpen) {
                          setIsTopNotifOpen(true);
                        } else {
                          openAssist();
                        }
                      }}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ED1A53] via-[#D81248] to-[#B00F38] hover:from-[#f0295f] hover:to-[#960a2d] text-white shadow-md shadow-[#ED1A53]/25 border border-white/25 transition-all cursor-pointer group active:scale-95"
                      title="Open Volvi Copilot (Industrial RAG & Alerts)"
                    >
                      <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black tracking-tight">Volvi Copilot</span>
                      {unreadCount > 0 ? (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTopNotifOpen(prev => !prev);
                          }}
                          className="px-1.5 py-0.2 rounded-full bg-white text-[#ED1A53] text-[10px] font-black shadow-xs ring-1 ring-white/30 ml-0.5 animate-pulse cursor-pointer hover:bg-rose-50"
                          title="Toggle Task Notification Pop-up"
                        >
                          {unreadCount}
                        </span>
                      ) : (
                        <span className="flex h-2 w-2 relative ml-0.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </button>

                    {/* TOP TASK NOTIFICATION POP-UP ANCHORED RIGHT UNDER BUTTON */}
                    {isTopNotifOpen && activeTaskNotification && (
                      <div className="absolute top-full right-0 mt-2.5 z-50 w-96 max-w-sm bg-white dark:bg-slate-900 border-2 border-[#ED1A53]/35 rounded-2xl shadow-[0_20px_50px_rgba(237,26,83,0.22)] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#ED1A53]/10 flex items-center justify-center text-[#ED1A53]">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-[#ED1A53] border border-rose-200/60">
                                {activeTaskNotification.badge}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">Action Required</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsTopNotifOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title="Dismiss Pop-up"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Task Details */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                            {activeTaskNotification.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                            {activeTaskNotification.message}
                          </p>
                        </div>

                        {/* 1-Click Action Link to Task Page */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsTopNotifOpen(false);
                              if (activeTaskNotification.link) {
                                navigate(activeTaskNotification.link);
                              }
                            }}
                            className="flex-1 py-2 px-3.5 bg-gradient-to-r from-[#ED1A53] to-[#B00F38] hover:from-[#d81248] hover:to-[#960a2d] text-white text-xs font-black rounded-xl shadow-md shadow-[#ED1A53]/25 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <span>{activeTaskNotification.actionLabel}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsTopNotifOpen(false);
                              openAssist(undefined, "alerts");
                            }}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                            title="View All Notifications in Volvi Copilot"
                          >
                            All Alerts
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pl-3 border-l border-[#ED1A53]/15">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.name || "Sophia Martinez"}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">Regional Fleet & Commercial Director</span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 text-[#ED1A53] border border-rose-200 text-[9px] font-extrabold">
                          Admin / Lvl 4
                        </span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8F0D30] via-[#541837] to-[#360515] text-white font-extrabold text-xs flex items-center justify-center ring-2 ring-[#ED1A53]/30 shadow-sm shrink-0">
                      {initials}
                    </div>
                  </div>
                </div>
              </header>
            )}
            <ContextSwitchBar />
            <main className={`flex-1 overflow-y-auto relative z-10 ${brand.isEnergia ? "bg-transparent text-slate-900" : ""}`}>
              <WorkspaceTransition>
                <Outlet />
              </WorkspaceTransition>
            </main>
          </div>
        </div>

        {/* MODALS & DRAWERS */}
        <GlobalSearchModal isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <AiCopilotDrawer isOpen={isAssistOpen} onClose={closeAssist} />
      </div>
    </OrbitProvider>
  );
}
