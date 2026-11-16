import { CreditApplication, SubmitCreditApplicationInput, ReviewCreditDecisionInput } from "./types";

export const creditKycApi = {
  getQueue: async (status?: string, token?: string | null): Promise<CreditApplication[]> => {
    const query = status && status !== "ALL" ? `?status=${status}` : "";
    const res = await fetch(`/api/v1/credit-kyc/queue${query}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to fetch credit applications");
    const json = await res.json();
    return json.data || [];
  },

  getDealCredit: async (dealId: string, token?: string | null): Promise<CreditApplication | null> => {
    const res = await fetch(`/api/v1/credit-kyc/deal/${dealId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to fetch deal credit status");
    const json = await res.json();
    return json.data || null;
  },

  submitApplication: async (
    payload: SubmitCreditApplicationInput,
    token?: string | null
  ): Promise<CreditApplication> => {
    const res = await fetch("/api/v1/credit-kyc/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit credit application");
    }
    const json = await res.json();
    return json.data;
  },

  reviewApplication: async (
    id: string,
    payload: ReviewCreditDecisionInput,
    token?: string | null
  ): Promise<CreditApplication> => {
    const res = await fetch(`/api/v1/credit-kyc/review/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to review credit application");
    }
    const json = await res.json();
    return json.data;
  },

  activateAdvanceFallback: async (
    id: string,
    notes?: string,
    token?: string | null
  ): Promise<CreditApplication> => {
    const res = await fetch(`/api/v1/credit-kyc/fallback-advance/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to activate advance payment fallback");
    }
    const json = await res.json();
    return json.data;
  },

  confirmAdvancePayment: async (
    id: string,
    token?: string | null
  ): Promise<CreditApplication> => {
    const res = await fetch(`/api/v1/credit-kyc/confirm-advance/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to confirm advance deposit");
    }
    const json = await res.json();
    return json.data;
  }
};

