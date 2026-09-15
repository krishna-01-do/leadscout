import { createHash, timingSafeEqual } from "crypto";

export interface CheckoutHashInput {
  key: string; salt: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; udf1?: string; udf2?: string; udf3?: string;
  udf4?: string; udf5?: string;
}

function sha512(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

export function createCheckoutHash(input: CheckoutHashInput) {
  return sha512([
    input.key, input.txnid, input.amount, input.productinfo, input.firstname, input.email,
    input.udf1 ?? "", input.udf2 ?? "", input.udf3 ?? "", input.udf4 ?? "", input.udf5 ?? "",
    "", "", "", "", "", input.salt,
  ].join("|"));
}

export function createResponseHash(salt: string, values: Record<string, string>) {
  const sequence = [
    salt, values.status ?? "", "", "", "", "", "", values.udf5 ?? "", values.udf4 ?? "",
    values.udf3 ?? "", values.udf2 ?? "", values.udf1 ?? "", values.email ?? "",
    values.firstname ?? "", values.productinfo ?? "", values.amount ?? "", values.txnid ?? "", values.key ?? "",
  ];
  if (values.additionalCharges) sequence.unshift(values.additionalCharges);
  return sha512(sequence.join("|"));
}

export function hashesMatch(expected: string, received: string) {
  if (!/^[a-f0-9]{128}$/i.test(expected) || !/^[a-f0-9]{128}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function createVerifyHash(key: string, txnid: string, salt: string) {
  return sha512(`${key}|verify_payment|${txnid}|${salt}`);
}
