export interface PowerEquipmentItem {
  id: string;
  name: string;
  category: "generator" | "transformer" | "fuel_tank" | "load_bank" | "cable" | "distribution";
  kvaRating?: number;
  voltage?: string;
  phase?: string;
  frequencyHz?: number;
  fuelConsumptionLph?: number;
  tankCapacityLiters?: number;
  dailyRate: number;
  weeklyMultiplier: number;
  monthlyMultiplier: number;
  minimumHireDays: number;
  defaultMobFee: number;
  defaultDemobFee: number;
  specSummary: string;
}

export interface RentalCalculationInput {
  equipmentId: string;
  quantity?: number;
  durationType: "day" | "week" | "month";
  durationValue: number;
  startDate?: string;
  endDate?: string;
  includeMobDemob?: boolean;
  customMobFee?: number;
  customDemobFee?: number;
  cableMeters?: number;
  cableRatePerMeterWeek?: number;
  fuelTankId?: string;
  operatorRequirement?: "none" | "single_shift" | "double_shift_24h";
  operatorDayRate?: number;
  discountPercent?: number;
  taxPercent?: number;
}

export interface RentalCalculationBreakdown {
  equipment: PowerEquipmentItem;
  quantity: number;
  effectiveDays: number;
  hirePeriodDescription: string;
  minimumHireSatisfied: boolean;
  minimumHireWarning?: string;
  baseDailyRate: number;
  appliedUnitRate: number;
  rentalDurationSubtotal: number;
  mobFee: number;
  demobFee: number;
  totalLogistics: number;
  cableCost: number;
  fuelTankCost: number;
  operatorCost: number;
  grossSubtotal: number;
  discountAmount: number;
  netBeforeTax: number;
  taxAmount: number;
  finalTotalAmount: number;
  estimatedFuelUsageDailyLiters: number;
}

