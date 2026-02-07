/**
 * Commission calculation utilities for marketplace
 * 
 * Formula:
 * totalAmount = productPrice
 * stripeFee = totalAmount * 0.029 + 30 (kopecks)
 * afterStripeFee = totalAmount - stripeFee
 * platformFee = afterStripeFee * commission
 * sellerAmount = afterStripeFee - platformFee
 */

export interface CommissionBreakdown {
  totalAmount: number;        // Total price in kopecks
  stripeFee: number;          // Stripe fee (2.9% + 30₽)
  afterStripeFee: number;     // Amount after Stripe fee
  platformFee: number;        // Platform commission
  sellerAmount: number;       // Amount for seller
  commissionRate: number;     // Commission rate (0.15 = 15%)
}

/**
 * Calculate commission breakdown
 * @param totalAmount - Total price in kopecks
 * @param commissionRate - Commission rate (0.15 = 15%)
 * @returns Commission breakdown
 */
export function calculateCommission(
  totalAmount: number,
  commissionRate: number = 0.15
): CommissionBreakdown {
  // Validate inputs
  if (totalAmount < 0) {
    throw new Error('Total amount cannot be negative');
  }
  if (commissionRate < 0 || commissionRate > 1) {
    throw new Error('Commission rate must be between 0 and 1');
  }

  // ❗ Stripe fee: 2.9% + 30 kopecks
  const stripeFee = Math.round(totalAmount * 0.029 + 30);
  
  // Amount after Stripe fee
  const afterStripeFee = totalAmount - stripeFee;
  
  // ❗ Platform commission
  const platformFee = Math.round(afterStripeFee * commissionRate);
  
  // ❗ Seller amount
  const sellerAmount = afterStripeFee - platformFee;

  return {
    totalAmount,
    stripeFee,
    afterStripeFee,
    platformFee,
    sellerAmount,
    commissionRate
  };
}

/**
 * Validate commission breakdown (sanity check)
 */
export function validateCommissionBreakdown(breakdown: CommissionBreakdown): boolean {
  const { totalAmount, stripeFee, platformFee, sellerAmount } = breakdown;
  
  // Check that sum equals total
  const sum = stripeFee + platformFee + sellerAmount;
  const diff = Math.abs(sum - totalAmount);
  
  // Allow 1 kopeck difference due to rounding
  if (diff > 1) {
    console.error('Commission breakdown validation failed:', {
      totalAmount,
      sum,
      diff,
      breakdown
    });
    return false;
  }

  // Check non-negative values
  if (stripeFee < 0 || platformFee < 0 || sellerAmount < 0) {
    console.error('Commission breakdown has negative values:', breakdown);
    return false;
  }

  return true;
}

/**
 * Format amount in kopecks to rubles string
 */
export function formatAmount(kopecks: number): string {
  return `${(kopecks / 100).toFixed(2)} ₽`;
}

/**
 * Get commission breakdown as human-readable summary
 */
export function getCommissionSummary(breakdown: CommissionBreakdown): string {
  return `
Total: ${formatAmount(breakdown.totalAmount)}
Stripe Fee: ${formatAmount(breakdown.stripeFee)}
Platform Fee (${(breakdown.commissionRate * 100).toFixed(0)}%): ${formatAmount(breakdown.platformFee)}
Seller Amount: ${formatAmount(breakdown.sellerAmount)}
  `.trim();
}
