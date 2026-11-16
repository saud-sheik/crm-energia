export type BookingStatus =
  | "RESERVED"
  | "DISPATCHED_ON_HIRE"
  | "COMPLETED"
  | "CANCELLED";

export interface AssetBooking {
  id: string;
  assetId: string;
  dealId?: string | null;
  quoteId?: string | null;
  customerId?: string | null;
  bookingStatus: BookingStatus;
  startDate: string;
  endDate: string;
  siteLocation?: string | null;
  assignedOperatorName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    name: string;
    type?: string;
    serialNumber?: string;
    assetNumber?: string;
  };
  deal?: {
    id: string;
    title?: string;
    name?: string;
  };
  customer?: {
    id: string;
    name: string;
  };
}

export interface FleetAssetMatrixItem {
  id: string;
  name: string;
  type?: string;
  serialNumber?: string | null;
  assetNumber?: string | null;
  modelNumber?: string | null;
  currentBaseStatus: string;
  isAvailableInHireWindow: boolean;
  bookingCount: number;
  bookings: AssetBooking[];
}

export interface CreateBookingInput {
  assetId: string;
  dealId?: string;
  quoteId?: string;
  customerId?: string;
  startDate: string;
  endDate: string;
  siteLocation?: string;
  assignedOperatorName?: string;
  notes?: string;
}
