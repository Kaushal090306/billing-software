"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BillingStore, Invoice, BusinessSettings } from "@/lib/store";
import { InvoiceTemplate } from "@/components/invoice/invoice-template";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share2, Download, Copy, Plus, Loader2, LayoutTemplate } from "lucide-react";
import { buildWhatsAppInvoiceShareUrl } from "@/lib/billing-utils";
import { downloadInvoicePDF } from "@/lib/pdf-download";
import { toast } from "sonner";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );
  const [copyType, setCopyType] = useState<
    "Original" | "Duplicate" | "Triplicate"
  >("Original");
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    settings.activeTemplateId || "tpl_standard_gst"
  );

  const templates = settings.templates && settings.templates.length > 0
    ? settings.templates
    : BillingStore.getTemplates();

  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates[0];

  useEffect(() => {
    const inv = BillingStore.getInvoiceById(id);
    if (inv) {
      setInvoice(inv);
    }
    const s = BillingStore.getSettings();
    setSettings(s);
    if (s.activeTemplateId) {
      setSelectedTemplateId(s.activeTemplateId);
    }
  }, [id]);

  if (!invoice) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Invoice Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const handlePrint = (type: "Original" | "Duplicate" | "Triplicate") => {
    setCopyType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const target = document.getElementById("official-invoice-print-sheet");
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

  const handleWhatsApp = () => {
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
  };

  const handleDuplicate = () => {
    router.push(`/invoices/new?duplicateFrom=${invoice.id}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top action bar - Hidden during print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>Invoice {invoice.invoiceNo}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {invoice.customerName}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Billed on {invoice.date} &bull; Total: ₹{invoice.grandTotal}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700">
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

          {/* Copy Selector */}
          <div className="flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-medium">
            {(["Original", "Duplicate", "Triplicate"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCopyType(type)}
                className={`px-2.5 py-1 rounded-sm transition-all ${
                  copyType === type
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs h-9 px-3 rounded-md flex items-center gap-1.5 shadow-xs"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Download PDF</span>
          </Button>

          <Button
            onClick={() => handlePrint("Original")}
            className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs h-9 px-3 rounded-md flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>

          <Button
            onClick={handleWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-3 rounded-md flex items-center gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </Button>

          <Button
            onClick={handleDuplicate}
            variant="secondary"
            className="text-xs h-9 px-3 rounded-md flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-300"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Repeat Bill</span>
          </Button>
        </div>
      </div>

      {/* The Printable Invoice Box */}
      <div className="p-3 sm:p-6 bg-zinc-100 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/80 dark:border-zinc-800 overflow-x-auto flex justify-center print:bg-white print:p-0 print:border-none">
        <div className="shadow-lg rounded-sm bg-white border border-zinc-300/80">
          <InvoiceTemplate
            invoice={invoice}
            settings={settings}
            templateConfig={currentTemplate}
            copyType={copyType}
          />
        </div>
      </div>
    </div>
  );
}
