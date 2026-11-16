import { RentalContract, GenerateContractInput } from "./types";

export const rentalContractApi = {
  getContracts: async (status?: string, token?: string | null): Promise<RentalContract[]> => {
    const query = status && status !== "ALL" ? `?status=${status}` : "";
    const res = await fetch(`/api/v1/rental-contracts${query}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to fetch rental contracts");
    const json = await res.json();
    return json.data || [];
  },

  getContractById: async (id: string, token?: string | null): Promise<RentalContract> => {
    const res = await fetch(`/api/v1/rental-contracts/${id}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to fetch contract details");
    const json = await res.json();
    return json.data;
  },

  generateContract: async (
    payload: GenerateContractInput,
    token?: string | null
  ): Promise<RentalContract> => {
    const res = await fetch("/api/v1/rental-contracts/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate rental contract");
    }
    const json = await res.json();
    return json.data;
  },

  submitLegalReview: async (id: string, token?: string | null): Promise<RentalContract> => {
    const res = await fetch(`/api/v1/rental-contracts/${id}/submit-legal`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to submit contract for legal review");
    const json = await res.json();
    return json.data;
  },

  approveLegalReview: async (id: string, token?: string | null): Promise<RentalContract> => {
    const res = await fetch(`/api/v1/rental-contracts/${id}/approve-legal`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to approve legal review");
    const json = await res.json();
    return json.data;
  },

  signClient: async (
    id: string,
    payload: { signatoryName: string; signatoryTitle: string; signatureData?: string },
    token?: string | null
  ): Promise<RentalContract> => {
    const res = await fetch(`/api/v1/rental-contracts/${id}/sign-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record client signature");
    }
    const json = await res.json();
    return json.data;
  },

  signCompany: async (
    id: string,
    signatureData?: string,
    token?: string | null
  ): Promise<RentalContract> => {
    const res = await fetch(`/api/v1/rental-contracts/${id}/sign-company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ signatureData })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to countersign rental contract");
    }
    const json = await res.json();
    return json.data;
  }
};

