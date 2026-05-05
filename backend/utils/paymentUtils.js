/**
 * FILE: backend/utils/paymentUtils.js  [NEW]
 *
 * Centralised payment fee rules:
 *   Razorpay: 2% surcharge if amount < ₹1500, else no fee
 *   Paytm:    no surcharge
 */

const FEE_RULES = {
  razorpay: { threshold: 1500, feePercent: 2 },
  paytm:    { threshold: Infinity, feePercent: 0 },
};

/**
 * @param {number} baseAmount  - original booking amount (e.g. 599)
 * @param {'razorpay'|'paytm'} method
 * @param {'advance'|'full'} mode  - 'advance' = 20% only; 'full' = 100%
 * @returns {{ chargeableAmount, advanceAmount, remainingAmount, feeApplied, breakdown }}
 */
function calculateFinalAmount(baseAmount, method = "razorpay", mode = "advance") {
  const rule = FEE_RULES[method] || FEE_RULES.razorpay;

  // Advance = 20% of base
  const advanceBase = parseFloat((baseAmount * 0.2).toFixed(2));
  const fullBase    = baseAmount;

  const amountToCharge = mode === "full" ? fullBase : advanceBase;

  // Apply fee on the amount being charged
  const feeApplied = amountToCharge < rule.threshold
    ? parseFloat((amountToCharge * rule.feePercent / 100).toFixed(2))
    : 0;

  const chargeableAmount = parseFloat((amountToCharge + feeApplied).toFixed(2));

  return {
    totalAmount:      baseAmount,
    advanceAmount:    parseFloat(advanceBase.toFixed(2)),
    remainingAmount:  parseFloat((baseAmount - advanceBase).toFixed(2)),
    chargeableAmount, // what gateway will actually charge
    feeApplied,
    feePercent:       feeApplied > 0 ? rule.feePercent : 0,
    method,
    breakdown: {
      base:    amountToCharge,
      fee:     feeApplied,
      total:   chargeableAmount,
    },
  };
}

module.exports = { calculateFinalAmount };
