// Top-up configuration — single source of truth.
// To raise the minimum post-testing, change MIN_CUSTOM_AMOUNT here AND in
// supabase/functions/create-razorpay-order/index.ts.
export const TOPUP_CONFIG = {
  MIN_CUSTOM_AMOUNT: 10,      // ₹10 minimum — raise to 500+ post-testing
  MAX_CUSTOM_AMOUNT: 100000,  // ₹1L upper bound (Razorpay-safe)
  CUSTOM_CREDIT_RATIO: 1,     // 1 credit per ₹1 for custom (no bonus)
  CREDIT_COST: {
    DEEP_RESEARCH: 15,
    FULL_OFFER: 12,
    IDEA_SET: 5,
    COPY_SET: 8,
  },
};
