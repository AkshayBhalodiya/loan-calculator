export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ParsedReceipt {
  date: string | null;
  total: number | null;
  lineItems: ReceiptLineItem[];
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "").trim();
}

function parseAmount(raw: string) {
  const cleaned = raw
    .replace(/[^0-9.,-]/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d)/g, "")
    .trim();

  if (!cleaned) return null;

  const normalized = cleaned.replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDescription(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+$/, "")
    .trim();
}

function tryParseDate(line: string) {
  const match = line.match(/\b(?:date|receipt date|transaction date)\b[^\d]*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (match?.[1]) return match[1];

  const fallback = line.match(/\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  return fallback?.[1] ?? null;
}

function tryParseTotal(line: string) {
  const match = line.match(/\b(?:total|amount due|grand total|balance due|payable)\b[^0-9-]*([-+]?\d[0-9.,]*)/i);
  if (match?.[1]) return parseAmount(match[1]);

  const hasTotalMarker = /\b(?:total|subtotal|amount due|grand total|balance due|payable)\b/i.test(line);
  if (!hasTotalMarker) return null;

  const fallback = line.match(/([-+]?\d[0-9.,]*)/);
  if (!fallback?.[1]) return null;
  return parseAmount(fallback[1]);
}

function tryParseLineItem(line: string): ReceiptLineItem | null {
  const patterns = [
    /^(?<description>.+?)\s+(?<quantity>\d+(?:\.\d+)?)\s*(?:x|×|@)\s*(?<unitPrice>\d+(?:\.\d+)?)$/i,
    /^(?<description>.+?)\s+(?<quantity>\d+(?:\.\d+)?)\s+(?<unitPrice>\d+(?:\.\d+)?)$/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) continue;

    const description = normalizeDescription(match.groups.description);
    const quantity = Number.parseFloat(match.groups.quantity);
    const unitPrice = Number.parseFloat(match.groups.unitPrice);

    if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) continue;
    if (description.toLowerCase().includes("total") || description.toLowerCase().includes("subtotal")) continue;
    if (quantity <= 0 || unitPrice <= 0) continue;

    return {
      description,
      quantity,
      unitPrice,
    };
  }

  return null;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const normalized = normalizeText(text);
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let date: string | null = null;
  let total: number | null = null;
  const lineItems: ReceiptLineItem[] = [];

  for (const line of lines) {
    if (!date) {
      const parsedDate = tryParseDate(line);
      if (parsedDate) date = parsedDate;
    }

    if (total === null) {
      const parsedTotal = tryParseTotal(line);
      if (parsedTotal !== null) total = parsedTotal;
    }

    const parsedLineItem = tryParseLineItem(line);
    if (parsedLineItem) lineItems.push(parsedLineItem);
  }

  return { date, total, lineItems };
}
