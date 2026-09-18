"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceTemplate } from "./invoice-template";
import { Invoice, BusinessSettings, InvoiceTemplateConfig, BillingStore } from "@/lib/store";
import { Printer, Share2, Download, Copy, Check, Loader2, LayoutTemplate } from "lucide-react";
import { buildWhatsAppInvoiceShareUrl } from "@/lib/billing-utils";
import { downloadInvoicePDF } from "@/lib/pdf-download";
import { toast } from "sonner";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  initialTemplateId?: string;
}

export function InvoicePreviewModal({
  invoice,
  settings,
  isOpen,
  onClose,
  initialTemplateId,
}: InvoicePreviewModalProps) {
  const [copyType, setCopyType] = useState<
    "Original" | "Duplicate" | "Triplicate"
  >("Original");
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || settings.activeTemplateId || "tpl_standard_gst"
  );
  const printRef = useRef<HTMLDivElement>(null);

  const templates = settings.templates && settings.templates.length > 0
    ? settings.templates
    : BillingStore.getTemplates();

  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates[0];

  if (!invoice) return null;

  const handlePrint = (type: "Original" | "Duplicate" | "Triplicate") => {
    setCopyType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const target = printRef.current || document.getElementById("official-invoice-print-sheet");
      if (!target) {
        toast.error("Invoice element not ready");
        return;
      }
      const safeInvoiceName = (invoice.invoiceNo || "Invoice").replace(/[\/\\]/g, "_");
      await downloadInvoicePDF(target, `SaleBill_${safeInvoiceName}.pdf`);
      toast.success(`Downloaded SaleBill_${safeInvoiceName}.pdf!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const url = buildWhatsAppInvoiceShareUrl(
      invoice.customerMobile,
      {
        invoiceNo: invoice.invoiceNo,
        customerName: invoice.customerName,
        date: invoice.date,
        grandTotal: invoice.grandTotal,
      },
      settings.companyName
    );
    window.open(url, "_blank");
    toast.success("WhatsApp Share window opened");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>{invoice.billType === "raw" ? "Raw Bill" : "Tax Invoice"} {invoice.invoiceNo}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                {invoice.customerName}
              </span>
              {invoice.billType === "raw" && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                  {invoice.convertedToInvoiceId ? "Converted" : "Non-GST"}
                </span>
              )}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy selector dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-700/60">
              <select
                value={copyType}
                onChange={(e) => setCopyType(e.target.value as "Original" | "Duplicate" | "Triplicate")}
                className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer pr-1"
              >
                <option value="Original" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  Original
                </option>
                <option value="Duplicate" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  Duplicate
                </option>
                <option value="Triplicate" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  Triplicate
                </option>
              </select>
            </div>
          </div>
        </DialogHeader>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePrint("Original")}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs h-8 px-3.5 rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Original</span>
            </Button>
            <Button
              onClick={() => handlePrint("Duplicate")}
              variant="outline"
              className="border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs h-8 px-3.5 rounded-md flex items-center gap-1.5 font-medium shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Duplicate</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              <LayoutTemplate className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer pr-1"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3.5 rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 px-3.5 rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* The Printable Invoice Box */}
        <div className="py-4 bg-zinc-100 dark:bg-zinc-900/80 p-3 sm:p-6 rounded-lg border border-zinc-200/80 dark:border-zinc-800 overflow-x-auto flex justify-center">
          <div className="shadow-lg rounded-sm bg-white border border-zinc-300/80">
            <InvoiceTemplate
              ref={printRef}
              invoice={invoice}
              settings={settings}
              templateConfig={currentTemplate}
              copyType={copyType}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
