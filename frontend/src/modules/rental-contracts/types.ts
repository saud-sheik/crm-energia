export type ContractStatus =
  | "DRAFT"
  | "LEGAL_REVIEW"
  | "AWAITING_CLIENT_SIGNATURE"
  | "AWAITING_COMPANY_SIGNATURE"
  | "ACTIVE"
  | "TERMINATED"
  | "EXPIRED";

export interface RentalContract {
  id: string;
  contractNumber: string;
  dealId: string;
  quoteId?: string | null;
  accountId?: string | null;
  status: ContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  totalContractValue: number;
  monthlyRecurringRate?: number | null;
  securityDepositAmount: number;
  breakdownResponseSlaHours: number; // 2, 4, 8
  backupUnitCommitment: boolean;
  insuranceResponsibility: string;
  damageLiabilityTerms?: string | null;
  siteLocation?: string | null;
  equipmentSummary?: string | null;
  clientSignatoryName?: string | null;
  clientSignatoryTitle?: string | null;
  clientSignedAt?: string | null;
  clientSignatureData?: string | null;
  companySignatoryUserId?: string | null;
  companySignedAt?: string | null;
  companySignatureData?: string | null;
  legalReviewedByUserId?: string | null;
  legalReviewedAt?: string | null;
  contractPdfUrl?: string | null;
  termsAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  deal?: {
    id: string;
    title?: string;
    name?: string;
    amount?: number;
    dealValue?: number;
    probability?: number;
    status?: string;
    account?: {
      id: string;
      name: string;
    };
  };
  account?: {
    id: string;
    name: string;
  };
  companySignatory?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  legalReviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface GenerateContractInput {
  dealId: string;
  quoteId?: string;
  accountId?: string;
  contractStartDate: string;
  contractEndDate: string;
  totalContractValue: number;
  monthlyRecurringRate?: number;
  securityDepositAmount?: number;
  breakdownResponseSlaHours?: 2 | 4 | 8;
  backupUnitCommitment?: boolean;
  insuranceResponsibility?: "CLIENT_COMPREHENSIVE" | "ENERGIA_COVER" | "JOINT";
  damageLiabilityTerms?: string;
  siteLocation?: string;
  equipmentSummary?: string;
}
