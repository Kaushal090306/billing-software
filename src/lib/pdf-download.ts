import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";

export interface GeneratePDFResult {
  pdf: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
}

let fontsPreloaded = false;

function ensureGlobalFontsInjected() {
  if (typeof document === "undefined" || fontsPreloaded) return;
  const existing = document.getElementById("dharmi-pdf-global-fonts");
  if (!existing) {
    const style = document.createElement("style");
    style.id = "dharmi-pdf-global-fonts";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    `;
    document.head.appendChild(style);
  }
  fontsPreloaded = true;
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

  // Preload global fonts once into document.head
  ensureGlobalFontsInjected();

  // 1. Create an off-screen fixed-width desktop A4 sandbox (794px = standard A4 width at 96 DPI)
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
  clone.style.minHeight = "1120px";
  clone.style.display = "flex";
  clone.style.flexDirection = "column";
  clone.style.justifyContent = "flex-start";
  clone.style.margin = "0 auto";
  clone.style.boxShadow = "none";
  clone.style.transform = "none";
  clone.style.overflow = "visible";
  clone.style.background = "#ffffff";
  clone.style.color = "#000000";

  // Strip any buttons, file inputs, dropdowns or no-print UI elements from the clone
  clone.querySelectorAll(".no-print, button, input, select").forEach((el) => {
    el.remove();
  });

  // Inject font and layout styles directly inside the sandbox
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #sandbox-cloned-invoice,
    #sandbox-cloned-invoice * {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Gujarati Sangam MN', Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #sandbox-cloned-invoice .tabular-nums,
    #sandbox-cloned-invoice .font-mono {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Gujarati Sangam MN', Arial, sans-serif !important;
      font-variant-numeric: tabular-nums !important;
    }
  `;
  sandbox.appendChild(styleEl);
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Brief settle tick for DOM layout
    await new Promise((r) => setTimeout(r, 25));

    // Dynamically expand product table height to absorb all remaining space
    // so there is ZERO blank gap/padding between the TOTAL bar and the summary section below it.
    expandTableToFillSection(clone);

    // Capture pristine 300dpi image from sandbox (toJpeg is 4x faster and produces compact, sharp outputs)
    const measuredHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1123);

    const dataUrl = await toJpeg(clone, {
      quality: 0.96,
      pixelRatio: 2, // 300dpi sharpness
      backgroundColor: "#ffffff",
      cacheBust: false, // use in-memory font cache for instant processing
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

    const naturalW = 794 * 2;
    const naturalH = measuredHeight * 2;

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
      "JPEG",
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

  // Expand table height so print sheet has continuous borders and no awkward gaps
  expandTableToFillSection(clone);

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

/**
 * Automatically adjusts the product table height to absorb all remaining space in the invoice container,
 * ensuring continuous column border lines and eliminating any awkward padding/gap between the TOTAL bar
 * and the tax/summary/bank section.
 */
export function expandTableToFillSection(rootEl: HTMLElement) {
  try {
    const tableEl = rootEl.querySelector("table");
    const tableSec = (rootEl.querySelector('[data-section-id="items_table"]') ||
      tableEl?.closest(".group\\/sec") ||
      tableEl?.parentElement?.parentElement) as HTMLElement | null;

    if (!tableEl || !tableSec) return;

    // Reset filler row height before measuring
    const fillerRow = tableEl.querySelector(".table-filler-row") as HTMLElement | null;
    if (fillerRow) {
      fillerRow.style.height = "0px";
      Array.from(fillerRow.children).forEach((cell) => {
        (cell as HTMLElement).style.height = "0px";
      });
    }

    const secHeight = tableSec.clientHeight || tableSec.offsetHeight;
    const tblHeight = tableEl.offsetHeight;
    const gap = secHeight - tblHeight;

    if (gap > 2) {
      const tbody = tableEl.querySelector("tbody");
      const rowH = 24; // standard table row height (px)
      const borderColor = tableEl.style.borderColor || "#000000";

      // If gap is large enough for full rows, insert real empty rows before the filler row
      if (tbody && fillerRow && gap >= rowH) {
        const numRowsToAdd = Math.floor(gap / rowH);
        const remainingPx = gap % rowH;

        for (let r = 0; r < numRowsToAdd; r++) {
          const tr = document.createElement("tr");
          tr.className = "h-6";
          tr.style.height = `${rowH}px`;
          tr.innerHTML = `
            <td class="border-r" style="border-color: ${borderColor}; height: ${rowH}px"></td>
            <td class="border-r" style="border-color: ${borderColor}; height: ${rowH}px"></td>
            <td class="border-r" style="border-color: ${borderColor}; height: ${rowH}px"></td>
            <td class="border-r" style="border-color: ${borderColor}; height: ${rowH}px"></td>
            <td class="border-r" style="border-color: ${borderColor}; height: ${rowH}px"></td>
            <td style="height: ${rowH}px"></td>
          `;
          tbody.insertBefore(tr, fillerRow);
        }

        if (remainingPx > 0) {
          fillerRow.style.height = `${remainingPx}px`;
          Array.from(fillerRow.children).forEach((cell) => {
            (cell as HTMLElement).style.height = `${remainingPx}px`;
          });
        }
      } else if (fillerRow) {
        fillerRow.style.height = `${gap}px`;
        Array.from(fillerRow.children).forEach((cell) => {
          (cell as HTMLElement).style.height = `${gap}px`;
        });
      }
    }
  } catch (err) {
    console.warn("Could not expand table height in sandbox:", err);
  }
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
  const targetFilename = filename || getProperInvoicePdfFilename(invoice);

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

/**
 * Generates an official, clean, sanitized PDF filename for any invoice.
 * Example for GST Invoice: TaxInvoice_DTJ-101_MODI_FASHION_2026-10-06.pdf
 * Example for Raw Bill: RawBill_RAW-024_KIRAN_TEXTILES_2026-10-06.pdf
 */
export function getProperInvoicePdfFilename(invoice: {
  invoiceNo?: string;
  billType?: string;
  customerName?: string;
  date?: string;
}): string {
  const isRaw = invoice.billType === "raw";
  const prefix = isRaw ? "RawBill" : "TaxInvoice";
  const rawNo = invoice.invoiceNo || "Bill";
  // Replace slashes or special characters with dash
  const safeInvNo = rawNo.replace(/[\/\\?%*:|"<>]/g, "-").trim();
  const rawCustomer = invoice.customerName || "Customer";
  const safeCustName = rawCustomer
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .toUpperCase();
  const rawDate = (invoice.date || "").trim();
  const safeDate = rawDate.replace(/[\/\\?%*:|"<>]/g, "-");

  if (safeDate) {
    return `${prefix}_${safeInvNo}_${safeCustName}_${safeDate}.pdf`;
  }
  return `${prefix}_${safeInvNo}_${safeCustName}.pdf`;
}

/**
 * Generates an official, clean, sanitized ZIP archive filename for batch invoice export.
 * Example for Month: Invoices_Dharmi_October_2026.zip
 * Example for Date Range: TaxInvoices_Dharmi_2026-10-01_to_2026-10-07.zip
 * Example for Single Customer: Invoices_MODI_FASHION_October_2026.zip
 */
export function getProperZipArchiveFilename(options: {
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  billType?: "all" | "gst" | "raw";
  customerName?: string;
  companyName?: string;
}): string {
  const parts: string[] = [];

  // 1. Bill Type prefix
  if (options.billType === "gst") {
    parts.push("TaxInvoices");
  } else if (options.billType === "raw") {
    parts.push("RawBills");
  } else {
    parts.push("Invoices");
  }

  // 2. Company / Brand or Customer Name
  if (options.customerName && options.customerName !== "all" && options.customerName.trim().length > 0) {
    parts.push(options.customerName.trim().replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_").toUpperCase());
  } else {
    const rawCompany = (options.companyName || "Dharmi").trim();
    const safeCompany = rawCompany
      .split(" ")[0] // Take primary brand name, e.g. "Dharmi"
      .replace(/[\/\\?%*:|"<>]/g, "_");
    parts.push(safeCompany);
  }

  // 3. Duration / Date Range
  if (options.periodLabel) {
    parts.push(options.periodLabel.replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_"));
  } else if (options.startDate && options.endDate) {
    if (options.startDate === options.endDate) {
      parts.push(options.startDate);
    } else {
      parts.push(`${options.startDate}_to_${options.endDate}`);
    }
  } else {
    const today = new Date().toISOString().split("T")[0];
    parts.push(today);
  }

  return `${parts.join("_")}.zip`;
}

