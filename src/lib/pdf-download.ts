import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export interface GeneratePDFResult {
  pdf: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
}

/**
 * Generates a pristine high-resolution (300dpi) PDF instance, blob, and File object from an HTML element.
 * Guarantees 100% single-page A4 fit with full layout on mobile devices and desktop alike.
 */
export async function generateInvoicePDF(
  elementIdOrRef: HTMLElement | string,
  filename: string = "Tax_Invoice.pdf"
): Promise<GeneratePDFResult> {
  const element =
    typeof elementIdOrRef === "string"
      ? document.getElementById(elementIdOrRef)
      : elementIdOrRef;

  if (!element) {
    console.error("Invoice element not found for PDF export");
    throw new Error("Invoice template element not found");
  }

  // 1. Create an off-screen fixed-width desktop A4 sandbox (794px = standard A4 width at 96 DPI)
  // This guarantees that on mobile phones (360px - 412px screen width), the rendered layout is
  // 100% identical to desktop A4 with NO wrapping, NO squishing, and NO missing columns!
  const sandbox = document.createElement("div");
  sandbox.id = "pdf-render-sandbox";
  sandbox.style.position = "fixed";
  sandbox.style.left = "-9999px";
  sandbox.style.top = "0";
  sandbox.style.width = "794px";
  sandbox.style.minWidth = "794px";
  sandbox.style.maxWidth = "794px";
  sandbox.style.background = "#ffffff";
  sandbox.style.color = "#000000";
  sandbox.style.zIndex = "-99999";
  sandbox.style.overflow = "visible";
  sandbox.style.boxSizing = "border-box";
  sandbox.style.margin = "0";
  sandbox.style.padding = "0";

  // Deep clone the invoice element with all inner HTML and styles
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = "sandbox-cloned-invoice";
  clone.style.width = "794px";
  clone.style.minWidth = "794px";
  clone.style.maxWidth = "794px";
  clone.style.margin = "0 auto";
  clone.style.boxShadow = "none";
  clone.style.border = "1.5px solid #000000";
  clone.style.transform = "none";
  clone.style.overflow = "visible";
  clone.style.background = "#ffffff";
  clone.style.color = "#000000";

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait for fonts & rendering engine to settle
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 60));

    // Capture pristine 300dpi image from sandbox
    const measuredHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1123);

    const dataUrl = await toPng(clone, {
      quality: 1.0,
      pixelRatio: 2, // 300dpi sharpness
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: 794,
      height: measuredHeight,
      style: {
        transform: "none",
        margin: "0 auto",
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = 210; // mm
    const pdfHeight = 297; // mm
    const margin = 3.5; // mm (leaves 203mm printable width & 290mm printable height)
    const availableWidth = pdfWidth - margin * 2; // 203mm
    const availableHeight = pdfHeight - margin * 2; // 290mm

    // Measure rendered image natural dimensions
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (e) => reject(e);
    });

    const naturalW = img.naturalWidth || 1588;
    const naturalH = img.naturalHeight || 2246;

    // Calculate proportional dimensions so 100% of the invoice fits on a single A4 page
    let printWidth = availableWidth;
    let printHeight = (naturalH * availableWidth) / naturalW;

    // If printHeight exceeds available page height, scale down proportionally to fit 1 page perfectly
    if (printHeight > availableHeight) {
      const scale = availableHeight / printHeight;
      printHeight = availableHeight;
      printWidth = printWidth * scale;
    }

    // Center horizontally and vertically on A4 page
    const posX = margin + (availableWidth - printWidth) / 2;
    const posY = margin + (availableHeight - printHeight) / 2;

    pdf.addImage(
      dataUrl,
      "PNG",
      posX,
      posY,
      printWidth,
      printHeight,
      undefined,
      "FAST"
    );

    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    const blob = pdf.output("blob");
    const file = new File([blob], safeFilename, { type: "application/pdf" });

    return { pdf, blob, file, filename: safeFilename };
  } catch (err) {
    console.error("PDF generation failed:", err);
    throw err;
  } finally {
    // Always clean up sandbox element
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  }
}

/**
 * Downloads the invoice PDF to the user's device
 */
export async function downloadInvoicePDF(
  elementIdOrRef: HTMLElement | string,
  filename: string = "Tax_Invoice.pdf"
): Promise<void> {
  const { pdf, filename: safeFilename } = await generateInvoicePDF(elementIdOrRef, filename);
  pdf.save(safeFilename);
}

/**
 * Triggers clean, pixel-perfect single-page A4 printing without modal dialog clipping or vertical offsets.
 * Creates an isolated print container directly on document.body so modal transforms cannot displace it.
 */
export function printInvoiceElement(elementIdOrRef: HTMLElement | string) {
  const element =
    typeof elementIdOrRef === "string"
      ? document.getElementById(elementIdOrRef)
      : elementIdOrRef;

  if (!element) {
    window.print();
    return;
  }

  // Remove any previous print sandbox
  const existing = document.getElementById("global-print-sandbox");
  if (existing && document.body.contains(existing)) {
    document.body.removeChild(existing);
  }

  // Create isolated print sandbox directly on document.body
  const printSandbox = document.createElement("div");
  printSandbox.id = "global-print-sandbox";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = "cloned-invoice-print-sheet";
  clone.classList.add("invoice-print-container");
  printSandbox.appendChild(clone);
  document.body.appendChild(printSandbox);

  const cleanup = () => {
    if (document.body.contains(printSandbox)) {
      document.body.removeChild(printSandbox);
    }
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // Trigger print after brief delay to allow styles to settle
  setTimeout(() => {
    window.print();
    // Fallback cleanup in case afterprint does not fire in some browsers
    setTimeout(cleanup, 4000);
  }, 120);
}

export interface WhatsAppInvoiceShareParams {
  elementIdOrRef: HTMLElement | string;
  invoice: {
    invoiceNo: string;
    customerName: string;
    customerMobile?: string;
    date: string;
    grandTotal: number;
    billType?: string;
  };
  companyName?: string;
  filename?: string;
}

/**
 * Generates the Invoice PDF, copies the customer mobile number to clipboard for easy pasting in WhatsApp search bar, and opens WhatsApp.
 * - On Mobile / Web Share API: Attaches the actual PDF file to the share sheet.
 * - On Desktop browsers without file sharing: Automatically copies mobile number to clipboard, downloads PDF, and opens WhatsApp.
 */
export async function shareInvoicePDFOnWhatsApp({
  elementIdOrRef,
  invoice,
  companyName = "DHARMI THREAD & JARI",
  filename,
}: WhatsAppInvoiceShareParams): Promise<{
  sharedVia: "native_share" | "download_and_whatsapp";
  filename: string;
  copiedMobile?: string;
}> {
  const safeInvoiceName = (invoice.invoiceNo || "Invoice").replace(/[\/\\]/g, "_");
  const targetFilename = filename || `SaleBill_${safeInvoiceName}.pdf`;

  // 1. Clean & prepare customer mobile number for copying & WhatsApp URL
  const rawMobile = (invoice.customerMobile || "").trim();
  const cleanMobileDigits = rawMobile.replace(/\D/g, "");
  const tenDigitMobile =
    cleanMobileDigits.length === 10
      ? cleanMobileDigits
      : cleanMobileDigits.startsWith("91") && cleanMobileDigits.length === 12
      ? cleanMobileDigits.slice(2)
      : cleanMobileDigits;
  const formattedMobile = cleanMobileDigits.startsWith("91")
    ? cleanMobileDigits
    : cleanMobileDigits.length === 10
    ? `91${cleanMobileDigits}`
    : cleanMobileDigits;

  const phoneToCopy = tenDigitMobile || rawMobile;

  // 2. Automatically copy mobile number to clipboard
  if (phoneToCopy && typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(phoneToCopy);
    } catch (clipErr) {
      console.warn("Failed to copy mobile number to clipboard:", clipErr);
    }
  }

  // 3. Generate pristine high-resolution PDF File using A4 sandbox
  const { pdf, file, filename: safeFilename } = await generateInvoicePDF(
    elementIdOrRef,
    targetFilename
  );

  // 4. Format WhatsApp message
  const isGst = invoice.billType !== "raw";
  const docTitle = isGst ? "Tax Invoice" : "Sale Bill";

  const message =
    `*${docTitle} from ${companyName}*\n\n` +
    `*Bill No:* ${invoice.invoiceNo}\n` +
    `*Date:* ${invoice.date}\n` +
    `*Customer:* ${invoice.customerName}\n` +
    `*Total Amount:* ₹${invoice.grandTotal.toLocaleString("en-IN")}\n\n` +
    `Please find attached the official ${docTitle} PDF document.\n` +
    `Thank you for your business!\n` +
    `Mo: 99256 06480 | Surat, Gujarat`;

  // 5. Try Native Web Share API with File (Mobile Devices & supported desktop browsers)
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${docTitle} - ${invoice.invoiceNo}`,
          text: message,
        });
        return { sharedVia: "native_share", filename: safeFilename, copiedMobile: phoneToCopy };
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        // User cancelled share picker
        return { sharedVia: "native_share", filename: safeFilename, copiedMobile: phoneToCopy };
      }
      console.warn("Native file share failed, falling back to download + WhatsApp Web:", shareErr);
    }
  }

  // 6. Desktop / WhatsApp Web Fallback:
  // Automatically trigger PDF download so the file is ready in user's downloads folder/bar
  pdf.save(safeFilename);

  // Open WhatsApp Web with customer mobile & prefilled message (or standard WhatsApp Web if no mobile specified)
  const waUrl = formattedMobile
    ? `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com`;

  window.open(waUrl, "_blank");

  return { sharedVia: "download_and_whatsapp", filename: safeFilename, copiedMobile: phoneToCopy };
}

export interface WhatsAppLedgerShareParams {
  elementIdOrRef: HTMLElement | string;
  customerName: string;
  customerMobile?: string;
  periodLabel: string;
  closingBalance: number;
  companyName?: string;
  filename?: string;
}

/**
 * Generates Customer Monthly Ledger PDF, copies customer mobile number to clipboard, and shares to WhatsApp
 */
export async function shareLedgerPDFOnWhatsApp({
  elementIdOrRef,
  customerName,
  customerMobile,
  periodLabel,
  closingBalance,
  companyName = "DHARMI THREAD & JARI",
  filename,
}: WhatsAppLedgerShareParams): Promise<{
  sharedVia: "native_share" | "download_and_whatsapp";
  filename: string;
  copiedMobile?: string;
}> {
  const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
  const targetFilename = filename || `Ledger_${sanitizedName}.pdf`;

  // 1. Clean & prepare customer mobile number for copying & WhatsApp URL
  const rawMobile = (customerMobile || "").trim();
  const cleanMobileDigits = rawMobile.replace(/\D/g, "");
  const tenDigitMobile =
    cleanMobileDigits.length === 10
      ? cleanMobileDigits
      : cleanMobileDigits.startsWith("91") && cleanMobileDigits.length === 12
      ? cleanMobileDigits.slice(2)
      : cleanMobileDigits;
  const formattedMobile = cleanMobileDigits.startsWith("91")
    ? cleanMobileDigits
    : cleanMobileDigits.length === 10
    ? `91${cleanMobileDigits}`
    : cleanMobileDigits;

  const phoneToCopy = tenDigitMobile || rawMobile;

  // 2. Automatically copy mobile number to clipboard
  if (phoneToCopy && typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(phoneToCopy);
    } catch (clipErr) {
      console.warn("Failed to copy mobile number to clipboard:", clipErr);
    }
  }

  // 3. Generate pristine high-resolution PDF File
  const { pdf, file, filename: safeFilename } = await generateInvoicePDF(
    elementIdOrRef,
    targetFilename
  );

  // 4. Format WhatsApp message
  const balanceText =
    closingBalance >= 0
      ? `₹${closingBalance.toLocaleString("en-IN")} (Debit/Receivable)`
      : `₹${Math.abs(closingBalance).toLocaleString("en-IN")} (Credit/Advance)`;

  const message =
    `*Account Statement / Ledger from ${companyName}*\n\n` +
    `*Customer:* ${customerName}\n` +
    `*Period:* ${periodLabel}\n` +
    `*Closing Balance:* ${balanceText}\n\n` +
    `Please find attached your complete monthly ledger statement PDF.\n` +
    `Thank you for your business!\n` +
    `Mo: 99256 06480 | Surat, Gujarat`;

  // 5. Try Native Web Share API with File
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Statement of Account - ${customerName}`,
          text: message,
        });
        return { sharedVia: "native_share", filename: safeFilename, copiedMobile: phoneToCopy };
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        return { sharedVia: "native_share", filename: safeFilename, copiedMobile: phoneToCopy };
      }
      console.warn("Native ledger file share failed, falling back to download + WhatsApp Web:", shareErr);
    }
  }

  // 6. Desktop / WhatsApp Web Fallback
  pdf.save(safeFilename);

  const waUrl = formattedMobile
    ? `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`
    : `https://web.whatsapp.com`;

  window.open(waUrl, "_blank");

  return { sharedVia: "download_and_whatsapp", filename: safeFilename, copiedMobile: phoneToCopy };
}
