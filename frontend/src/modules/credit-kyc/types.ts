export type CreditStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "DECLINED"
  | "ADVANCE_PAYMENT_REQUIRED";

export interface KycDocumentAttachment {
  type: "trade_license" | "commercial_registration" | "aof" | "vat_certificate" | "other";
  name: string;
  url?: string;
  uploadedAt: string;
  notes?: string;
}

export interface CreditApplication {
  id: string;
  dealId: string;
  accountId?: string | null;
  quoteId?: string | null;
  status: CreditStatus;
  requestedCreditLimit: number;
  approvedCreditLimit?: number | null;
  requestedPaymentTerms: string;
  approvedPaymentTerms?: string | null;
  tradeLicenseNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
  kycDocuments?: string | null; // serialized JSON
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  declineReason?: string | null;
  notes?: string | null;
  fallbackToAdvancePayment: boolean;
  advancePaymentReceived: boolean;
  createdAt: string;
  updatedAt: string;
  deal?: {
    id: string;
    title?: string;
    name?: string;
    amount?: number;
    dealValue?: number;
    winProbability?: number;
    stage?: string;
    account?: {
      id: string;
      name: string;
    };
    lead?: {
      id: string;
      company?: string;
      firstName?: string;
      lastName?: string;
    };
  };
  account?: {
    id: string;
    name: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface SubmitCreditApplicationInput {
  dealId: string;
  accountId?: string;
  quoteId?: string;
  requestedCreditLimit: number;
  requestedPaymentTerms: "30_DAYS" | "60_DAYS" | "90_DAYS" | "ADVANCE";
  tradeLicenseNumber?: string;
  commercialRegistrationNumber?: string;
  vatRegistrationNumber?: string;
  kycDocuments?: KycDocumentAttachment[];
  notes?: string;
}

export interface ReviewCreditDecisionInput {
  status: "APPROVED" | "DECLINED" | "ADVANCE_PAYMENT_REQUIRED";
  approvedCreditLimit?: number;
  approvedPaymentTerms?: string;
  declineReason?: string;
  notes?: string;
}
