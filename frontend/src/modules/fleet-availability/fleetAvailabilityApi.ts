import { AssetBooking, FleetAssetMatrixItem, CreateBookingInput } from "./types";

export const fleetAvailabilityApi = {
  getMatrix: async (
    startDate: string,
    endDate: string,
    token?: string | null
  ): Promise<FleetAssetMatrixItem[]> => {
    const res = await fetch(
      `/api/v1/fleet-availability/matrix?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      }
    );
    if (!res.ok) throw new Error("Failed to fetch fleet availability matrix");
    const json = await res.json();
    return json.data || [];
  },

  checkAvailability: async (
    assetId: string,
    startDate: string,
    endDate: string,
    token?: string | null
  ): Promise<{ isAvailable: boolean; conflictingBookings: any[] }> => {
    const res = await fetch(
      `/api/v1/fleet-availability/check?assetId=${assetId}&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to check equipment availability");
    }
    const json = await res.json();
    return json.data;
  },

  getSchedule: async (
    startDate?: string,
    endDate?: string,
    token?: string | null
  ): Promise<AssetBooking[]> => {
    const query = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";
    const res = await fetch(`/api/v1/fleet-availability/schedule${query}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error("Failed to fetch fleet schedule");
    const json = await res.json();
    return json.data || [];
  },

  createBooking: async (
    payload: CreateBookingInput,
    token?: string | null
  ): Promise<AssetBooking> => {
    const res = await fetch("/api/v1/fleet-availability/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create equipment booking");
    }
    const json = await res.json();
    return json.data;
  },

  updateStatus: async (
    id: string,
    status: "RESERVED" | "DISPATCHED_ON_HIRE" | "COMPLETED" | "CANCELLED",
    token?: string | null
  ): Promise<AssetBooking> => {
    const res = await fetch(`/api/v1/fleet-availability/bookings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update booking status");
    }
    const json = await res.json();
    return json.data;
  }
};
