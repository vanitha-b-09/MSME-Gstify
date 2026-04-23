const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/;

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

const getString = (obj: Record<string, unknown>, key: string) => {
  const v = obj[key];
  return typeof v === "string" ? norm(v) : "";
};

const deepStringValues = (value: unknown, out: string[], depth: number) => {
  if (depth <= 0) return;

  if (typeof value === "string") {
    out.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const x of value) deepStringValues(x, out, depth - 1);
    return;
  }

  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepStringValues(v, out, depth - 1);
  }
};

export function extractGstin(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const obj = parsed as Record<string, unknown>;

  // Common shapes/keys from various parsers (notice/invoice/bill)
  const candidates = [
    "gstin",
    "GSTIN",
    "client_gstin",
    "clientGstin",
    "party_gstin",
    "partyGstin",
    "taxpayer_gstin",
    "taxpayerGstin",
    "supplier_gstin",
    "supplierGstin",
    "seller_gstin",
    "sellerGstin",
    "vendor_gstin",
    "vendorGstin",
    "recipient_gstin",
    "recipientGstin",
    "buyer_gstin",
    "buyerGstin",
  ];

  for (const k of candidates) {
    const v = getString(obj, k);
    if (v && GSTIN_REGEX.test(v)) return v;
  }

  // Fall back to scanning string values anywhere in the extracted JSON.
  const strings: string[] = [];
  deepStringValues(obj, strings, 8);

  for (const raw of strings) {
    const cleaned = raw ? raw.toUpperCase().replace(/[^0-9A-Z]/g, "") : "";
    const m = cleaned.match(GSTIN_REGEX);
    if (m?.[0]) return m[0];
  }

  return "";
}

