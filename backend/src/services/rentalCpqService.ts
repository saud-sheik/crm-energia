import { sequelize } from "@nexus-crm/database";
import { Quote, QuoteLineItem, Deal, Account, Contact, Lead } from "@nexus-crm/database";

export interface PowerEquipmentItem {
  id: string;
  name: string;
  category: "generator" | "transformer" | "fuel_tank" | "load_bank" | "cable" | "distribution";
  kvaRating?: number;
  voltage?: string;
  phase?: string;
  frequencyHz?: number;
  fuelConsumptionLph?: number; // Liters per hour at 75% load
  tankCapacityLiters?: number;
  dailyRate: number;
  weeklyMultiplier: number;  // Default: 5.0 (5 days billed for 7 days hire)
  monthlyMultiplier: number; // Default: 20.0 (20 days billed for 30 days hire)
  minimumHireDays: number;
  defaultMobFee: number;
  defaultDemobFee: number;
  specSummary: string;
}

export const POWER_EQUIPMENT_CATALOG: PowerEquipmentItem[] = [
  {
    id: "gen-60kva",
    name: "60 kVA Silent Diesel Generator",
    category: "generator",
    kvaRating: 60,
    voltage: "400V / 230V",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 12.5,
    dailyRate: 350,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 3,
    defaultMobFee: 500,
    defaultDemobFee: 500,
    specSummary: "60 kVA Prime / 66 kVA Standby, Perkins/Cummins, Soundproof canopy (65 dBA @ 7m), Internal bunded fuel tank"
  },
  {
    id: "gen-100kva",
    name: "100 kVA Heavy Duty Generator",
    category: "generator",
    kvaRating: 100,
    voltage: "400V / 230V",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 21.0,
    dailyRate: 500,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 3,
    defaultMobFee: 650,
    defaultDemobFee: 650,
    specSummary: "100 kVA Prime, Cummins 6BT, Deep Sea DSE7320 digital controller, 24-hr onboard tank"
  },
  {
    id: "gen-250kva",
    name: "250 kVA Industrial Generator",
    category: "generator",
    kvaRating: 250,
    voltage: "400V / 230V",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 48.0,
    dailyRate: 850,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 5,
    defaultMobFee: 950,
    defaultDemobFee: 950,
    specSummary: "250 kVA Prime, Volvo Penta TAD734GE engine, Synchronizing ready, Skid mounted with forklift pockets"
  },
  {
    id: "gen-500kva",
    name: "500 kVA Grid-Spec Generator",
    category: "generator",
    kvaRating: 500,
    voltage: "400V / 230V",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 92.0,
    dailyRate: 1450,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 7,
    defaultMobFee: 1400,
    defaultDemobFee: 1400,
    specSummary: "500 kVA Prime, CAT C15 / Cummins QSX15, Containerized acoustic enclosure, Auto-mains failure (AMF)"
  },
  {
    id: "gen-1000kva",
    name: "1000 kVA Mega-Power Generator Container",
    category: "generator",
    kvaRating: 1000,
    voltage: "400V / 230V (Optional Step-Up)",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 185.0,
    dailyRate: 2600,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 14,
    defaultMobFee: 2500,
    defaultDemobFee: 2500,
    specSummary: "1000 kVA / 800 kWe Prime, 20ft ISO container, Heavy duty radiator rated 50°C ambient, Dual frequency switchable (50/60Hz)"
  },
  {
    id: "gen-1250kva",
    name: "1250 kVA High-Output Power Module",
    category: "generator",
    kvaRating: 1250,
    voltage: "400V / 230V",
    phase: "3-Phase",
    frequencyHz: 50,
    fuelConsumptionLph: 230.0,
    dailyRate: 3100,
    weeklyMultiplier: 5,
    monthlyMultiplier: 20,
    minimumHireDays: 14,
    defaultMobFee: 3000,
    defaultDemobFee: 3000,
    specSummary: "1250 kVA Prime, Cummins QSK50, ComAp InteliGen paralleling controller, 3000A motorized ABB breaker"
  },
  {
    id: "tank-2500l",
    name: "2,500L External Bunded Fuel Tank",
    category: "fuel_tank",
    tankCapacityLiters: 2500,
    dailyRate: 90,
    weeklyMultiplier: 5,
    monthlyMultiplier: 18,
    minimumHireDays: 3,
    defaultMobFee: 200,
    defaultDemobFee: 200,
    specSummary: "Double-walled steel fuel tank, UN/ADR certified, Quick-release fuel connection hoses included"
  },
  {
    id: "tank-5000l",
    name: "5,000L External Bulk Fuel Tank",
    category: "fuel_tank",
    tankCapacityLiters: 5000,
    dailyRate: 150,
    weeklyMultiplier: 5,
    monthlyMultiplier: 18,
    minimumHireDays: 7,
    defaultMobFee: 350,
    defaultDemobFee: 350,
    specSummary: "5,000L Double-walled ISO tank, 110% bund capacity, Mechanical fuel level gauge & visual leak detection"
  }
];

export interface RentalCalculationInput {
  equipmentId: string;
  quantity?: number;
  durationType: "day" | "week" | "month";
  durationValue: number; // e.g. 10 days, 3 weeks, 2 months
  startDate?: string;
  endDate?: string;
  includeMobDemob?: boolean;
  customMobFee?: number;
  customDemobFee?: number;
  cableMeters?: number;
  cableRatePerMeterWeek?: number; // Default: 4.5
  fuelTankId?: string;
  operatorRequirement?: "none" | "single_shift" | "double_shift_24h";
  operatorDayRate?: number; // Default: 250 for single shift, 450 for 24h
  discountPercent?: number;
  taxPercent?: number; // Default: 15%
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

export class RentalCpqService {
  /**
   * Return the entire standard power equipment rental catalog
   */
  public static getCatalog(): PowerEquipmentItem[] {
    return POWER_EQUIPMENT_CATALOG;
  }

  /**
   * Find an equipment item by its ID
   */
  public static findEquipment(equipmentId: string): PowerEquipmentItem | undefined {
    return POWER_EQUIPMENT_CATALOG.find((item) => item.id === equipmentId);
  }

  /**
   * Calculate effective duration in days and rate multiplier
   */
  public static computeDurationDays(type: "day" | "week" | "month", value: number): number {
    const safeValue = Math.max(1, Number(value) || 1);
    switch (type) {
      case "day":
        return safeValue;
      case "week":
        return safeValue * 7;
      case "month":
        return safeValue * 30;
      default:
        return safeValue;
    }
  }

  /**
   * Compute comprehensive equipment rental pricing
   */
  public static calculateRentalQuote(input: RentalCalculationInput): RentalCalculationBreakdown {
    const equipment = this.findEquipment(input.equipmentId) || POWER_EQUIPMENT_CATALOG[0];
    const qty = Math.max(1, Number(input.quantity) || 1);
    const durationValue = Math.max(1, Number(input.durationValue) || 1);
    const durationType = input.durationType || "day";
    const effectiveDays = this.computeDurationDays(durationType, durationValue);

    // Minimum hire period check
    const minimumHireSatisfied = effectiveDays >= equipment.minimumHireDays;
    const minimumHireWarning = !minimumHireSatisfied
      ? `Requested hire duration (${effectiveDays} days) is less than the mandatory minimum hire period (${equipment.minimumHireDays} days) for ${equipment.name}. Standard minimum billing will apply.`
      : undefined;

    // Rate calculation using Day / Week / Month multipliers
    let appliedUnitRate = 0;
    let rentalDurationSubtotal = 0;

    if (durationType === "day") {
      appliedUnitRate = equipment.dailyRate;
      // If below minimum hire days, bill minimum hire days
      const billableDays = Math.max(effectiveDays, equipment.minimumHireDays);
      rentalDurationSubtotal = billableDays * equipment.dailyRate * qty;
    } else if (durationType === "week") {
      // 1 Week = 5x Daily Rate
      appliedUnitRate = equipment.dailyRate * equipment.weeklyMultiplier;
      rentalDurationSubtotal = durationValue * appliedUnitRate * qty;
    } else if (durationType === "month") {
      // 1 Month = 20x Daily Rate
      appliedUnitRate = equipment.dailyRate * equipment.monthlyMultiplier;
      rentalDurationSubtotal = durationValue * appliedUnitRate * qty;
    }

    // Mobilisation & Demobilisation
    let mobFee = 0;
    let demobFee = 0;
    if (input.includeMobDemob !== false) {
      mobFee = input.customMobFee !== undefined ? Number(input.customMobFee) : equipment.defaultMobFee * qty;
      demobFee = input.customDemobFee !== undefined ? Number(input.customDemobFee) : equipment.defaultDemobFee * qty;
    }
    const totalLogistics = mobFee + demobFee;

    // Cable hire cost (per meter per week)
    let cableCost = 0;
    const cableMeters = Number(input.cableMeters) || 0;
    if (cableMeters > 0) {
      const cableRatePerMeterWeek = input.cableRatePerMeterWeek !== undefined ? Number(input.cableRatePerMeterWeek) : 4.5;
      const weeksCount = Math.max(1, Math.ceil(effectiveDays / 7));
      cableCost = cableMeters * cableRatePerMeterWeek * weeksCount;
    }

    // Auxiliary Fuel Tank hire
    let fuelTankCost = 0;
    if (input.fuelTankId) {
      const fuelTank = this.findEquipment(input.fuelTankId);
      if (fuelTank) {
        if (durationType === "day") {
          fuelTankCost = Math.max(effectiveDays, fuelTank.minimumHireDays) * fuelTank.dailyRate;
        } else if (durationType === "week") {
          fuelTankCost = durationValue * (fuelTank.dailyRate * fuelTank.weeklyMultiplier);
        } else {
          fuelTankCost = durationValue * (fuelTank.dailyRate * fuelTank.monthlyMultiplier);
        }
      }
    }

    // Certified Operator cost
    let operatorCost = 0;
    const operatorReq = input.operatorRequirement || "none";
    if (operatorReq !== "none") {
      const defaultDailyRate = operatorReq === "double_shift_24h" ? 450 : 250;
      const operatorDailyRate = input.operatorDayRate !== undefined ? Number(input.operatorDayRate) : defaultDailyRate;
      operatorCost = operatorDailyRate * effectiveDays;
    }

    // Gross Subtotal
    const grossSubtotal = parseFloat((rentalDurationSubtotal + totalLogistics + cableCost + fuelTankCost + operatorCost).toFixed(2));

    // Discounts
    const discountPct = Math.min(100, Math.max(0, Number(input.discountPercent) || 0));
    const discountAmount = parseFloat(((grossSubtotal * discountPct) / 100).toFixed(2));
    const netBeforeTax = parseFloat((grossSubtotal - discountAmount).toFixed(2));

    // Tax (VAT 15% standard in regional operations or custom)
    const taxPct = input.taxPercent !== undefined ? Number(input.taxPercent) : 15;
    const taxAmount = parseFloat(((netBeforeTax * taxPct) / 100).toFixed(2));
    const finalTotalAmount = parseFloat((netBeforeTax + taxAmount).toFixed(2));

    // Fuel consumption estimate (liters per day assuming 12-hour duty cycle at 75% load)
    const estimatedFuelUsageDailyLiters = (equipment.fuelConsumptionLph || 0) * 12 * qty;

    const periodLabel = `${durationValue} ${durationType}${durationValue > 1 ? "s" : ""} (${effectiveDays} calendar days)`;

    return {
      equipment,
      quantity: qty,
      effectiveDays,
      hirePeriodDescription: periodLabel,
      minimumHireSatisfied,
      minimumHireWarning,
      baseDailyRate: equipment.dailyRate,
      appliedUnitRate,
      rentalDurationSubtotal,
      mobFee,
      demobFee,
      totalLogistics,
      cableCost,
      fuelTankCost,
      operatorCost,
      grossSubtotal,
      discountAmount,
      netBeforeTax,
      taxAmount,
      finalTotalAmount,
      estimatedFuelUsageDailyLiters
    };
  }

  /**
   * Persist a full Equipment Rental Quote into the core database models (Quote & QuoteLineItem)
   */
  public static async createRentalQuote(params: {
    dealId: string;
    calculationInput: RentalCalculationInput;
    notes?: string;
    siteLocation?: string;
    quoteNumberPrefix?: string;
    userId?: string;
  }) {
    const breakdown = this.calculateRentalQuote(params.calculationInput);
    const quoteNumber = `${params.quoteNumberPrefix || "EN-QT"}-${Date.now().toString().slice(-6)}`;

    const transaction = await sequelize.transaction();

    try {
      // Create Core Quote Record
      const quote = await Quote.create(
        {
          dealId: params.dealId,
          status: "Draft",
          totalAmount: breakdown.finalTotalAmount,
          quoteNumber,
          version: 1,
          isFinalAgreed: false,
          expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14-day validity
        },
        { transaction }
      );

      const lineItemsToCreate: any[] = [];

      // 1. Primary Equipment Line Item
      lineItemsToCreate.push({
        quoteId: quote.id,
        quantity: breakdown.quantity,
        unitPrice: breakdown.appliedUnitRate,
        discount: params.calculationInput.discountPercent || 0,
        tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
        totalPrice: breakdown.rentalDurationSubtotal,
        totalAmount: breakdown.rentalDurationSubtotal,
        isOptional: false,
        isCustom: true,
        customDescription: `${breakdown.equipment.name} [${breakdown.equipment.kvaRating ? breakdown.equipment.kvaRating + " kVA" : "Auxiliary"}]\n` +
          `Hire Duration: ${breakdown.hirePeriodDescription}\n` +
          `Specs: ${breakdown.equipment.specSummary}\n` +
          `Rate Structure: ${params.calculationInput.durationType.toUpperCase()} rate (Base Daily: ${breakdown.baseDailyRate} SAR/day)`,
        description: breakdown.equipment.name,
        sortOrder: 1
      });

      // 2. Mobilisation Charge
      if (breakdown.mobFee > 0) {
        lineItemsToCreate.push({
          quoteId: quote.id,
          quantity: 1,
          unitPrice: breakdown.mobFee,
          discount: 0,
          tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
          totalPrice: breakdown.mobFee,
          totalAmount: breakdown.mobFee,
          isOptional: false,
          isCustom: true,
          customDescription: `Mobilisation Charge: Delivery, offloading, positioning, and site rigging at ${params.siteLocation || "client designated operational site"}.`,
          description: "Mobilisation & Heavy Haulage",
          sortOrder: 2
        });
      }

      // 3. Demobilisation Charge
      if (breakdown.demobFee > 0) {
        lineItemsToCreate.push({
          quoteId: quote.id,
          quantity: 1,
          unitPrice: breakdown.demobFee,
          discount: 0,
          tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
          totalPrice: breakdown.demobFee,
          totalAmount: breakdown.demobFee,
          isOptional: false,
          isCustom: true,
          customDescription: `Demobilisation Charge: Disconnection, return crane loading, and haulage back to Energia equipment yard.`,
          description: "Demobilisation & Site Clearance",
          sortOrder: 3
        });
      }

      // 4. Auxiliary Power Cables (if selected)
      if (breakdown.cableCost > 0) {
        lineItemsToCreate.push({
          quoteId: quote.id,
          quantity: Number(params.calculationInput.cableMeters) || 1,
          unitPrice: parseFloat((breakdown.cableCost / (Number(params.calculationInput.cableMeters) || 1)).toFixed(2)),
          discount: 0,
          tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
          totalPrice: breakdown.cableCost,
          totalAmount: breakdown.cableCost,
          isOptional: false,
          isCustom: true,
          customDescription: `Heavy Duty 4-Core Copper Power Cable Runs (${params.calculationInput.cableMeters} meters) for duration of hire.`,
          description: "Auxiliary Cable Hire",
          sortOrder: 4
        });
      }

      // 5. External Fuel Tank (if selected)
      if (breakdown.fuelTankCost > 0 && params.calculationInput.fuelTankId) {
        const tank = this.findEquipment(params.calculationInput.fuelTankId);
        lineItemsToCreate.push({
          quoteId: quote.id,
          quantity: 1,
          unitPrice: breakdown.fuelTankCost,
          discount: 0,
          tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
          totalPrice: breakdown.fuelTankCost,
          totalAmount: breakdown.fuelTankCost,
          isOptional: false,
          isCustom: true,
          customDescription: `${tank?.name || "External Fuel Tank"} with bunded double-wall containment & fuel lines.`,
          description: tank?.name || "External Fuel Tank Hire",
          sortOrder: 5
        });
      }

      // 6. Certified Operator Attendance (if selected)
      if (breakdown.operatorCost > 0) {
        const shiftLabel = params.calculationInput.operatorRequirement === "double_shift_24h" ? "24/7 Continuous (2-Shift)" : "Single Shift (8-hr)";
        lineItemsToCreate.push({
          quoteId: quote.id,
          quantity: breakdown.effectiveDays,
          unitPrice: parseFloat((breakdown.operatorCost / breakdown.effectiveDays).toFixed(2)),
          discount: 0,
          tax: params.calculationInput.taxPercent !== undefined ? params.calculationInput.taxPercent : 15,
          totalPrice: breakdown.operatorCost,
          totalAmount: breakdown.operatorCost,
          isOptional: false,
          isCustom: true,
          customDescription: `Certified Generator Technician / Operator Attendance: ${shiftLabel} coverage across ${breakdown.effectiveDays} days.`,
          description: "Certified Operator Attendance",
          sortOrder: 6
        });
      }

      // Bulk insert line items
      await QuoteLineItem.bulkCreate(lineItemsToCreate, { transaction });

      await transaction.commit();

      return {
        success: true,
        quoteId: quote.id,
        quoteNumber,
        breakdown
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

