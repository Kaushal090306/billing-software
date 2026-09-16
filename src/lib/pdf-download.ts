import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export async function downloadInvoicePDF(
  elementIdOrRef: HTMLElement | string,
  filename: string = "Tax_Invoice.pdf"
): Promise<void> {
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
    pdf.save(safeFilename);
  } catch (err) {
    console.error("PDF generation failed:", err);
    throw err;
  }
}

