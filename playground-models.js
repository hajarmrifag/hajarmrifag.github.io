// Browser-only teaching models. These do not call or replace the deployed APIs.
// Claims rules: ClaimsController.UpdateClaimStatus + ClaimService.UpdateStatusAsync.
export const claimStatuses = [
  "Submitted",
  "UnderReview",
  "Approved",
  "Rejected",
  "Paid",
];
export function createClaim() {
  return { status: "Submitted", audit: [] };
}
export function updateClaim(state, role, next) {
  if (!["Manager", "Admin"].includes(role))
    return {
      state,
      code: 403,
      message: "An Adjuster cannot update status. The claim stays unchanged.",
    };
  if (!claimStatuses.includes(next))
    return {
      state,
      code: 400,
      message: "Unknown status. The claim stays unchanged.",
    };
  if (next === state.status)
    return {
      state,
      code: 200,
      message: "Already in this status. No duplicate audit event is added.",
    };
  return {
    state: {
      status: next,
      audit: [...state.audit, { from: state.status, to: next, role }],
    },
    code: 200,
    message: `${role} authorization passed. The status change is recorded.`,
  };
}

// Fixed sample accounts, using integer minor units like the transaction API.
// Database locks and concurrency are outside this single-browser model.
export function createBank() {
  return { source: 100000, destination: 25000, transfers: [] };
}
export function transfer(
  state,
  { key, amountMinor, failBeforeCommit = false },
) {
  if (!key || !Number.isSafeInteger(amountMinor) || amountMinor <= 0)
    return {
      state,
      code: 422,
      message: "A positive integer amount and request key are required.",
    };
  const previous = state.transfers.find((item) => item.key === key);
  if (previous) {
    if (previous.amountMinor !== amountMinor)
      return {
        state,
        code: 409,
        message:
          "This key belongs to a different transfer. No balances changed.",
      };
    return {
      state,
      code: 200,
      message:
        "Original result replayed. The money moved once, even though the request arrived twice.",
    };
  }
  if (amountMinor > state.source)
    return {
      state,
      code: 409,
      message: "Insufficient funds. Neither balance changed.",
    };
  if (failBeforeCommit)
    return {
      state,
      code: 503,
      message:
        "Injected failure before commit. Both balances remain unchanged.",
    };
  return {
    state: {
      source: state.source - amountMinor,
      destination: state.destination + amountMinor,
      transfers: [...state.transfers, { key, amountMinor }],
    },
    code: 201,
    message:
      "Both balance updates committed together. Retry this request to test idempotency.",
  };
}

// NVIDIA T4, CUDA 12.8, FP32; median of 20 CUDA-event runs.
// Source: cuda-transformer-kernels/results/gemm_t4.md.
export const gemmResults = Object.freeze({
  128: [207.721, 231.168, 233.64, 251.096],
  256: [327.68, 400.526, 645.675, 837.521],
  512: [376.644, 473.157, 872.722, 3030.567],
  1024: [385.648, 485.283, 1278.508, 5322.721],
});
export function compareGemm(size) {
  const values = gemmResults[size];
  if (!values) throw new RangeError("No recorded benchmark for this size.");
  return {
    values,
    speedup: values[2] / values[0],
    libraryPercent: (values[2] / values[3]) * 100,
  };
}
