// ============================================
// ORDER STATE MACHINE
// ============================================

/**
 * Valid order statuses
 */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'FAILED';

/**
 * Allowed state transitions for orders
 * Key = current status, Value = array of allowed next statuses
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // PENDING can transition to:
  PENDING: ['PAID', 'CANCELLED', 'FAILED'],

  // PAID can transition to:
  PAID: ['PROCESSING', 'REFUNDED', 'DISPUTED'],

  // PROCESSING can transition to:
  PROCESSING: ['SHIPPED', 'CANCELLED', 'DISPUTED'],

  // SHIPPED can transition to:
  SHIPPED: ['DELIVERED', 'DISPUTED'],

  // DELIVERED can transition to:
  DELIVERED: ['COMPLETED', 'DISPUTED'],

  // COMPLETED is final state (but disputes can be opened)
  COMPLETED: ['DISPUTED'],

  // CANCELLED is final state
  CANCELLED: [],

  // REFUNDED is final state
  REFUNDED: [],

  // DISPUTED can be resolved back to various states
  DISPUTED: ['PROCESSING', 'REFUNDED', 'COMPLETED'],

  // FAILED is final state
  FAILED: []
};

/**
 * Check if a state transition is valid
 * @param currentStatus Current order status
 * @param newStatus Desired new status
 * @returns true if transition is allowed, false otherwise
 */
export function canTransitionOrder(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowedTransitions = ORDER_TRANSITIONS[currentStatus as OrderStatus];
  
  if (!allowedTransitions) {
    console.error(`Invalid current status: ${currentStatus}`);
    return false;
  }

  return allowedTransitions.includes(newStatus as OrderStatus);
}

/**
 * Validate and return error message if transition is invalid
 * @param currentStatus Current order status
 * @param newStatus Desired new status
 * @returns null if valid, error message if invalid
 */
export function validateOrderTransition(
  currentStatus: string,
  newStatus: string
): string | null {
  if (currentStatus === newStatus) {
    return `Order is already in ${currentStatus} status`;
  }

  if (!canTransitionOrder(currentStatus, newStatus)) {
    const allowed = ORDER_TRANSITIONS[currentStatus as OrderStatus] || [];
    return `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`;
  }

  return null;
}

/**
 * Get all allowed next statuses for current status
 * @param currentStatus Current order status
 * @returns Array of allowed next statuses
 */
export function getAllowedTransitions(currentStatus: string): OrderStatus[] {
  return ORDER_TRANSITIONS[currentStatus as OrderStatus] || [];
}

/**
 * Check if a status is a final state (no further transitions)
 * @param status Order status to check
 * @returns true if final state, false otherwise
 */
export function isFinalStatus(status: string): boolean {
  const transitions = ORDER_TRANSITIONS[status as OrderStatus];
  return transitions ? transitions.length === 0 : false;
}

// ============================================
// SELLER STATUS STATE MACHINE
// ============================================

export type SellerStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BANNED';

const SELLER_TRANSITIONS: Record<SellerStatus, SellerStatus[]> = {
  // PENDING can be approved or rejected by admin
  PENDING: ['APPROVED', 'REJECTED'],

  // APPROVED seller can be suspended or banned
  APPROVED: ['SUSPENDED', 'BANNED'],

  // REJECTED can re-apply (transitions back to PENDING via new application)
  REJECTED: [],

  // SUSPENDED can be reinstated or permanently banned
  SUSPENDED: ['APPROVED', 'BANNED'],

  // BANNED is permanent (final state)
  BANNED: []
};

/**
 * Check if a seller status transition is valid
 */
export function canTransitionSeller(
  currentStatus: string | null,
  newStatus: string
): boolean {
  // New seller application (no current status)
  if (!currentStatus) {
    return newStatus === 'PENDING';
  }

  const allowedTransitions = SELLER_TRANSITIONS[currentStatus as SellerStatus];
  
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.includes(newStatus as SellerStatus);
}

/**
 * Validate seller status transition
 */
export function validateSellerTransition(
  currentStatus: string | null,
  newStatus: string
): string | null {
  if (currentStatus === newStatus) {
    return `Seller is already ${currentStatus}`;
  }

  if (!canTransitionSeller(currentStatus, newStatus)) {
    const allowed = currentStatus
      ? SELLER_TRANSITIONS[currentStatus as SellerStatus] || []
      : ['PENDING'];
    return `Cannot transition from ${currentStatus || 'null'} to ${newStatus}. Allowed: ${allowed.join(', ')}`;
  }

  return null;
}
