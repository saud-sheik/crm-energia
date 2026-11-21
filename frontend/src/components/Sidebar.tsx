import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  ClipboardCheck, LayoutDashboard, Home, Inbox, Trello, FileText, Receipt,
  Users, BarChart, Settings, Clock, ChevronLeft, 
  ChevronRight, MessageSquare, CheckSquare, Search, Bell, Sparkles, LogOut, ChevronDown, Layers, Package, Building2, LifeBuoy, Target,
  UserCheck, Shield, Briefcase, Megaphone, Wrench, ShieldAlert, Zap, FileCheck, CalendarClock, ShieldCheck,
  Bot, Palette
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { useVolviAssist } from "../context/VolviAssistContext";
import { leadFilterApi } from "../api";
import { AttendanceClockWidget } from "./AttendanceClockWidget";

interface NavSubItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
}

interface NavItem {
  label: string;
  path?: string;
  icon: any;
  badge?: string;
  subItems?: NavSubItem[];
}

export function Sidebar({
  onOpenSearch,
  onOpenAi,
  onOpenNotifications
}: {
  onOpenSearch?: () => void;
  onOpenAi?: () => void;
  onOpenNotifications?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { brand, themeColor, setThemeColor } = useBrand();
  const { unreadCount } = useVolviAssist();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved !== null ? saved === "true" : false;
  });

  type SidebarTheme = "velvet" | "sky";
  const sidebarTheme = themeColor;

  const toggleTheme = (newTheme: SidebarTheme) => {
    setThemeColor(newTheme);
  };

  const [showClockPopover, setShowClockPopover] = useState(false);
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const userRole = (user?.role || "admin").toLowerCase();

  const ALLOWED_FILTER_ROLES = ["admin", "director", "manager", "sales_manager"];
  const filterRole = (user?.role || "").toLowerCase();
  const isFilterRoleAllowed = Boolean(user && ALLOWED_FILTER_ROLES.includes(filterRole));

  const { data: filterStats } = useQuery({
    queryKey: ["sidebar-lead-filter-stats"],
    queryFn: () => leadFilterApi.getFilterStats(),
    enabled: isFilterRoleAllowed,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const needsReviewCount = filterStats?.needsReviewCount || 0;

  const siteManagerNavItems: NavItem[] = [
    { label: "My Site Inspections", path: "/site-inspections", icon: ClipboardCheck },
    { label: "Work Orders", path: "/purchase-orders", icon: Layers },
  ];

  const opsManagerNavItems: NavItem[] = [
    { label: "Site Inspections", path: "/site-inspections", icon: ClipboardCheck },
    { label: "Work Orders", path: "/purchase-orders", icon: Layers },
  ];

  const energiaNavItems: NavItem[] = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { 
      label: "Commercial Pipeline", 
      icon: Briefcase,
      subItems: [
        { label: "1. Inbound Leads", path: "/leads", icon: Users },
        { label: "2. Technical Sizing", path: "/site-inspections", icon: ClipboardCheck },
        { label: "3. Sales Pipeline", path: "/pipeline", icon: Trello },
        { label: "4. Rental CPQ Quoting", path: "/rental-cpq/builder", icon: Zap },
      ]
    },
    { 
      label: "Operations & Fulfilment", 
      icon: Shield,
      subItems: [
        { label: "5. Credit & KYC Desk", path: "/credit-kyc", icon: Shield },
        { label: "6. Contracts & SLAs", path: "/rental-contracts", icon: FileCheck },
        { label: "7. Fleet Yard & Dispatch", path: "/fleet-availability", icon: CalendarClock },
        { label: "8. Approval Queue", path: "/approvals", icon: ShieldCheck },
      ]
    },
    { 
      label: "Accounts & Master Data", 
      icon: Building2,
      subItems: [
        { label: "Client Accounts", path: "/accounts", icon: Building2 },
        { label: "Fleet Work Orders", path: "/purchase-orders", icon: Layers },
      ]
    },
    { label: "Settings", path: "/master-data/requirements", icon: Settings },
  ];

  const nexusNavItems: NavItem[] = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { 
      label: "Sales Division", 
      icon: Briefcase,
      subItems: [
        { label: "Leads", path: "/leads", icon: Users },
        { label: "Campaigns", path: "/campaigns", icon: Megaphone },
        { label: "Site Inspections", path: "/site-inspections", icon: ClipboardCheck },
        ...(isFilterRoleAllowed ? [{ 
          label: "Held Emails", 
          path: "/held-emails", 
          icon: ShieldAlert, 
          badge: needsReviewCount > 0 ? String(needsReviewCount) : undefined 
        }] : []),
        { label: "Opportunities", path: "/opportunities", icon: Target },
        { label: "Pipeline", path: "/pipeline", icon: Trello },
        { label: "Quotes", path: "/quotes", icon: FileText },
      ]
    },
    { label: "Approval Queue & Limits", path: "/approvals", icon: Shield },
    { 
      label: "CRM", 
      icon: Building2,
      subItems: [
        { label: "Accounts", path: "/accounts", icon: Building2 },
        { label: "Contacts", path: "/contacts", icon: Users },
        { label: "Business Users", path: "/salespersons", icon: UserCheck },
        { label: "Work Orders", path: "/work-orders", icon: Wrench },
      ]
    },
    { label: "Settings", path: "/master-data/requirements", icon: Settings },
  ];

  const standardNavItems = brand.isEnergia ? energiaNavItems : nexusNavItems;

  const primaryNavItems = userRole === "site_manager"
    ? siteManagerNavItems
    : userRole === "ops_manager"
    ? opsManagerNavItems
    : standardNavItems;

  // Track open dropdowns (default open for active route)
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    "Commercial Pipeline": true,
    "Operations & Fulfilment": true,
    "Rental Operations": true,
    "Sales & Projects": true,
    "Sales Division": true,
    "Governance & Approvals": true,
    "Accounts & Master Data": false,
    "CRM": false,
  });

  useEffect(() => {
    primaryNavItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname === sub.path || (sub.path !== "/" && location.pathname.startsWith(sub.path)))) {
        setOpenDropdowns(prev => ({ ...prev, [item.label]: true }));
      }
    });
  }, [location.pathname]);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={`flex flex-col justify-between transition-all duration-300 select-none shrink-0 bg-[var(--crm-sidebar-bg)] text-[var(--crm-sidebar-text)] ${
        isCollapsed
          ? "w-[72px] my-3 ml-3 rounded-[32px] border border-[var(--crm-sidebar-border)] shadow-[0_16px_40px_rgba(227,232,240,0.85)] h-[calc(100%-24px)]"
          : "w-64 my-3 ml-3 rounded-[28px] border border-[var(--crm-sidebar-border)] shadow-[0_16px_40px_rgba(227,232,240,0.85)] h-[calc(100%-24px)]"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[var(--crm-sidebar-border)] space-y-2.5 relative z-10">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              {/* High-Contrast Luxury White Pill Container */}
              <div className="h-10 px-3 rounded-xl bg-white shadow-xs border border-[var(--crm-sidebar-border)] flex items-center justify-center shrink-0">
                <img 
                  src="/energia-logo-cropped.png" 
                  alt="ENERGIA" 
                  className="h-4.5 w-auto max-w-[105px] object-contain" 
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="font-black text-sm tracking-tighter text-[#0F172A]">ENERGIA</span>';
                    }
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider leading-tight text-[var(--crm-sidebar-icon)]">
                  KSA Operations
                </span>
                <span className="text-[10px] font-extrabold tracking-wider uppercase mt-0.5 flex items-center gap-1.5 text-[var(--crm-sidebar-heading)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  Fleet Core
                </span>
              </div>
            </div>
          ) : (
            <div
              title="ENERGIA KSA Operations"
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto shadow-xs transition-all hover:scale-105 bg-white p-1 border border-[var(--crm-sidebar-border)]"
            >
              <img 
                src="/energia-icon.png" 
                alt="ENERGIA" 
                className="w-full h-full object-contain rounded-lg" 
              />
            </div>
          )}
        </div>

        {/* Theme Color Switcher (Velvet Maroon vs Light Blue) */}
        {!isCollapsed ? (
          <div className="flex items-center p-1 rounded-xl border border-[var(--crm-sidebar-border)] bg-[var(--crm-sidebar-toggle-bg)]">
            <button
              type="button"
              onClick={() => toggleTheme("sky")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                sidebarTheme === "sky"
                  ? "bg-[var(--crm-sidebar-toggle-active-bg)] text-[var(--crm-sidebar-toggle-active-text)] shadow-xs font-black border border-[var(--crm-sidebar-border)]"
                  : "text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)]"
              }`}
              title="Switch to Light Blue Theme"
            >
              <span className="w-2 h-2 rounded-full bg-[#2563EB] border border-blue-400 shrink-0" />
              <span>Light Blue</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme("velvet")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                sidebarTheme === "velvet"
                  ? "bg-[var(--crm-sidebar-toggle-active-bg)] text-[var(--crm-sidebar-toggle-active-text)] shadow-xs font-black border border-[var(--crm-sidebar-border)]"
                  : "text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)]"
              }`}
              title="Switch to Classic Velvet Maroon"
            >
              <span className="w-2 h-2 rounded-full bg-[#9F1239] border border-rose-300 shrink-0" />
              <span>Velvet Maroon</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-0.5">
            <button
              type="button"
              onClick={() => toggleTheme(sidebarTheme === "sky" ? "velvet" : "sky")}
              className="w-10 h-7 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs bg-[var(--crm-sidebar-box-bg)] hover:bg-[var(--crm-sidebar-hover)] border border-[var(--crm-sidebar-border)] text-[var(--crm-sidebar-active-bg)]"
              title={`Theme Switcher: Active is ${sidebarTheme === "sky" ? "Light Blue" : "Velvet Maroon"}. Click to toggle.`}
            >
              <Palette className="w-3.5 h-3.5 text-[var(--crm-sidebar-active-bg)]" />
            </button>
          </div>
        )}

        {/* Global Search & AI Quick Triggers in Sidebar */}
        <div className="space-y-1.5 pt-0.5">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className={`w-full flex items-center gap-2 bg-[var(--crm-sidebar-box-bg)] hover:bg-[var(--crm-sidebar-hover)] border border-[var(--crm-sidebar-box-border)] text-[var(--crm-sidebar-text)] shadow-2xs rounded-xl px-2.5 py-2 text-xs font-bold transition-all group cursor-pointer ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="Search (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-[var(--crm-sidebar-icon)] group-hover:text-[var(--crm-sidebar-active-bg)]" />
              {!isCollapsed && (
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-[var(--crm-sidebar-text)] font-semibold">Search...</span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--crm-sidebar-bg)] border border-[var(--crm-sidebar-border)] text-[var(--crm-sidebar-icon)] rounded">Ctrl+K</kbd>
                </div>
              )}
            </button>
          )}

          <div className="flex">
            {onOpenAi && (
              <button
                onClick={onOpenAi}
                className={`w-full flex items-center justify-between bg-[var(--crm-sidebar-box-bg)] hover:bg-[var(--crm-sidebar-hover)] border border-[var(--crm-sidebar-box-border)] text-[var(--crm-sidebar-text)] shadow-2xs rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title="Volvi Copilot (Industrial RAG & Alerts)"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-[var(--crm-sidebar-icon)] shrink-0" />
                  {!isCollapsed && <span className="font-extrabold text-[var(--crm-sidebar-heading)]">Volvi Copilot</span>}
                </div>
                {!isCollapsed && unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-white text-[9px] font-black shadow-xs bg-[var(--crm-sidebar-active-bg)]">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5 Core Pillars Navigation List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isDropdownOpen = !!openDropdowns[item.label];
          
          const isItemActive = item.path 
            ? (location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)))
            : (item.subItems?.some(sub => location.pathname === sub.path || (sub.path !== "/" && location.pathname.startsWith(sub.path))) || false);

          if (isCollapsed) {
            const targetPath = hasSubItems ? item.subItems![0].path : item.path!;
            return (
              <div
                key={item.label}
                className="relative group flex justify-center py-1"
                onMouseEnter={() => hasSubItems && setHoveredPillar(item.label)}
                onMouseLeave={() => hasSubItems && setHoveredPillar(null)}
              >
                <Link
                  to={targetPath}
                  className={`w-11 h-11 rounded-[16px] flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isItemActive
                      ? "bg-[var(--crm-sidebar-active-bg)] text-[var(--crm-sidebar-active-text)] shadow-md border border-[var(--crm-sidebar-active-bg)] scale-105"
                      : "bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-icon)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-panel-border)] shadow-xs hover:scale-105"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>

                {/* Floating Tooltip if no subitems */}
                {!hasSubItems && (
                  <div className="hidden group-hover:flex absolute left-[64px] top-2 z-50 bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none">
                    {item.label}
                  </div>
                )}

                {/* Floating Sub-navigation Flyout */}
                {hasSubItems && hoveredPillar === item.label && (
                  <div className="absolute left-[64px] top-0 z-50 min-w-[210px] rounded-2xl p-2 shadow-[0_16px_36px_-6px_rgba(30,41,59,0.25)] border animate-in fade-in zoom-in-95 bg-[var(--crm-sidebar-panel-bg)] border-[var(--crm-sidebar-panel-border)] text-[var(--crm-sidebar-text)]">
                    <div className="px-3 py-1.5 border-b border-[var(--crm-sidebar-border)] flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[var(--crm-sidebar-heading)]">{item.label}</span>
                      <span className="text-[10px] font-bold text-[var(--crm-sidebar-active-bg)]">Switches</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.path || (sub.path !== "/" && location.pathname.startsWith(sub.path));
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSubActive
                                ? "bg-[var(--crm-sidebar-active-bg)] text-[var(--crm-sidebar-active-text)] shadow-2xs font-extrabold"
                                : "text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)] hover:bg-[var(--crm-sidebar-hover)]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <SubIcon className={`w-3.5 h-3.5 ${
                                isSubActive
                                  ? "text-[var(--crm-sidebar-active-text)]"
                                  : "text-[var(--crm-sidebar-icon)]"
                              }`} />
                              <span>{sub.label}</span>
                            </div>
                            {sub.badge && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                isSubActive
                                  ? "bg-white text-[var(--crm-sidebar-active-bg)]"
                                  : "bg-rose-500 text-white"
                              }`}>
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (hasSubItems) {
            return (
              <div 
                key={item.label} 
                className="rounded-2xl transition-all duration-200 bg-[var(--crm-sidebar-panel-bg)] border border-[var(--crm-sidebar-panel-border)] shadow-xs p-1.5"
              >
                <button
                  type="button"
                  onClick={() => toggleDropdown(item.label)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold text-xs transition-all group cursor-pointer text-[var(--crm-sidebar-heading)] hover:bg-[var(--crm-sidebar-hover)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg transition-colors text-[var(--crm-sidebar-icon)] group-hover:text-[var(--crm-sidebar-active-bg)] bg-[var(--crm-sidebar-bg)] border border-[var(--crm-sidebar-border)] shadow-2xs">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate font-extrabold text-[var(--crm-sidebar-heading)]">{item.label}</span>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-[var(--crm-sidebar-icon)] group-hover:text-[var(--crm-sidebar-heading)] ${
                    isDropdownOpen ? "rotate-0" : "-rotate-90"
                  }`} />
                </button>

                {/* Sub-items list */}
                {isDropdownOpen && (
                  <div className="mt-1.5 space-y-1 p-1 rounded-xl bg-[var(--crm-sidebar-bg)] border border-[var(--crm-sidebar-border)] shadow-inner">
                    {item.subItems!.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = location.pathname === sub.path || (sub.path !== "/" && location.pathname.startsWith(sub.path));

                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSubActive
                              ? "bg-[var(--crm-sidebar-active-bg)] text-[var(--crm-sidebar-active-text)] shadow-sm font-bold"
                              : "text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)] hover:bg-[var(--crm-sidebar-hover)] font-semibold"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive
                                ? "text-[var(--crm-sidebar-active-text)]"
                                : "text-[var(--crm-sidebar-icon)] group-hover:text-[var(--crm-sidebar-active-bg)]"
                            }`} />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {sub.badge && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                              isSubActive ? "bg-white text-[var(--crm-sidebar-active-bg)]" : "bg-rose-500 text-white"
                            }`}>
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path!}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl font-bold text-xs transition-all group cursor-pointer ${
                isItemActive
                  ? "bg-[var(--crm-sidebar-active-bg)] text-[var(--crm-sidebar-active-text)] shadow-sm font-black"
                  : "bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-panel-border)] shadow-xs font-bold"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                isItemActive 
                  ? "text-[var(--crm-sidebar-active-text)] bg-white/20" 
                  : "text-[var(--crm-sidebar-icon)] group-hover:text-[var(--crm-sidebar-active-bg)] bg-[var(--crm-sidebar-bg)] border border-[var(--crm-sidebar-border)]"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 flex items-center justify-between">
                <span className="truncate font-extrabold">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Collapse/Expand Arrow Button (Positioned Below Settings) */}
        <div className={`pt-1.5 flex ${isCollapsed ? "justify-center" : "px-1"}`}>
          <button
            type="button"
            onClick={toggleCollapse}
            className={`transition-all duration-200 cursor-pointer flex items-center ${
              isCollapsed
                ? "w-11 h-11 rounded-[16px] justify-center bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-icon)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-panel-border)] shadow-xs hover:scale-105"
                : "w-full gap-2.5 px-3 py-2 rounded-2xl bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-text)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-panel-border)] shadow-xs text-xs font-bold"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[var(--crm-sidebar-icon)]" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-[var(--crm-sidebar-icon)] shrink-0" />
                <span className="truncate">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Fleet Ratio Widget */}
      {brand.isEnergia && !isCollapsed && (
        <Link
          to="/fleet-availability"
          title="Click to view Fleet Availability & Telemetry Desk"
          className="mx-3 mb-2 p-3 bg-[var(--crm-sidebar-ratio-bg)] hover:bg-[var(--crm-sidebar-hover)]/40 border border-[var(--crm-sidebar-ratio-border)] text-[var(--crm-sidebar-text)] rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 block group cursor-pointer relative overflow-hidden z-10"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--crm-sidebar-icon)] font-extrabold group-hover:text-[var(--crm-sidebar-heading)] transition-colors">
                Active Fleet Ratio
              </span>
            </div>
            <span className="text-[9.5px] font-black inline-flex items-center gap-1 text-[var(--crm-sidebar-pill-text)] bg-[var(--crm-sidebar-pill-bg)] border border-[var(--crm-sidebar-border)] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              90% On-Hire
              <ChevronRight className="w-3 h-3 text-[var(--crm-sidebar-pill-text)] transform group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div className="w-full bg-[var(--crm-sidebar-progress-track)] h-1.5 rounded-full overflow-hidden mb-2 p-0.5">
            <div 
              className="bg-[var(--crm-sidebar-progress-fill)] h-full rounded-full transition-all duration-500 shadow-xs" 
              style={{ width: "90%" }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--crm-sidebar-border)]">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-[var(--crm-sidebar-icon)] font-bold">Units Deployed</span>
              <span className="text-xs font-black text-[var(--crm-sidebar-heading)]">342 <span className="text-[var(--crm-sidebar-icon)] font-normal">/ 380</span></span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] uppercase tracking-wider text-[var(--crm-sidebar-icon)] font-bold">Live Grid</span>
              <span className="text-xs font-black text-emerald-600">142.8 MW</span>
            </div>
          </div>
        </Link>
      )}

      {/* Sidebar Footer User Info & Shift Status ("Buttons on Down") */}
      <div className="p-2 border-t border-[var(--crm-sidebar-border)] bg-transparent space-y-1.5 relative z-10">
        {!isCollapsed ? (
          <>
            <div className="pb-1">
              <AttendanceClockWidget variant="sidebar" dark={false} />
            </div>
            <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-[var(--crm-sidebar-border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border shadow-xs bg-[var(--crm-sidebar-active-bg)] text-white border-[var(--crm-sidebar-border)]">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22C55E] border border-white"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold truncate text-[#0F172A]">{user?.name || "Sophia Martinez"}</p>
                  <p className="text-[10px] truncate uppercase font-bold tracking-wider text-[#64748B]">
                    {user?.role?.replace("_", " ") || "Admin / Lvl 4"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => logout()} 
                className="p-1.5 rounded-xl border border-transparent transition-all cursor-pointer text-[#64748B] hover:text-rose-600 hover:bg-[var(--crm-sidebar-hover)]" 
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {/* Shift Clock Trigger Popover */}
            <div className="relative">
              <button
                onClick={() => setShowClockPopover(v => !v)}
                className="w-10 h-10 rounded-xl bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-icon)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-border)] flex items-center justify-center transition-all cursor-pointer relative shadow-xs"
                title="Shift Attendance Clock"
              >
                <Clock className="w-4 h-4 text-[var(--crm-sidebar-icon)]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              </button>
              {showClockPopover && (
                <div className="absolute left-[64px] bottom-0 z-50 w-72 bg-[var(--crm-sidebar-panel-bg)] border border-[var(--crm-sidebar-border)] text-[var(--crm-sidebar-text)] p-3 rounded-2xl shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--crm-sidebar-border)] mb-2">
                    <span className="text-xs font-bold text-[var(--crm-sidebar-heading)]">Shift Attendance</span>
                    <button onClick={() => setShowClockPopover(false)} className="text-xs cursor-pointer opacity-70 hover:opacity-100">✕</button>
                  </div>
                  <AttendanceClockWidget variant="sidebar" dark={false} />
                </div>
              )}
            </div>

            {/* Volvi Assist Button (Unified Hub) */}
            {onOpenAi && (
              <button
                onClick={onOpenAi}
                className="w-10 h-10 rounded-xl bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-active-bg)] border border-[var(--crm-sidebar-border)] flex items-center justify-center transition-all cursor-pointer relative shadow-xs"
                title="Volvi Copilot (Industrial RAG & Alerts)"
              >
                <Bot className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--crm-sidebar-active-bg)] animate-pulse" />
                )}
              </button>
            )}

            {/* Settings Gear */}
            <Link
              to="/settings"
              className="w-10 h-10 rounded-xl bg-[var(--crm-sidebar-panel-bg)] hover:bg-[var(--crm-sidebar-hover)] text-[var(--crm-sidebar-icon)] hover:text-[var(--crm-sidebar-heading)] border border-[var(--crm-sidebar-border)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Settings & Configurations"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* User Avatar with Sign Out */}
            <button 
              onClick={() => logout()} 
              className="w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center border shadow-xs transition-all cursor-pointer mt-0.5 bg-[var(--crm-sidebar-active-bg)] text-white border-[var(--crm-sidebar-border)] hover:ring-2 hover:ring-blue-400/50" 
              title={`Signed in as ${user?.name || 'User'} · Click to Sign Out`}
            >
              {user?.name?.charAt(0) || "U"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
