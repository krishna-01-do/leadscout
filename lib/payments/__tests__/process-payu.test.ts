import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdmin: () => mocks }));
import { processPayUResponse, reconcilePayUPayment } from "../process-payu";
import { createResponseHash } from "../payu-hash";

const txnid = "LSregression123";
let payment: { id: string; txnid: string; status: string; amount: string };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("PAYU_MERCHANT_KEY", "test-key");
  vi.stubEnv("PAYU_MERCHANT_SALT", "test-salt");
  vi.stubEnv("PAYU_ENVIRONMENT", "test");
  payment = { id: "payment-id", txnid, status: "pending", amount: "2900.00" };
  mocks.rpc.mockReset().mockImplementation(async () => { payment.status = "success"; return { data: true, error: null }; });
  mocks.from.mockImplementation(() => {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), update: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.update.mockReturnValue(query);
    query.maybeSingle.mockImplementation(async () => ({ data: { ...payment }, error: null }));
    return query;
  });
  fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transaction_details: {
    [txnid]: { status: "success", amt: "2900.00", mihpayid: "12345678" },
  } })));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function callback() {
  const values = { key: "test-key", txnid, status: "success", amount: "2900.00", email: "test@example.com", firstname: "Test", productinfo: "Starter" };
  return { ...values, hash: createResponseHash("test-salt", values) };
}

describe("PayU callback and account reconciliation", () => {
  it("activates a plan using the actual Hosted Checkout amt response", async () => {
    expect(await processPayUResponse(callback())).toBe("success");
    expect(mocks.rpc).toHaveBeenCalledWith("complete_payu_payment", expect.objectContaining({ p_txnid: txnid, p_payu_payment_id: "12345678" }));
    expect(payment.status).toBe("success");
    expect(await processPayUResponse(callback())).toBe("complete");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("recovers an already-paid pending transaction from Account", async () => {
    expect(await reconcilePayUPayment(txnid, "owner-id")).toBe("success");
    expect(payment.status).toBe("success");
  });
  it("rejects an invalid signature before fetching or activating", async () => {
    expect(await processPayUResponse({ ...callback(), hash: "bad" })).toBe("invalid");
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not activate a mismatched amount", async () => {
    payment.amount = "5900.00";
    expect(await processPayUResponse(callback())).toBe("retry");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps pending provider states retryable instead of marking them failed", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ transaction_details: { [txnid]: { status: "pending", amt: "2900.00" } } })));
    const result = processPayUResponse(callback());
    await vi.runAllTimersAsync();
    expect(await result).toBe("retry"); expect(payment.status).toBe("pending");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not claim success if database activation fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Function missing" } });
    expect(await processPayUResponse(callback())).toBe("retry");
    expect(payment.status).toBe("pending");
  });
});
