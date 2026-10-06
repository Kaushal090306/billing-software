import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export interface GeneratePDFResult {
  pdf: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
}

/**
 * Generates a pristine high-resolution (300dpi) PDF instance, blob, and File object from an HTML element
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

  try {
    // Generate high resolution PNG (pixelRatio: 2 for 300dpi sharpness)
    // Override any parent transform scale to capture full pristine resolution
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      style: {
        transform: "none",
        transformOrigin: "top center",
        margin: "0 auto",
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Fill page margins with 4mm padding on all sides for standard A4
    const margin = 4;
    const printWidth = pdfWidth - margin * 2; // 202mm

    // Measure image dimensions
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (e) => reject(e);
    });

    const printHeight = (img.naturalHeight * printWidth) / img.naturalWidth;
    const finalHeight = Math.min(printHeight, pdfHeight - margin * 2);

    pdf.addImage(
      dataUrl,
      "PNG",
      margin,
      margin,
      printWidth,
      finalHeight,
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
 * Generates the Invoice PDF and shares it directly to WhatsApp.
 * - On Mobile / Web Share API: Attaches the actual PDF file to the share sheet.
 * - On Desktop browsers without file sharing: Automatically downloads the PDF and opens WhatsApp chat for 1-click drag & drop.
 */
export async function shareInvoicePDFOnWhatsApp({
  elementIdOrRef,
  invoice,
  companyName = "DHARMI THREAD & JARI",
  filename,
}: WhatsAppInvoiceShareParams): Promise<{ sharedVia: "native_share" | "download_and_whatsapp"; filename: string }> {
  const safeInvoiceName = (invoice.invoiceNo || "Invoice").replace(/[\/\\]/g, "_");
  const targetFilename = filename || `SaleBill_${safeInvoiceName}.pdf`;

  // 1. Generate pristine high-resolution PDF File
  const { pdf, file, filename: safeFilename } = await generateInvoicePDF(
    elementIdOrRef,
    targetFilename
  );

  // 2. Format WhatsApp message
  const isGst = invoice.billType !== "raw";
  const docTitle = isGst ? "Tax Invoice" : "Sale Bill";
  const cleanMobile = (invoice.customerMobile || "").replace(/\D/g, "");
  const formattedMobile = cleanMobile.startsWith("91")
    ? cleanMobile
    : cleanMobile.length === 10
    ? `91${cleanMobile}`
    : cleanMobile;

  const message =
    `*${docTitle} from ${companyName}*\n\n` +
    `*Bill No:* ${invoice.invoiceNo}\n` +
    `*Date:* ${invoice.date}\n` +
    `*Customer:* ${invoice.customerName}\n` +
    `*Total Amount:* ₹${invoice.grandTotal.toLocaleString("en-IN")}\n\n` +
    `Please find attached the official ${docTitle} PDF document.\n` +
    `Thank you for your business!\n` +
    `Mo: 99256 06480 | Surat, Gujarat`;

  // 3. Try Native Web Share API with File (Mobile Devices & supported desktop browsers)
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
        return { sharedVia: "native_share", filename: safeFilename };
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        // User cancelled share picker
        return { sharedVia: "native_share", filename: safeFilename };
      }
      console.warn("Native file share failed, falling back to download + WhatsApp Web:", shareErr);
    }
  }

  // 4. Desktop / WhatsApp Web Fallback:
  // Automatically trigger PDF download so the file is ready in user's downloads folder/bar
  pdf.save(safeFilename);

  // Open WhatsApp Web with customer mobile & prefilled message
  const waUrl = formattedMobile
    ? `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank");

  return { sharedVia: "download_and_whatsapp", filename: safeFilename };
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
 * Generates Customer Monthly Ledger PDF and shares it to WhatsApp
 */
export async function shareLedgerPDFOnWhatsApp({
  elementIdOrRef,
  customerName,
  customerMobile,
  periodLabel,
  closingBalance,
  companyName = "DHARMI THREAD & JARI",
  filename,
}: WhatsAppLedgerShareParams): Promise<{ sharedVia: "native_share" | "download_and_whatsapp"; filename: string }> {
  const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
  const targetFilename = filename || `Ledger_${sanitizedName}.pdf`;

  // 1. Generate pristine high-resolution PDF File
  const { pdf, file, filename: safeFilename } = await generateInvoicePDF(
    elementIdOrRef,
    targetFilename
  );

  // 2. Format WhatsApp message
  const cleanMobile = (customerMobile || "").replace(/\D/g, "");
  const formattedMobile = cleanMobile.startsWith("91")
    ? cleanMobile
    : cleanMobile.length === 10
    ? `91${cleanMobile}`
    : cleanMobile;

  const balanceText = closingBalance >= 0 ? `₹${closingBalance.toLocaleString("en-IN")} (Debit/Receivable)` : `₹${Math.abs(closingBalance).toLocaleString("en-IN")} (Credit/Advance)`;

  const message =
    `*Account Statement / Ledger from ${companyName}*\n\n` +
    `*Customer:* ${customerName}\n` +
    `*Period:* ${periodLabel}\n` +
    `*Closing Balance:* ${balanceText}\n\n` +
    `Please find attached your complete monthly ledger statement PDF.\n` +
    `Thank you for your business!\n` +
    `Mo: 99256 06480 | Surat, Gujarat`;

  // 3. Try Native Web Share API with File
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
        return { sharedVia: "native_share", filename: safeFilename };
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        return { sharedVia: "native_share", filename: safeFilename };
      }
      console.warn("Native ledger file share failed, falling back to download + WhatsApp Web:", shareErr);
    }
  }

  // 4. Desktop / WhatsApp Web Fallback
  pdf.save(safeFilename);

  const waUrl = formattedMobile
    ? `https://wa.me/${formattedMobile}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank");

  return { sharedVia: "download_and_whatsapp", filename: safeFilename };
}
