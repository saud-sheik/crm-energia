import { useState, useRef } from "react";

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, Download, CheckCircle, CheckCircle2, Clock, AlertTriangle, Plus, Search, Filter, Calendar, MoreVertical, TrendingUp, Timer, Bolt, X } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "../utils/currency";
import { downloadAuthenticatedFile } from "../utils/download";
import { QuoteBillModal } from "../components/QuoteBillModal";
import { apiClient } from "../lib/apiClient";

export default function QuoteHistory() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // fires after 300ms pause
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState("All Statuses");
  const [valueBand, setValueBand] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [poModalQuote, setPoModalQuote] = useState<any | null>(null);
  const [poNumberInput, setPoNumberInput] = useState("");
  const [viewQuoteId, setViewQuoteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showDates, setShowDates] = useState(false);
  const [isSimpleView, setIsSimpleView] = useState(true);

  // Debounce search — only fire API after user pauses 300ms
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: quotes, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["quotes", debouncedSearch, status, valueBand, category, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (status && status !== "All Statuses") params.append("status", status);
      if (valueBand) params.append("valueBand", valueBand);
      if (category) params.append("category", category);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/v1/quotes?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    }
  });

  const totalPages = quotes ? Math.ceil(quotes.length / pageSize) : 1;
  const paginatedQuotes = quotes?.slice((page - 1) * pageSize, page * pageSize) || [];

  const invoiceMutation = useMutation({
    queryKey: ["invoiceFromQuote"],
    mutationFn: async (quoteId: string) => {
      const res = await fetch("/api/v1/invoices/from-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ quoteId })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      window.location.href = `/invoices`;
    }
  } as any);

  const recordPoMutation = useMutation({
    mutationFn: async ({ quoteId, amount, poNumber }: { quoteId: string; amount: number; poNumber: string }) => {
      const res = await fetch("/api/v1/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ quoteId, amount, poNumber })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      alert("Purchase Order recorded successfully!");
      refetch();
    },
    onError: (err: any) => {
      alert("Error: " + err.message);
    }
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "All Statuses") params.append("status", status);
    if (valueBand) params.append("valueBand", valueBand);
    if (category) params.append("category", category);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    try {
      const res = await fetch(`/api/v1/exports/quotes?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export quotes");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quotes_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)] relative text-slate-900 animate-fade-in">
      <div className="w-full px-6 md:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Standard Quotes</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review commercial quotation proposals, document revisions, and signed contract values.
            </p>
          </div>
          <Link
            to="/quotes/new"
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quote</span>
          </Link>
        </div>
        
        {/* Dashboard Stats Bento Grid (Pinterest Web 2.0 Elevated Cards with Circular Telemetry Rings) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                <Filter className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-indigo-500" strokeDasharray="75, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-indigo-700 font-mono">List</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Quotations</span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">{quotes?.length || 0}</div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active proposals list count</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeDasharray="85, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-emerald-700 font-mono">Value</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Value</span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">
                {formatCurrencyCompact(quotes?.reduce((acc: number, q: any) => acc + Number(q.totalAmount || 0), 0) || 0)}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              Combined value of filtered quotes
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
                <Timer className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-amber-500" strokeDasharray="40, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-amber-700 font-mono">Action</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Pending Approvals</span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">
                {quotes?.filter((q: any) => q.status === "Pending Approval" || q.status === "Pending").length || 0}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1">
              Requires commercial action
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between text-slate-900 group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#DC2626] shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-2xs">
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-red-500" strokeDasharray="65, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-red-700 font-mono">Won</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Accepted (Won)</span>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">
                {quotes?.filter((q: any) => q.status === "Accepted").length || 0}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-red-600 flex items-center gap-1">
              DocuSigned quotes
            </div>
          </div>
        </div>

        {/* Filters Section (Elevated White Panel) */}
        <div className="bg-white rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] border border-white p-4 mb-6 flex flex-wrap items-center gap-4 text-slate-900">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-300">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">Filter By</span>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <input 
              type="text"
              placeholder="Search Ref / Client..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-[#45142B] w-48 font-medium shadow-2xs"
            />
            
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-[#45142B] font-medium shadow-2xs"
            >
              <option>All Statuses</option>
              <option>Draft</option>
              <option>Pending Approval</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Expired</option>
              <option>Accepted</option>
            </select>
            
            <select 
              value={valueBand}
              onChange={(e) => setValueBand(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-[#45142B] font-medium shadow-2xs"
            >
              <option value="">All Value Bands</option>
              <option value="low">Low (≤ 10k SAR)</option>
              <option value="medium">Medium (10k - 50k SAR)</option>
              <option value="high">High (&gt; 50k SAR)</option>
            </select>

            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-[#45142B] font-medium shadow-2xs"
            >
              <option value="">All Categories</option>
              <option value="Standard Tier">Standard Tier</option>
              <option value="Enterprise VIP">Enterprise VIP</option>
              <option value="Premium Modular">Premium Modular</option>
              <option value="Eco Prefab">Eco Prefab</option>
            </select>

            <button 
              onClick={() => setShowDates(!showDates)}
              className={`bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs ${showDates ? 'bg-red-50 text-[#DC2626] border-red-200' : 'text-slate-700'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range</span>
            </button>

            {showDates && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 animate-fade-in text-xs shadow-2xs">
                <span className="text-[10px] text-slate-400">From</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400">To</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs outline-none font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => refetch()}
              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            >
              Apply Filters
            </button>
            <button 
              onClick={handleExport}
              className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <div className="flex border border-slate-300 rounded-xl overflow-hidden p-0.5 bg-slate-200/80">
              <button 
                onClick={() => setIsSimpleView(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${isSimpleView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Simple
              </button>
              <button 
                onClick={() => setIsSimpleView(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!isSimpleView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Full
              </button>
            </div>
            <Link 
              to="/quotes/new"
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Quote
            </Link>
          </div>
        </div>

        {/* Quotations Table (Elevated White Panel) */}
        <div className="bg-white rounded-[24px] shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] border border-white overflow-hidden mb-8 text-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-200/80 backdrop-blur-sm border-b border-slate-300">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Ref ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Customer / Lead</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Value</th>
                  {!isSimpleView && <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Stage</th>}
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Status</th>
                  {!isSimpleView && <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Expires In</th>}
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={isSimpleView ? 5 : 7} className="px-6 py-8 text-center text-on-surface-variant animate-pulse">Loading quote history...</td>
                  </tr>
                ) : !quotes || quotes.length === 0 ? (
                  <tr>
                    <td colSpan={isSimpleView ? 5 : 7} className="px-6 py-16 text-center space-y-3">
                      <p className="font-bold text-on-surface-variant">No quotes built yet — start pitching your proposals!</p>
                      <button onClick={() => window.location.href = '/quotes/new'} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-90">
                        + Create First Quote
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedQuotes?.map((quote: any, idx: number) => {
                    const clientName = quote.deal?.lead?.company || quote.deal?.lead?.firstName + " " + quote.deal?.lead?.lastName || "Unknown Client";
                    const ownerName = quote.deal?.owner?.name || "Unassigned";
                    const formattedDate = new Date(quote.createdAt).toLocaleDateString();

                    return (
                    <tr key={quote.id || idx} className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer" onClick={() => setViewQuoteId(quote.id)}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary">{quote.id.substring(0,8)}</span>
                        <p className="text-[10px] text-outline mt-1">Created: {formattedDate}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-xs">
                            {clientName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-on-surface">{clientName}</div>
                            <div className="text-[12px] text-outline">{ownerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-on-surface">
                          {formatCurrency(quote.totalAmount)}
                        </span>
                      </td>
                      {!isSimpleView && (
                        <td className="px-6 py-4">
                          {(() => {
                            const status = quote.status || "Draft";
                            const stageName = quote.deal?.stage?.name;
                            let barWidth = "w-1/4";
                            let barColor = "bg-blue-500";
                            let label = stageName || "DRAFT";

                            if (status === "Accepted" || stageName === "Won" || stageName === "Closed Won") {
                              barWidth = "w-full";
                              barColor = "bg-emerald-500";
                              label = stageName || "CLOSED WON";
                            } else if (status === "Approved") {
                              barWidth = "w-5/6";
                              barColor = "bg-emerald-500";
                              label = stageName || "APPROVED";
                            } else if (status === "Pending Approval" || status === "Pending") {
                              barWidth = "w-1/2";
                              barColor = "bg-amber-500";
                              label = stageName || "PENDING APPROVAL";
                            } else if (status === "Rejected" || status === "Declined") {
                              barWidth = "w-full";
                              barColor = "bg-rose-500";
                              label = stageName || "REJECTED";
                            }

                            return (
                              <>
                                <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                  <div className={`h-full ${barColor} ${barWidth} transition-all duration-300`}></div>
                                </div>
                                <p className="text-[10px] font-bold text-outline mt-1 uppercase tracking-wider">{label}</p>
                              </>
                            );
                          })()}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                          quote.status === 'Approved' || quote.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          quote.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          quote.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                          quote.status === 'Rejected' || quote.status === 'Declined' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      {!isSimpleView && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-on-surface-variant">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{quote.expirationDate ? new Date(quote.expirationDate).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setViewQuoteId(quote.id)}
                            className="px-2.5 py-1 bg-surface-container border border-outline-variant text-on-surface text-[10px] font-bold uppercase rounded hover:bg-surface-container-high transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-slate-500" /> View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAuthenticatedFile(`/api/v1/quotes/${quote.id}/pdf`, `Quote_${quote.id.substring(0,8)}.pdf`, token);
                            }}
                            className="px-2.5 py-1 bg-surface-container border border-outline-variant text-on-surface text-[10px] font-bold uppercase rounded hover:bg-surface-container-high transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          {quote.status !== 'Accepted' && quote.status !== 'Superseded' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Simulate client signing this quote via DocuSign?")) {
                                  const res = await fetch(`/api/v1/public/quotes/${quote.id}/sign`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ signedBy: quote.deal?.lead ? `${quote.deal.lead.firstName} ${quote.deal.lead.lastName}` : "Ahmed Al-Farsi" })
                                  });
                                  if (res.ok) {
                                    alert("Quote signed successfully!");
                                    // Targeted cache invalidation — replaces window.location.reload()
                                    queryClient.invalidateQueries({ queryKey: ["quotes"] });
                                  } else {
                                    const errData = await res.json().catch(() => ({}));
                                    alert(`Failed to sign quote: ${errData.error || res.statusText || "Server error"}`);
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold uppercase rounded hover:opacity-90 transition-all"
                            >
                              DocuSign
                            </button>
                          )}
                          {quote.status !== 'Rejected' && quote.status !== 'Declined' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Mark quote ${quote.id.substring(0,8)} as declined/rejected by customer?`)) {
                                  await apiClient.post(`/api/v1/quotes/${quote.id}/reject`, { reason: "Price / Commercial terms" });
                                  queryClient.invalidateQueries({ queryKey: ["quotes"] });
                                }
                              }}
                              className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase rounded hover:bg-rose-100 transition-all cursor-pointer"
                              title="Mark Quote as Declined/Rejected"
                            >
                              Reject
                            </button>
                          )}
                           {quote.status === 'Approved' && (
                            <>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setPoModalQuote(quote);
                                  setPoNumberInput(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
                                }}
                                disabled={recordPoMutation.isPending}
                                className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold uppercase rounded hover:opacity-90 transition-all shadow-xs whitespace-nowrap flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Record PO
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); invoiceMutation.mutate(quote.id); }}
                                disabled={invoiceMutation.isPending}
                                className="px-3 py-1 bg-secondary text-white text-[10px] font-bold uppercase rounded hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
                              >
                                Generate Invoice
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="bg-surface-container-low px-6 py-3 flex items-center justify-between border-t border-outline-variant">
            <span className="text-sm text-outline">
              Showing {Math.min((page - 1) * pageSize + 1, quotes?.length || 0)} to {Math.min(page * pageSize, quotes?.length || 0)} of {quotes?.length || 0} results
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-outline-variant rounded hover:bg-surface-variant transition-colors disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button 
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-sm font-bold flex items-center justify-center transition-colors ${page === p ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant'}`}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-outline-variant rounded hover:bg-surface-variant transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Floating Card (UX Detail) */}
        <div className="fixed bottom-8 right-8 w-80 bg-surface-container-lowest border border-outline-variant shadow-xl rounded-xl overflow-hidden z-40 transition-transform hover:-translate-y-1">
          <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-bold tracking-wider uppercase">Sync Feed</span>
            <Bolt className="w-4 h-4" />
          </div>
          <div className="p-4 max-h-60 overflow-y-auto space-y-4">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary animate-pulse shrink-0"></div>
              <div>
                <p className="text-sm font-semibold text-on-surface">QT-8821 was Approved</p>
                <p className="text-[10px] text-outline">Just now by Manager</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-outline shrink-0"></div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Price Book updated</p>
                <p className="text-[10px] text-outline">15 minutes ago</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-tertiary shrink-0"></div>
              <div>
                <p className="text-sm font-semibold text-on-surface">Lead: Tata Steel assigned</p>
                <p className="text-[10px] text-outline">45 minutes ago</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowAuditModal(true)}
            className="w-full py-2 text-center text-[12px] font-bold tracking-wider uppercase text-primary border-t border-outline-variant hover:bg-primary-container/10 transition-colors"
          >
            View Full Audit Trail
          </button>
        </div>

        {/* Audit Trail Modal Overlay */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
              <div className="bg-primary text-on-primary px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bolt className="w-5 h-5" />
                  <h3 className="font-bold text-sm tracking-wider uppercase">System Audit Trail</h3>
                </div>
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className="text-on-primary/80 hover:text-on-primary text-sm font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-all"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="relative border-l-2 border-outline/30 pl-6 ml-3 space-y-6">
                  {/* Event 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                      <CheckCircle className="w-2.5 h-2.5 text-on-primary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">Quote Approved</span>
                      <span className="text-[10px] text-outline ml-2">Just now (12:35 PM)</span>
                      <h4 className="text-sm font-bold text-on-surface mt-1">QT-8821 was Approved</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Quote amount of <strong>SAR 45,000.00</strong> passed automatic floor limits check and was approved by <strong>Emma Watson (Manager)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Event 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-secondary border-2 border-card flex items-center justify-center">
                      <Clock className="w-2.5 h-2.5 text-on-secondary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded">Catalog Update</span>
                      <span className="text-[10px] text-outline ml-2">15 minutes ago (12:20 PM)</span>
                      <h4 className="text-sm font-bold text-on-surface mt-1">Price Book updated</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Refreshed 8 items from the master price catalog. Automatic pricing tiers synchronized successfully.
                      </p>
                    </div>
                  </div>

                  {/* Event 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-tertiary border-2 border-card flex items-center justify-center">
                      <TrendingUp className="w-2.5 h-2.5 text-on-tertiary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">Lead Assigned</span>
                      <span className="text-[10px] text-outline ml-2">45 minutes ago (11:50 AM)</span>
                      <h4 className="text-sm font-bold text-on-surface mt-1">Lead: Tata Steel assigned</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Assigned automatically to representative <strong>Liam Carter</strong> based on rule priority 1 (Industry matching: Technology).
                      </p>
                    </div>
                  </div>

                  {/* Event 4 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-outline border-2 border-card flex items-center justify-center">
                      <AlertTriangle className="w-2.5 h-2.5 text-card" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-outline bg-outline/10 px-2 py-0.5 rounded">Quote Created</span>
                      <span className="text-[10px] text-outline ml-2">3 hours ago (09:36 AM)</span>
                      <h4 className="text-sm font-bold text-on-surface mt-1">Quote QT-2026-00002 created</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Netflix Production Cabins deal quote draft initialized with 1 item.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low px-6 py-4 border-t border-border flex justify-end">
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className="px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modern Record Purchase Order (PO) Modal */}
      {poModalQuote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" /> Record Purchase Order (PO)
              </h3>
              <button onClick={() => setPoModalQuote(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60 text-xs text-on-surface-variant space-y-1.5">
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Customer / Lead:</span> <span className="font-bold text-on-surface">{poModalQuote.deal?.lead ? `${poModalQuote.deal.lead.firstName} ${poModalQuote.deal.lead.lastName}` : "Client"}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Quote Ref:</span> <span className="font-mono text-on-surface">{poModalQuote.quoteNumber || "QT-2026-00159"}</span></div>
                <div className="flex justify-between"><span className="font-semibold text-slate-500">Total Value:</span> <span className="font-bold text-green-700">{formatCurrency(poModalQuote.totalAmount || 24000)}</span></div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Enter Purchase Order (PO) Number
                </label>
                <input
                  type="text"
                  value={poNumberInput}
                  onChange={(e) => setPoNumberInput(e.target.value)}
                  placeholder="e.g. PO-2026-9941"
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl text-sm bg-surface text-on-surface focus:ring-2 focus:ring-amber-500 font-mono shadow-2xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
              <button
                onClick={() => setPoModalQuote(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-surface-container rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (poNumberInput.trim()) {
                    recordPoMutation.mutate({ quoteId: poModalQuote.id, amount: poModalQuote.totalAmount, poNumber: poNumberInput.trim() });
                    setPoModalQuote(null);
                  }
                }}
                disabled={recordPoMutation.isPending || !poNumberInput.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Record PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal Popup */}
      {viewQuoteId && (
        <QuoteBillModal
          quoteId={viewQuoteId}
          onClose={() => setViewQuoteId(null)}
        />
      )}

      </div>
    </div>
  );
}
