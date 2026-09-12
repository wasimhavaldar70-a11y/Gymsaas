export interface GstCalculationInput {
  amount: number; // Base price or Inclusive total
  taxRate: number; // e.g. 18 for 18%
  isInclusive: boolean;
  supplierStateCode: string; // e.g. "27" (Maharashtra)
  recipientStateCode?: string; // e.g. "27" (Intra-state) or "29" (Inter-state)
}

export interface GstCalculationResult {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  isIntraState: boolean;
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateGst(input: GstCalculationInput): GstCalculationResult {
  const { amount, taxRate, isInclusive, supplierStateCode, recipientStateCode } = input;
  
  // Default to intra-state if recipient state is not specified
  const isIntraState = !recipientStateCode || supplierStateCode === recipientStateCode;

  let taxableAmount: number;
  let totalTax: number;
  let totalAmount: number;

  if (isInclusive) {
    totalAmount = round2(amount);
    taxableAmount = round2(amount / (1 + taxRate / 100));
    totalTax = round2(totalAmount - taxableAmount);
  } else {
    taxableAmount = round2(amount);
    totalTax = round2(taxableAmount * (taxRate / 100));
    totalAmount = round2(taxableAmount + totalTax);
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (taxRate > 0) {
    if (isIntraState) {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmount = round2(totalTax / 2);
      sgstAmount = round2(totalTax - cgstAmount); // Avoid rounding loss
    } else {
      igstRate = taxRate;
      igstAmount = totalTax;
    }
  }

  return {
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    totalAmount,
    isIntraState
  };
}
