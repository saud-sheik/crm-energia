import { useLocation, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Zap, CalendarClock, Shield, FileCheck, Users, Target, Trello, FileText, 
  ClipboardCheck, ShieldAlert, Building2, UserCheck, Wrench, Settings, BookOpen, Layers
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { leadFilterApi } from "../api";

export function ContextSwitchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeColor } = useBrand();
  const currentPath = location.pathname;

  const activePillClass = themeColor === "sky"
    ? "bg-[#2563EB] text-white shadow-xs font-black border border-blue-600"
    : "bg-[#7BBDE8] text-sky-950 shadow-xs font-black border border-sky-300/60";

  const ALLOWED_FILTER_ROLES = ["admin", "director", "manager", "sales_manager"];
  const isFilterRoleAllowed = Boolean(user && ALLOWED_FILTER_ROLES.includes((user?.role || "").toLowerCase()));

  const { data: filterStats } = useQuery({
    queryKey: ["sidebar-lead-filter-stats"],
    queryFn: () => leadFilterApi.getFilterStats(),
    enabled: isFilterRoleAllowed,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const needsReviewCount = filterStats?.needsReviewCount || 0;

  // 1. Unified Commercial & Rental Lifecycle (1 to 8)
  const isLifecycleFlow = [
    "/leads",
    "/site-inspections",
    "/pipeline",
    "/opportunities",
    "/rental-cpq",
    "/credit-kyc",
    "/rental-contracts",
    "/fleet-availability",
    "/approvals"
  ].some(p => currentPath.startsWith(p));

  // 2. CRM & Master Data Switch Group
  const isCrmPeople = [
    "/accounts",
    "/contacts",
    "/salespersons",
    "/work-orders",
    "/purchase-orders"
  ].some(p => currentPath.startsWith(p));

  // 3. Settings & Master Data Switch Group
  const isSettings = [
    "/master-data",
    "/settings",
    "/price-book",
    "/rules",
    "/automation"
  ].some(p => currentPath.startsWith(p));

  // If on Dashboard or standalone page with no sub-switches, don't show the bar
  if (!isLifecycleFlow && !isCrmPeople && !isSettings) {
    return null;
  }

  return (
    <div className="px-6 pt-3 pb-1 shrink-0 animate-fade-in">
      <div className="flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-[20px] border border-white shadow-[0_4px_16px_-2px_rgba(100,116,180,0.08)] overflow-x-auto no-scrollbar">
        {/* UNIFIED 1-TO-8 COMMERCIAL & OPERATIONAL LIFECYCLE (ELEGANT MAROON-COMPLEMENTARY ALABASTER BUNDLES) */}
        {isLifecycleFlow && (
          <div className="flex items-center gap-2">
            {/* BUNDLE 1: PRE-SALES (Pale Plum-Alabaster) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F8F4F6] border border-[#E5D4DE] shadow-2xs shrink-0">
              <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-[#EEDFE8] text-[#551938] border border-[#DECAD7] shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E1C47]"></span>
                Pre-Sales
              </span>

              {/* 1. Leads */}
              <Link
                to="/leads"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/leads")
                    ? activePillClass
                    : "text-[#551938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>1. Leads</span>
              </Link>

              {/* 2. Technical Sizing */}
              <Link
                to="/site-inspections"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/site-inspections")
                    ? activePillClass
                    : "text-[#551938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>2. Sizing</span>
              </Link>
            </div>

            {/* BUNDLE 2: COMMERCIAL SALES (Rose Alabaster / Warm Wine Cream) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#FBF4F6] border border-[#EED5DE] shadow-2xs shrink-0">
              <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-[#F6E0E7] text-[#7A1938] border border-[#E9C7D3] shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ED1A53]"></span>
                Commercial Sales
              </span>

              {/* 3. Sales Pipeline */}
              <Link
                to="/pipeline"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/pipeline") || currentPath.startsWith("/opportunities")
                    ? activePillClass
                    : "text-[#7A1938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>3. Pipeline</span>
              </Link>

              {/* 4. Rental CPQ */}
              <Link
                to="/rental-cpq/builder"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/rental-cpq")
                    ? activePillClass
                    : "text-[#7A1938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>4. Rental CPQ</span>
              </Link>

              {/* 5. Credit & KYC */}
              <Link
                to="/credit-kyc"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/credit-kyc")
                    ? activePillClass
                    : "text-[#7A1938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>5. Credit & KYC</span>
              </Link>

              {/* 6. Contracts & SLAs */}
              <Link
                to="/rental-contracts"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/rental-contracts")
                    ? activePillClass
                    : "text-[#7A1938]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>6. Contracts</span>
              </Link>
            </div>

            {/* BUNDLE 3: OPERATIONS & FULFILLMENT (Sophisticated Sage Linen) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F4F6F4] border border-[#D6DFD6] shadow-2xs shrink-0">
              <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-[#E5ECE4] text-[#2C4830] border border-[#C8D6C7] shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6E43]"></span>
                Operations
              </span>

              {/* 7. Fleet Yard & Dispatch */}
              <Link
                to="/fleet-availability"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/fleet-availability")
                    ? activePillClass
                    : "text-[#2C4830]/85 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>7. Fleet Dispatch</span>
              </Link>
            </div>

            {/* BUNDLE 4: GOVERNANCE & APPROVALS (Platinum Stone) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F7F6F8] border border-[#DDDCE3] shadow-2xs shrink-0">
              {/* 8. Approval Queue */}
              <Link
                to="/approvals"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentPath.startsWith("/approvals")
                    ? activePillClass
                    : "text-slate-700 hover:text-sky-900 hover:bg-white"
                }`}
              >
                <span>8. Approvals</span>
              </Link>
            </div>
          </div>
        )}

        {/* CRM & PEOPLE SWITCHES */}
        {isCrmPeople && (
          <>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 shrink-0 flex items-center gap-1">
              Directory:
            </span>
            <Link
              to="/accounts"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/accounts")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Client Accounts</span>
            </Link>

            <Link
              to="/contacts"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/contacts")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts Directory</span>
            </Link>

            <Link
              to="/salespersons"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/salespersons")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Engineers & Staff</span>
            </Link>

            <Link
              to="/work-orders"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/work-orders") || currentPath.startsWith("/purchase-orders")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Work Orders & Assets</span>
            </Link>
          </>
        )}

        {/* SETTINGS & MASTER DATA SWITCHES */}
        {isSettings && (
          <>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 shrink-0 flex items-center gap-1">
              Configuration:
            </span>
            <Link
              to="/settings"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath === "/settings"
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>User Settings</span>
            </Link>

            <Link
              to="/master-data/requirements"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/master-data/requirements")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Requirements</span>
            </Link>

            <Link
              to="/master-data/line-items"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/master-data/line-items")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Line Items</span>
            </Link>

            <Link
              to="/master-data/pricing"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/master-data/pricing")
                  ? activePillClass
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Pricing Grid</span>
            </Link>

            <Link
              to="/price-book"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPath.startsWith("/price-book")
                  ? "bg-[#45142B] text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Price Book</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

