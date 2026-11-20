import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Settings as SettingsIcon, Shield, CheckCircle, RefreshCw, UserCheck, ToggleLeft, ToggleRight, Users, Mail, MessageCircle, Copy, ExternalLink, Check, ShieldAlert } from "lucide-react";
import { WhatsAppDiagnosticsModal } from "../components/WhatsAppDiagnosticsModal";
import { DealAssignmentSettingsCard } from "../components/DealAssignmentSettingsCard";
import { CommissionSplitAndTiersCard } from "../components/CommissionSplitAndTiersCard";

export default function Settings() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const webhookUrl = `${window.location.origin}/api/v1/whatsapp/webhook`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Fetch current user settings
  const { data: mySettings } = useQuery({
    queryKey: ["mySettings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/users/me/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    }
  });

  // Fetch Gmail status
  const { data: gmailConfig, refetch: refetchGmail } = useQuery({
    queryKey: ["gmailStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/gmail/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch Gmail status");
      return res.json();
    }
  });

  const connectGmailMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/v1/gmail/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ code })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmailStatus"] });
      setMessage("Gmail connected successfully!");
      setAuthCode("");
      setShowCodeInput(false);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to connect Gmail");
    }
  });

  const syncGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/gmail/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["gmailStatus"] });
      setMessage(`Sync complete! Ingested ${data.ingestedCount} new leads.`);
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || "Sync failed");
    }
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/gmail/disconnect", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmailStatus"] });
      setMessage("Gmail disconnected.");
      setTimeout(() => setMessage(null), 3000);
    }
  });

  const handleStartOAuth = async () => {
    try {
      const res = await fetch("/api/v1/gmail/auth-url", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate Auth URL");
      const { url } = await res.json();
      
      // If mock client id, open mock prompt
      if (url.includes("MOCK_CLIENT_ID")) {
        const mockCode = prompt("Enter mock authorization code (e.g. mock_auth_code_123) to complete simulated integration:");
        if (mockCode) {
          connectGmailMutation.mutate(mockCode);
        }
      } else {
        window.open(url, "_blank");
        setShowCodeInput(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Fetch direct reports (team members)
  const { data: team } = useQuery<any[]>({
    queryKey: ["myTeam"],
    queryFn: async () => {
      const res = await fetch("/api/v1/users/me/team", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json();
    },
    enabled: !!token && ["admin", "director", "manager"].includes(user?.role || "")
  });

  // Fetch all potential managers
  const { data: salespersons } = useQuery<any[]>({
    queryKey: ["salespersons"],
    queryFn: async () => {
      const res = await fetch("/api/v1/salespersons", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch representatives");
      return res.json();
    },
    enabled: !!token && ["admin", "director", "manager"].includes(user?.role || "")
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/users/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySettings"] });
      setMessage("Settings updated successfully!");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setMessage(null), 3000);
    }
  });

  const reassignManagerMutation = useMutation({
    mutationFn: async ({ memberId, managerId }: { memberId: string; managerId: string | null }) => {
      const res = await fetch("/api/v1/users/team/reassign", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ memberId, managerId })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTeam"] });
      setMessage("Team manager reassigned successfully!");
      setTimeout(() => setMessage(null), 3000);
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    updateSettingsMutation.mutate({ password });
  };

  const handleAvailabilityToggle = () => {
    if (!mySettings) return;
    updateSettingsMutation.mutate({ isAvailable: !mySettings.isAvailable });
  };

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)] relative">
      <div className="max-w-[1000px] mx-auto p-6 md:p-8 space-y-8 animate-fade-in font-sans">
        
        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-[#DC2626] shadow-sm">
              <SettingsIcon className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">User & Workspace Settings</h2>
              <p className="text-xs text-slate-500 font-medium">Update your password, set availability, and manage direct reports and workspace configurations.</p>
            </div>
          </div>
        </div>

        {/* Quick Access to Workspace Configurations & Master Data */}
        <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-4 text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">Workspace Master Data & Administration</h3>
              <p className="text-xs text-slate-600 font-medium">Access system parameters, price books, and workflow configurations.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "Requirements", path: "/master-data/requirements" },
              { name: "Line Items", path: "/master-data/line-items" },
              { name: "Construction Items", path: "/master-data/construction-items" },
              { name: "Pricing Grid", path: "/master-data/pricing" },
              { name: "Lead Sources", path: "/master-data/lead-sources" },
              { name: "KPI Master", path: "/master-data/kpis" },
              { name: "Price Book", path: "/price-book" },
              { name: "Assignment Rules", path: "/rules" },
              { name: "Workflow Engine", path: "/automation" },
              { name: "Approval Queue", path: "/approvals" }
            ].map(item => (
              <a
                key={item.name}
                href={item.path}
                className="p-3 bg-white/90 hover:bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 hover:text-[#DC2626] transition-all flex items-center justify-between group shadow-2xs"
              >
                <span>{item.name}</span>
                <span className="text-slate-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Senior AE Deal Assignment & Capacity Settings */}
        {["admin", "director", "manager"].includes(mySettings?.role || user?.role || "") && (
          <>
            <CommissionSplitAndTiersCard />
            <DealAssignmentSettingsCard />
          </>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-4 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Security and Status */}
          <div className="space-y-8">
            {/* Availability card */}
            <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-4 text-slate-900">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#45142B]" />
                Availability Status
              </h3>
              <p className="text-xs text-slate-600 font-medium">Configure whether you are currently eligible to receive new lead assignments dynamically.</p>
              
              <div className="flex items-center justify-between p-4 bg-white/90 rounded-xl border border-slate-200/90">
                <div>
                  <p className="font-bold text-sm text-slate-900">Accepting New Leads</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Toggle availability status on the lead engine</p>
                </div>
                <button 
                  onClick={handleAvailabilityToggle}
                  disabled={updateSettingsMutation.isPending}
                  className="focus:outline-none hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {mySettings?.isAvailable ? (
                    <ToggleRight className="w-12 h-12 text-[#ED1A53]" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Gmail Connector Card */}
            <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-4 text-slate-900">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#45142B]" />
                Gmail Lead Ingestion
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Connect your business Gmail account to automatically monitor and ingest incoming customer emails as leads.
              </p>

              {gmailConfig?.connected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Connected Account</p>
                    <p className="text-sm font-black text-emerald-950">{gmailConfig.email}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Last Checked: {gmailConfig.lastSyncedAt ? new Date(gmailConfig.lastSyncedAt).toLocaleString() : "Never"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => syncGmailMutation.mutate()}
                      disabled={syncGmailMutation.isPending}
                      className="flex-1 py-2.5 bg-[#45142B] text-white font-bold rounded-xl hover:bg-[#320e1f] active:scale-95 transition-all text-xs shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncGmailMutation.isPending ? "animate-spin" : ""}`} />
                      Sync Now
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Disconnect Gmail account? Lead ingestion for this account will stop.")) {
                          disconnectGmailMutation.mutate();
                        }
                      }}
                      disabled={disconnectGmailMutation.isPending}
                      className="py-2.5 px-4 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl hover:bg-rose-100 transition-colors text-xs cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleStartOAuth}
                    className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    Connect Gmail Account
                  </button>

                  {showCodeInput && (
                    <div className="border border-slate-200/90 rounded-xl p-4 bg-white/90 space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Consent tab opened in a new window. Copy the authorization code from the redirect URL and paste below to complete setup:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                          placeholder="4/0AdQt8..."
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#45142B] focus:outline-none"
                        />
                        <button
                          onClick={() => connectGmailMutation.mutate(authCode)}
                          disabled={connectGmailMutation.isPending || !authCode.trim()}
                          className="px-4 py-2 bg-[#45142B] text-white text-xs font-bold rounded-xl hover:bg-[#320e1f] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp Business API Card */}
            <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-4 text-slate-900">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                WhatsApp Business API
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Receive and send WhatsApp messages via Meta Cloud API. Incoming messages auto-create leads and activity logs.
              </p>

              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800">Webhook Endpoint Registered</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Webhook URL (paste in Meta Developer Console)</p>
                  <div className="flex items-center gap-2 bg-white border border-emerald-300 rounded-xl px-3 py-2">
                    <code className="text-[11px] text-slate-700 flex-1 truncate font-mono">{webhookUrl}</code>
                    <button
                      onClick={copyWebhook}
                      className="shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                      title="Copy webhook URL"
                    >
                      {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-emerald-700 font-bold">Verify Token</p>
                    <p className="font-mono text-slate-700">nexus_whatsapp_webhook_secret_2026</p>
                  </div>
                  <div>
                    <p className="text-emerald-700 font-bold">API Version</p>
                    <p className="text-slate-700">Meta Cloud API v18.0</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Setup Checklist</p>
                {[
                  { done: true, label: "WHATSAPP_TOKEN configured in .env" },
                  { done: true, label: "WHATSAPP_PHONE_NUMBER_ID configured in .env" },
                  { done: true, label: "Webhook endpoint live at /api/v1/whatsapp/webhook" },
                  { done: false, label: "Register webhook URL in Meta Developer Console" },
                  { done: false, label: "Add phone number to WhatsApp Business API" },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-xl ${step.done ? "bg-emerald-50 text-emerald-800 font-semibold" : "bg-white/80 text-slate-500 font-medium"}`}>
                    <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${step.done ? "text-emerald-600" : "text-slate-300"}`} />
                    {step.label}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Meta Cloud API Docs
                </a>

                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 hover:bg-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Launch Diagnostics & Logs
                </button>
              </div>
            </div>

            {/* Profile info & Password change */}
            <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-6 text-slate-900">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#45142B]" />
                Security & Role info
              </h3>

              <div className="space-y-2 text-xs">
                <p><span className="font-bold text-slate-600">Role:</span> <span className="bg-[#45142B]/10 text-[#45142B] font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">{mySettings?.role || user?.role}</span></p>
                <p><span className="font-bold text-slate-600">Email:</span> <span className="font-semibold text-slate-800">{mySettings?.email || user?.email}</span></p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 border-t border-slate-200/80 pt-6">
                <h4 className="font-bold text-sm text-slate-900">Update Password</h4>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">New Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/90 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#45142B] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/90 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#45142B] focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateSettingsMutation.isPending || !password.trim()}
                  className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl active:scale-95 transition-all shadow-md disabled:opacity-50 text-xs cursor-pointer"
                >
                  Change Password
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Team Management (if applicable) */}
          {["admin", "director", "manager"].includes(mySettings?.role || user?.role || "") && (
            <div className="bg-white border border-white rounded-[24px] p-6 shadow-[0_12px_28px_-6px_rgba(100,116,180,0.10),0_4px_10px_-2px_rgba(100,116,180,0.05)] space-y-6 text-slate-900">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Team Reports ({team?.length || 0})
              </h3>
              <p className="text-xs text-slate-600 font-medium">View representatives reporting directly to you and manage their manager assignments.</p>

              <div className="space-y-4 divide-y divide-slate-200/80">
                {team?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 font-medium italic">No team members report to you directly.</p>
                ) : (
                  team?.map((member: any) => (
                    <div key={member.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email} | {member.role}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          member.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}>
                          {member.isAvailable ? "Available" : "OOO"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-600 font-bold whitespace-nowrap">Reassign Manager:</label>
                        <select
                          value={member.managerId || ""}
                          onChange={(e) => reassignManagerMutation.mutate({ 
                            memberId: member.id, 
                            managerId: e.target.value || null 
                          })}
                          className="flex-1 bg-white/90 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-[#45142B] focus:outline-none cursor-pointer"
                        >
                          <option value="">No Manager (Direct/Independent)</option>
                          {salespersons
                            ?.filter(s => s.id !== member.id) // Cannot manage yourself
                            ?.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      <WhatsAppDiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </div>
  );
}
