import { PowerEquipmentItem, RentalCalculationInput, RentalCalculationBreakdown } from "./types";

export const rentalCpqApi = {
  getRateCards: async (token?: string | null): Promise<PowerEquipmentItem[]> => {
    const res = await fetch("/api/v1/rental-cpq/rate-cards", {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error("Failed to fetch equipment rate cards");
    const json = await res.json();
    return json.data || [];
  },

  calculateQuote: async (
    input: RentalCalculationInput,
    token?: string | null
  ): Promise<RentalCalculationBreakdown> => {
    const res = await fetch("/api/v1/rental-cpq/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error("Failed to calculate rental quote");
    const json = await res.json();
    return json.data;
  },

  createRentalQuote: async (
    payload: {
      dealId: string;
      calculationInput: RentalCalculationInput;
      notes?: string;
      siteLocation?: string;
    },
    token?: string | null
  ): Promise<{ success: boolean; quoteId: string; quoteNumber: string; breakdown: RentalCalculationBreakdown }> => {
    const res = await fetch("/api/v1/rental-cpq/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to create rental quote");
    }
    return res.json();
  }
};
