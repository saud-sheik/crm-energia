import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient";
import {
  Building2,
  Users,
  DollarSign,
  Plus,
  Globe,
  MapPin,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  ExternalLink,
  ChevronRight,
  Download,
  Briefcase,
  Phone,
  Mail,
  X,
  Sparkles,
  ShieldCheck,
  Award
} from "lucide-react";
import { formatCurrency } from "../utils/currency";

export default function Accounts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── 1. DATA FETCHING ──
  const { data: accountsData, isLoading, error, refetch } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await apiClient.get<any[]>("/api/v1/accounts");
      return Array.isArray(res) ? res : [];
    }
  });

  const accounts = useMemo(() => {
    return Array.isArray(accountsData) ? accountsData : [];
  }, [accountsData]);

  // ── 2. STATE FOR FILTERS & CONTROLS ──
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "pipeline_desc" | "contacts_desc">("pipeline_desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Account Form state
  const [newAccountForm, setNewAccountForm] = useState({
    name: "",
    industry: "Technology",
    website: "",
    address: "",
    phone: "",
    email: "",
    primaryContactName: "",
    tier: "Enterprise"
  });

  // ── 3. CREATE ACCOUNT MUTATION ──
  const createAccountMutation = useMutation({
    mutationFn: async (formData: typeof newAccountForm) => {
      return apiClient.post("/api/v1/accounts", formData);
    },
    onSuccess: (newAcc: any) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setIsCreateModalOpen(false);
      setNewAccountForm({
        name: "",
        industry: "Technology",
        website: "",
        address: "",
        phone: "",
        email: "",
        primaryContactName: "",
        tier: "Enterprise"
      });
      if (newAcc?.id) {
        navigate(`/accounts/${newAcc.id}`);
      }
    }
  });

  // ── 4. EXTRACT UNIQUE INDUSTRIES ──
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.industry && a.industry.trim()) {
        set.add(a.industry.trim());
      }
    });
    return Array.from(set).sort();
  }, [accounts]);

  // ── 5. CALCULATE AGGREGATE METRICS ──
  const metrics = useMemo(() => {
    let totalPipeline = 0;
    let totalContacts = 0;
    let totalDeals = 0;
    let wonAccountsCount = 0;

    accounts.forEach((acc) => {
      const deals = Array.isArray(acc.deals) ? acc.deals : [];
      const contacts = Array.isArray(acc.contacts) ? acc.contacts : [];

      totalContacts += contacts.length;

      let hasWon = false;
      deals.forEach((d: any) => {
        const val = Number(d.amount || d.value) || 0;
        const s = (d.status || "").toUpperCase();
        const stageName = (d.stage?.name || d.stage || "").toLowerCase();

        if (s === "WON" || stageName.includes("won")) {
          hasWon = true;
        }

        if (s !== "LOST" && !stageName.includes("lost")) {
          totalPipeline += val;
          totalDeals += 1;
        }
      });

      if (hasWon) wonAccountsCount += 1;
    });

    const avgDealValue = totalDeals > 0 ? Math.round(totalPipeline / totalDeals) : 250000;

    return {
      totalAccounts: accounts.length,
      totalPipeline,
      totalContacts,
      wonAccountsCount,
      avgDealValue
    };
  }, [accounts]);

  // ── 6. FILTER & SORT ACCOUNTS ──
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((acc) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = (acc.name || "").toLowerCase().includes(q);
          const matchIndustry = (acc.industry || "").toLowerCase().includes(q);
          const matchAddress = (acc.address || "").toLowerCase().includes(q);
          const matchEmail = (acc.email || "").toLowerCase().includes(q);
          const matchWebsite = (acc.website || "").toLowerCase().includes(q);
          const matchContact = (acc.primaryContactName || "").toLowerCase().includes(q);

          if (!matchName && !matchIndustry && !matchAddress && !matchEmail && !matchWebsite && !matchContact) {
            return false;
          }
        }

        // Industry filter
        if (selectedIndustry !== "all") {
          if ((acc.industry || "").toLowerCase() !== selectedIndustry.toLowerCase()) {
            return false;
          }
        }

        // Tier / Status filter
        if (selectedTier !== "all") {
          const accTier = (acc.tier || "enterprise").toLowerCase();
          if (accTier !== selectedTier.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortBy === "name_desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        if (sortBy === "pipeline_desc") {
          const pipeA = (a.deals || []).reduce((sum: number, d: any) => sum + (Number(d.amount || d.value) || 0), 0);
          const pipeB = (b.deals || []).reduce((sum: number, d: any) => sum + (Number(d.amount || d.value) || 0), 0);
          return pipeB - pipeA;
        }
        if (sortBy === "contacts_desc") {
          const cA = (a.contacts || []).length;
          const cB = (b.contacts || []).length;
          return cB - cA;
        }
        return 0;
      });
  }, [accounts, searchTerm, selectedIndustry, selectedTier, sortBy]);

  // Helper function for industry badge colors
  const getIndustryBadgeClass = (ind?: string) => {
    const i = (ind || "").toLowerCase();
    if (i.includes("tech") || i.includes("software") || i.includes("it")) {
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
    if (i.includes("health") || i.includes("pharma") || i.includes("bio")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (i.includes("finan") || i.includes("bank") || i.includes("invest")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    }
    if (i.includes("manuf") || i.includes("indus") || i.includes("auto")) {
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    if (i.includes("energy") || i.includes("oil") || i.includes("solar")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
    }
    if (i.includes("retail") || i.includes("consumer") || i.includes("ecom")) {
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Helper function to export CSV
  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) return;
    const headers = ["Company Name", "Industry", "Location", "Website", "Email", "Phone", "Contacts Count", "Pipeline Value"];
    const rows = filteredAccounts.map((a) => {
      const pipe = (a.deals || []).reduce((sum: number, d: any) => sum + (Number(d.amount || d.value) || 0), 0);
      return [
        `"${a.name || ""}"`,
        `"${a.industry || ""}"`,
        `"${a.address || ""}"`,
        `"${a.website || ""}"`,
        `"${a.email || ""}"`,
        `"${a.phone || ""}"`,
        (a.contacts || []).length,
        pipe
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexus_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 flex items-center justify-center">
        <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold text-slate-700">Loading Enterprise Accounts Directory...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-rose-900">Failed to Load Accounts</h3>
        <p className="text-xs text-rose-700">{(error as any).message || "An unexpected error occurred."}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans animate-fade-in">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-[#DC2626] shadow-sm">
              <Building2 className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accounts & Organizations</h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage enterprise clients, corporate relationships, active deal pipelines, and account contacts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* ── SUMMARY KPI METRIC CARDS (Pinterest Web 2.0 Elevated Cards with Circular Telemetry Rings) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Accounts */}
        <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#45142B] shadow-2xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-[#45142B]" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#ED1A53]" strokeDasharray="85, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-slate-700 font-mono">Orgs</span>
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800">{metrics.totalAccounts}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active client organizations</span>
          </div>
        </div>

        {/* Metric 2: Total Active Pipeline */}
        <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500" strokeDasharray="70, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-emerald-700 font-mono">Deals</span>
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Pipeline</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800">{formatCurrency(metrics.totalPipeline)}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
            Across commercial opportunities
          </div>
        </div>

        {/* Metric 3: Associated Contacts */}
        <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-indigo-500" strokeDasharray="60, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-indigo-700 font-mono">VIP</span>
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Key Contacts</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800">{metrics.totalContacts}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-indigo-700">
            Stakeholders & Decision Makers
          </div>
        </div>

        {/* Metric 4: Avg Opportunity Size */}
        <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-purple-500" strokeDasharray="50, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-purple-700 font-mono">Tier 1</span>
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Opportunity</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800">{formatCurrency(metrics.avgDealValue)}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-purple-700">
            Enterprise contract tier
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR (Elevated White Panel) ── */}
      <div className="bg-white rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] border border-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 text-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company name, industry, location, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-slate-300/80 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#45142B] focus:ring-2 focus:ring-[#45142B]/10 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Industry Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="bg-white/80 border border-slate-300/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#45142B] cursor-pointer"
            >
              <option value="all">All Industries ({accounts.length})</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white/80 border border-slate-300/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#45142B] cursor-pointer"
            >
              <option value="pipeline_desc">Highest Pipeline</option>
              <option value="name_asc">Company Name (A-Z)</option>
              <option value="name_desc">Company Name (Z-A)</option>
              <option value="contacts_desc">Most Contacts</option>
            </select>
          </div>
        </div>

        {/* View Switcher: Table vs Grid */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl shrink-0 self-end md:self-auto border border-slate-300/60">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table" ? "bg-white text-[#45142B] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "grid" ? "bg-white text-[#45142B] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* ── ACCOUNTS LIST SECTION ── */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-white p-12 text-center space-y-3 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] text-slate-900">
          <div className="w-12 h-12 rounded-2xl bg-white/80 text-slate-500 border border-slate-200 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No matching accounts found</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
            Try adjusting your search criteria or industry filter to find what you are looking for.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedIndustry("all");
              setSelectedTier("all");
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#45142B] text-white hover:bg-[#320e1f] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* ─── DATA TABLE VIEW ─── */
        <div className="bg-white rounded-[24px] border border-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] overflow-hidden text-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-5">Company</th>
                  <th className="py-3.5 px-4">Industry</th>
                  <th className="py-3.5 px-4">HQ Location</th>
                  <th className="py-3.5 px-4">Active Pipeline</th>
                  <th className="py-3.5 px-4">Contacts</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-medium">
                {filteredAccounts.map((account) => {
                  const nameInit = (account.name || "A").trim().charAt(0).toUpperCase();
                  const deals = Array.isArray(account.deals) ? account.deals : [];
                  const activeDeals = deals.filter((d: any) => {
                    const s = (d.status || "").toUpperCase();
                    const stg = (d.stage?.name || d.stage || "").toLowerCase();
                    return s !== "LOST" && !stg.includes("lost");
                  });
                  const pipeVal = activeDeals.reduce((sum: number, d: any) => sum + (Number(d.amount || d.value) || 0), 0);
                  const contacts = Array.isArray(account.contacts) ? account.contacts : [];
                  const primaryContact = contacts[0] || (account.primaryContactName ? { firstName: account.primaryContactName } : null);
                  const websiteDomain = account.website || (account.name ? `${account.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : "");

                  return (
                    <tr
                      key={account.id}
                      onClick={() => navigate(`/accounts/${account.id}`)}
                      className="group hover:bg-white/60 transition-colors cursor-pointer"
                    >
                      {/* Company Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#45142B] to-[#782348] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {nameInit}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#ED1A53] transition-colors truncate">
                              {account.name || "Untitled Organization"}
                            </div>
                            {websiteDomain && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 truncate mt-0.5">
                                <Globe className="w-3 h-3 text-slate-400" />
                                <span>{websiteDomain}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getIndustryBadgeClass(
                            account.industry
                          )}`}
                        >
                          {account.industry || "General"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{account.address || "Global / Unassigned"}</span>
                        </div>
                      </td>

                      {/* Pipeline */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-black text-slate-900">{formatCurrency(pipeVal)}</div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            {activeDeals.length} {activeDeals.length === 1 ? "active deal" : "active deals"}
                          </div>
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                            {contacts.length}
                          </div>
                          {primaryContact && (
                            <span className="text-[11px] text-slate-700 font-medium truncate max-w-[130px]">
                              {primaryContact.firstName} {primaryContact.lastName || ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/90 text-slate-800 border border-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {account.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/accounts/${account.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-[#45142B] hover:text-white border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        >
                          <span>View 360</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── VISUAL CARDS GRID VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((account) => {
            const nameInit = (account.name || "A").trim().charAt(0).toUpperCase();
            const deals = Array.isArray(account.deals) ? account.deals : [];
            const activeDeals = deals.filter((d: any) => {
              const s = (d.status || "").toUpperCase();
              const stg = (d.stage?.name || d.stage || "").toLowerCase();
              return s !== "LOST" && !stg.includes("lost");
            });
            const pipeVal = activeDeals.reduce((sum: number, d: any) => sum + (Number(d.amount || d.value) || 0), 0);
            const contacts = Array.isArray(account.contacts) ? account.contacts : [];
            const websiteDomain = account.website || (account.name ? `${account.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : "");

            return (
              <div
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="group bg-white rounded-[24px] border border-white p-5 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between text-slate-900"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#45142B] to-[#782348] text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {nameInit}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-sm group-hover:text-[#ED1A53] transition-colors truncate">
                          {account.name || "Untitled Organization"}
                        </h3>
                        {websiteDomain && (
                          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{websiteDomain}</div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${getIndustryBadgeClass(
                        account.industry
                      )}`}
                    >
                      {account.industry || "General"}
                    </span>
                  </div>

                  {/* Card Description/Location */}
                  <div className="py-3 space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{account.address || "Global / Unassigned HQ"}</span>
                    </div>
                    {account.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{account.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Micro Metrics */}
                  <div className="grid grid-cols-2 gap-2 bg-white/70 p-3 rounded-xl border border-slate-200 mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline</div>
                      <div className="text-sm font-black text-slate-900">{formatCurrency(pipeVal)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Deals</div>
                      <div className="text-sm font-black text-slate-900">{activeDeals.length}</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{contacts.length} Contacts</span>
                  </div>

                  <span className="text-xs font-bold text-[#DC2626] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    <span>Open 360</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE NEW ACCOUNT MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Create New Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAccountForm.name.trim()) return;
                createAccountMutation.mutate(newAccountForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Global Technologies"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                  <select
                    value={newAccountForm.industry}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, industry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Energy & Utilities">Energy & Utilities</option>
                    <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. acmeglobal.com"
                    value={newAccountForm.website}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, website: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Email</label>
                  <input
                    type="email"
                    placeholder="contact@acme.com"
                    value={newAccountForm.email}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newAccountForm.phone}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">HQ Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Innovation Way, Suite 400, Austin, TX"
                  value={newAccountForm.address}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={newAccountForm.primaryContactName}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, primaryContactName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {createAccountMutation.isPending && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
