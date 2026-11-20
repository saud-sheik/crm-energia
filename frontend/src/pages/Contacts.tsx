import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { Users, Mail, Phone, Building, Search, ArrowUpRight } from "lucide-react";

export default function Contacts() {
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await apiClient("/api/v1/contacts");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-6">Error loading contacts</div>;
  }

  const totalContacts = contacts?.length || 0;
  const accountsCount = new Set(contacts?.map((c: any) => c.account?.id).filter(Boolean)).size;
  const activeDealsCount = contacts?.reduce((sum: number, c: any) => sum + (c.deals?.length || 0), 0) || 0;

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Contacts Directory
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Manage your global directory of stakeholders, decision makers, and leads.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search contacts..." 
            className="pl-10 pr-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200/90 shadow-2xs rounded-xl focus:ring-2 focus:ring-[#45142B]/10 focus:border-[#45142B] outline-none transition-all w-64 focus:w-80 text-xs font-semibold"
          />
        </div>
      </header>

      {/* ─── KPI METRICS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Contacts */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            {/* Circular Progress Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#4F46E5" strokeWidth="3.2" strokeDasharray="88" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-black text-indigo-700">100%</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Contacts</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight mt-0.5">{totalContacts}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Global Stakeholders</span>
            <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">Verified</span>
          </div>
        </div>

        {/* Associated Accounts */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shadow-2xs">
              <Building className="w-5 h-5" />
            </div>
            {/* Circular Progress Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#06B6D4" strokeWidth="3.2" strokeDasharray="88" strokeDashoffset="24" strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-black text-cyan-700">Active</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Connected Accounts</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight mt-0.5">{accountsCount}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-cyan-700">
            <span>Corporate Relationships</span>
            <span className="text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full text-[10px]">Linked</span>
          </div>
        </div>

        {/* Active Deals Connected */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.12),0_4px_10px_-2px_rgba(100,116,180,0.06)] border border-white hover:shadow-[0_18px_38px_-6px_rgba(100,116,180,0.20)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            {/* Circular Progress Gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="3.2" strokeDasharray="88" strokeDashoffset="18" strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-black text-emerald-700">Deals</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Associated Deals</span>
            <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight mt-0.5">{activeDealsCount}</div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Pipeline Engagements</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Active</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-white shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-200/80 border-b border-slate-300">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Account</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Info</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Active Deals</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-transparent">
            {contacts?.map((contact: any) => (
              <tr key={contact.id} className="hover:bg-slate-200/50 transition-colors duration-200 group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-white shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <span className="text-emerald-700 font-bold text-lg">
                        {contact.firstName?.charAt(0) || "?"}{contact.lastName?.charAt(0) || ""}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-xs text-gray-500">Source: {contact.sourceChannel || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    {contact.account?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-gray-600">
                      <Mail className="w-3 h-3 text-gray-400 mr-2" />
                      {contact.email || '-'}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Phone className="w-3 h-3 text-gray-400 mr-2" />
                      {contact.phone || '-'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {contact.deals?.length > 0 ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800 shadow-sm border border-teal-200">
                        {contact.deals.length} Deals
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No deals</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center inline-flex space-x-1">
                    <span>View</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {contacts?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-600 font-semibold bg-slate-100/90">
                  No contacts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
