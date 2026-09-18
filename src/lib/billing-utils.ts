// Indian Currency Formatter & Number to Words Utility for Dharmi Thread & Jari ERP

export function formatINR(amount: number | string | null | undefined): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(amount: number | string | null | undefined, decimals = 2): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Convert numbers into Indian English Words (Lakh, Crore, Thousand, Hundred)
export function numberToWordsIndian(numInput: number | string): string {
  const num = typeof numInput === "number" ? numInput : parseFloat(String(numInput || "0"));
  if (isNaN(num) || num === 0) return "ZERO RUPEES ONLY";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];

  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o > 0 ? " " + ones[o] : "");
  }

  function convertThreeDigits(n: number): string {
    if (n === 0) return "";
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) {
      res += ones[h] + " HUNDRED";
      if (rem > 0) res += " ";
    }
    if (rem > 0) {
      res += convertTwoDigits(rem);
    }
    return res;
  }

  const rounded = Math.round(num);
  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundredPart = remainder;

  let words = "";

  if (crore > 0) {
    words += convertThreeDigits(crore) + " CRORE ";
  }
  if (lakh > 0) {
    words += convertThreeDigits(lakh) + " LAKH ";
  }
  if (thousand > 0) {
    words += convertThreeDigits(thousand) + " THOUSAND ";
  }
  if (hundredPart > 0) {
    words += convertThreeDigits(hundredPart) + " ";
  }

  words = words.trim().replace(/\s+/g, " ") + " RUPEES ONLY";
  return words;
}

export interface InvoiceItemCalculation {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export function calculateItemRow(
  quantity: number,
  rate: number,
  gstRatePercent: number,
  isInterstate: boolean
): InvoiceItemCalculation {
  const qty = Number(quantity) || 0;
  const rt = Number(rate) || 0;
  const gstRate = Number(gstRatePercent) || 0;

  const taxableAmount = Math.round(qty * rt * 100) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterstate) {
    igstAmount = Math.round((taxableAmount * gstRate) / 100 * 100) / 100;
  } else {
    const halfRate = gstRate / 2;
    cgstAmount = Math.round((taxableAmount * halfRate) / 100 * 100) / 100;
    sgstAmount = Math.round((taxableAmount * halfRate) / 100 * 100) / 100;
  }

  const totalAmount =
    taxableAmount + (isInterstate ? igstAmount : cgstAmount + sgstAmount);

  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
  };
}

export function deriveBackwardGstAmounts(
  finalAmount: number,
  gstRatePercent: number,
  isInterstate = false
) {
  const fa = Math.max(0, Number(finalAmount) || 0);
  const gstRate = Math.max(0, Number(gstRatePercent) || 0);
  if (gstRate === 0) {
    return {
      taxableAmount: fa,
      totalGst: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: fa,
    };
  }
  const totalGst = Math.round((fa * (gstRate / (100 + gstRate))) * 100) / 100;
  const taxableAmount = Math.round((fa - totalGst) * 100) / 100;
  if (isInterstate) {
    return {
      taxableAmount,
      totalGst,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalGst,
      totalAmount: fa,
    };
  } else {
    const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
    const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;
    return {
      taxableAmount,
      totalGst,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalAmount: fa,
    };
  }
}

export function calculateInvoiceSummary(
  items: Array<{
    quantity: number;
    rate: number;
    gstRate: number;
    finalAmount?: number;
  }>,
  isInterstate: boolean,
  roundOffMode: "nearest_1" | "nearest_5" | "nearest_10" | "none" = "nearest_1",
  discount: number = 0,
  customGrandTotal?: number | null
) {
  let totalQty = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let rawTotal = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const rt = Number(item.rate) || 0;
    const gstRate = Number(item.gstRate) || 0;

    if (item.finalAmount && Number(item.finalAmount) > 0 && gstRate > 0) {
      const bwd = deriveBackwardGstAmounts(Number(item.finalAmount), gstRate, isInterstate);
      totalQty += qty;
      totalTaxable += bwd.taxableAmount;
      totalCgst += bwd.cgstAmount;
      totalSgst += bwd.sgstAmount;
      totalIgst += bwd.igstAmount;
      rawTotal += bwd.totalAmount;
    } else {
      const calc = calculateItemRow(qty, rt, gstRate, isInterstate);
      totalQty += qty;
      totalTaxable += calc.taxableAmount;
      totalCgst += calc.cgstAmount;
      totalSgst += calc.sgstAmount;
      totalIgst += calc.igstAmount;
      rawTotal += calc.totalAmount;
    }
  });

  const disc = Math.max(0, Number(discount) || 0);
  rawTotal = Math.max(0, rawTotal - disc);

  let finalTotal = rawTotal;
  let roundOff = 0;

  if (customGrandTotal !== undefined && customGrandTotal !== null && !isNaN(Number(customGrandTotal))) {
    finalTotal = Math.max(0, Number(customGrandTotal));
    roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
  } else {
    if (roundOffMode === "nearest_1") {
      finalTotal = Math.round(rawTotal);
      roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
    } else if (roundOffMode === "nearest_5") {
      finalTotal = Math.round(rawTotal / 5) * 5;
      roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
    } else if (roundOffMode === "nearest_10") {
      finalTotal = Math.round(rawTotal / 10) * 10;
      roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
    }
  }

  const amountInWords = numberToWordsIndian(finalTotal);

  return {
    totalQty: Math.round(totalQty * 1000) / 1000,
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    discount: disc,
    roundOff,
    grandTotal: finalTotal,
    amountInWords,
  };
}

export function generateNextInvoiceNumber(
  lastInvoiceNo: string | undefined,
  prefix = "MTJ",
  financialYear = "2026-27"
): string {
  if (!lastInvoiceNo) {
    return `${prefix}/145`;
  }

  const matches = lastInvoiceNo.match(/(\d+)$/);
  if (matches && matches[1]) {
    const num = parseInt(matches[1], 10) + 1;
    const padLength = matches[1].length;
    const nextSeq = String(num).padStart(padLength, "0");
    const prefixPart = lastInvoiceNo.substring(0, matches.index);
    return `${prefixPart}${nextSeq}`;
  }

  return `${prefix}/146`;
}

export function buildWhatsAppInvoiceShareUrl(
  mobileNumber: string,
  invoice: {
    invoiceNo: string;
    customerName: string;
    date: string;
    grandTotal: number;
  },
  companyName = "DHARMI THREAD & JARI"
): string {
  const cleanMobile = (mobileNumber || "").replace(/\D/g, "");
  const formattedMobile = cleanMobile.startsWith("91")
    ? cleanMobile
    : cleanMobile.length === 10
    ? `91${cleanMobile}`
    : cleanMobile;

  const message =
    `*Tax Invoice from ${companyName}*\n\n` +
    `*Bill No:* ${invoice.invoiceNo}\n` +
    `*Date:* ${invoice.date}\n` +
    `*Customer:* ${invoice.customerName}\n` +
    `*Total Amount:* ${formatINR(invoice.grandTotal)}\n\n` +
    `Thank you for your business!\n` +
    `Mo: 99256 06480 | Surat, Gujarat`;

  return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`;
}

export { formatDate, formatDateTime } from "./utils";
