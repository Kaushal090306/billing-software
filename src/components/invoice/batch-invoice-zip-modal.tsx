"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import JSZip from "jszip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InvoiceTemplate } from "./invoice-template";
import {
  Invoice,
  BusinessSettings,
  InvoiceTemplateConfig,
  BillingStore,
} from "@/lib/store";
import {
  generateInvoicePDF,
  getProperInvoicePdfFilename,
  getProperZipArchiveFilename,
} from "@/lib/pdf-download";
import {
  formatINR,
  formatNumber,
  formatDateToYMD,
  normalizeDateToYMD,
} from "@/lib/billing-utils";
import {
  Archive,
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  Layers,
  Loader2,
  X,
  FileCheck2,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface BatchInvoiceZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: BusinessSettings;
  defaultPeriod?: "this_month" | "last_month" | "this_fy" | "custom";
}

type PeriodPreset =
  | "this_month"
  | "last_month"
  | "this_fy"
  | "last_30_days"
  | "today"
  | "custom";

export function BatchInvoiceZipModal({
  isOpen,
  onClose,
  invoices,
  settings,
  defaultPeriod = "this_month",
}: BatchInvoiceZipModalProps) {
  // Preset & Dates
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(defaultPeriod);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState<string>("");

  // Filters
  const [billTypeFilter, setBillTypeFilter] = useState<"all" | "gst" | "raw">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    settings.activeTemplateId || "tpl_standard_gst"
  );

  // Selection
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentInvoiceNo: string;
    currentCustomerName: string;
    stage: "idle" | "rendering" | "packaging" | "done";
  }>({
    current: 0,
    total: 0,
    percent: 0,
    currentInvoiceNo: "",
    currentCustomerName: "",
    stage: "idle",
  });

  // Ref for offscreen invoice template mounting
  const [currentBatchInvoice, setCurrentBatchInvoice] = useState<Invoice | null>(null);
  const batchTemplateRef = useRef<HTMLDivElement>(null);
  const offscreenContainerRef = useRef<HTMLDivElement>(null);
  const cancelGenerationRef = useRef(false);

  // Setup Date Presets using local dates to avoid UTC offset shifts
  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (0 = Jan, 8 = Sep, 9 = Oct...)
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    if (preset === "this_month") {
      const start = formatDateToYMD(new Date(year, month, 1));
      const end = formatDateToYMD(new Date(year, month + 1, 0));
      setStartDate(start);
      setEndDate(end);
      setPeriodLabel(`${monthNames[month]}_${year}`);
    } else if (preset === "last_month") {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const start = formatDateToYMD(new Date(prevYear, prevMonth, 1));
      const end = formatDateToYMD(new Date(prevYear, prevMonth + 1, 0));
      setStartDate(start);
      setEndDate(end);
      setPeriodLabel(`${monthNames[prevMonth]}_${prevYear}`);
    } else if (preset === "this_fy") {
      // Indian Financial Year: 1st April to 31st March
      const fyStartYear = month >= 3 ? year : year - 1;
      const fyEndYear = fyStartYear + 1;
      const start = `${fyStartYear}-04-01`;
      const end = `${fyEndYear}-03-31`;
      setStartDate(start);
      setEndDate(end);
      setPeriodLabel(`FY${fyStartYear}-${String(fyEndYear).slice(2)}`);
    } else if (preset === "last_30_days") {
      const end = formatDateToYMD(now);
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const start = formatDateToYMD(thirtyDaysAgo);
      setStartDate(start);
      setEndDate(end);
      setPeriodLabel(`Last_30_Days`);
    } else if (preset === "today") {
      const today = formatDateToYMD(now);
      setStartDate(today);
      setEndDate(today);
      setPeriodLabel(`Today_${today}`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      applyPreset(defaultPeriod);
      cancelGenerationRef.current = false;
      setIsGenerating(false);
      setProgress({
        current: 0,
        total: 0,
        percent: 0,
        currentInvoiceNo: "",
        currentCustomerName: "",
        stage: "idle",
      });
    }
  }, [isOpen, defaultPeriod]);

  // Customer options list
  const customerList = useMemo(() => {
    const map = new Map<string, string>();
    invoices.forEach((inv) => {
      if (inv.customerId && inv.customerName) {
        map.set(inv.customerId, inv.customerName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  // Templates
  const templates =
    settings.templates && settings.templates.length > 0
      ? settings.templates
      : BillingStore.getTemplates();

  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Filter invoices based on date range and filters
  const matchingInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // 1. Date range filter (using normalized YYYY-MM-DD for accurate comparison)
        const invYMD =
          normalizeDateToYMD(inv.date) ||
          normalizeDateToYMD(inv.createdAt) ||
          "";

        if (startDate && (!invYMD || invYMD < startDate)) return false;
        if (endDate && (!invYMD || invYMD > endDate)) return false;

        // 2. Bill type filter
        const isRaw = inv.billType === "raw";
        if (billTypeFilter === "gst" && isRaw) return false;
        if (billTypeFilter === "raw" && !isRaw) return false;

        // 3. Customer filter
        if (selectedCustomerId !== "all" && inv.customerId !== selectedCustomerId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = normalizeDateToYMD(a.date) || normalizeDateToYMD(a.createdAt) || "";
        const bDate = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.createdAt) || "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true });
      });
  }, [invoices, startDate, endDate, billTypeFilter, selectedCustomerId]);

  // Auto-select all matching invoices whenever matching list changes
  useEffect(() => {
    setSelectedInvoiceIds(new Set(matchingInvoices.map((i) => i.id)));
  }, [matchingInvoices]);

  // Toggle invoice selection
  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.size === matchingInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(matchingInvoices.map((i) => i.id)));
    }
  };

  // Selected invoices array in chronological order
  const invoicesToExport = useMemo(() => {
    return matchingInvoices.filter((inv) => selectedInvoiceIds.has(inv.id));
  }, [matchingInvoices, selectedInvoiceIds]);

  // Aggregated stats of selected invoices
  const exportStats = useMemo(() => {
    const totalAmount = invoicesToExport.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalQty = invoicesToExport.reduce((sum, inv) => sum + (inv.totalQuantity || 0), 0);
    return {
      count: invoicesToExport.length,
      totalAmount,
      totalQty,
    };
  }, [invoicesToExport]);

  // Computed clean ZIP archive name
  const properZipFilename = useMemo(() => {
    const customerObj =
      selectedCustomerId !== "all"
        ? customerList.find((c) => c.id === selectedCustomerId)
        : null;

    return getProperZipArchiveFilename({
      periodLabel: periodPreset !== "custom" ? periodLabel : undefined,
      startDate,
      endDate,
      billType: billTypeFilter,
      customerName: customerObj?.name,
      companyName: settings.companyName,
    });
  }, [
    periodPreset,
    periodLabel,
    startDate,
    endDate,
    billTypeFilter,
    selectedCustomerId,
    customerList,
    settings.companyName,
  ]);

  // -------------------------------------------------------------------------
  // SINGLE-CLICK ZIP GENERATION ENGINE
  // -------------------------------------------------------------------------
  const handleStartZipDownload = async () => {
    if (invoicesToExport.length === 0) {
      toast.error("No invoices selected for ZIP export");
      return;
    }

    try {
      setIsGenerating(true);
      cancelGenerationRef.current = false;
      const total = invoicesToExport.length;

      setProgress({
        current: 0,
        total,
        percent: 0,
        currentInvoiceNo: "",
        currentCustomerName: "",
        stage: "rendering",
      });

      const zip = new JSZip();

      // Sequential off-screen rendering of each invoice into pristine high-res PDF
      for (let i = 0; i < total; i++) {
        if (cancelGenerationRef.current) {
          toast.info("ZIP download cancelled by user");
          setIsGenerating(false);
          return;
        }

        const inv = invoicesToExport[i];
        const properPdfName = getProperInvoicePdfFilename(inv);

        // Force synchronous React state flush to render invoice template into hidden DOM
        flushSync(() => {
          setCurrentBatchInvoice(inv);
        });

        const currentPct = Math.round(((i + 1) / total) * 90);
        setProgress({
          current: i + 1,
          total,
          percent: currentPct,
          currentInvoiceNo: inv.invoiceNo,
          currentCustomerName: inv.customerName,
          stage: "rendering",
        });

        // Wait brief tick for React commit and canvas/monogram rendering
        await new Promise((r) => setTimeout(r, 65));

        const targetEl =
          batchTemplateRef.current ||
          document.getElementById("official-invoice-print-sheet");

        if (!targetEl) {
          console.warn(`Template element missing for invoice ${inv.invoiceNo}`);
          continue;
        }

        // Generate pristine single-page A4 PDF using the standard sandbox
        const pdfResult = await generateInvoicePDF(targetEl, properPdfName);
        zip.file(pdfResult.filename, pdfResult.blob);
      }

      // Final packaging phase
      setProgress({
        current: total,
        total,
        percent: 95,
        currentInvoiceNo: "",
        currentCustomerName: "",
        stage: "packaging",
      });

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      // Trigger standard browser download
      const url = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = properZipFilename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setProgress({
        current: total,
        total,
        percent: 100,
        currentInvoiceNo: "",
        currentCustomerName: "",
        stage: "done",
      });

      toast.success(
        `✓ Downloaded ${total} invoices in ${properZipFilename}!`,
        { duration: 5000 }
      );

      setTimeout(() => {
        setIsGenerating(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Batch ZIP export failed:", err);
      toast.error(err?.message || "Failed to generate ZIP archive");
      setIsGenerating(false);
    } finally {
      // Clean up batch invoice state
      setCurrentBatchInvoice(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Archive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Download Invoices ZIP</span>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300 font-semibold text-xs">
                Custom Duration
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Download all invoices for any custom period in a single-click ZIP archive with clean, standardized file naming.
          </DialogDescription>
        </DialogHeader>

        {/* Duration Presets Bar */}
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span>Select Period / Duration</span>
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {(() => {
                const now = new Date();
                const curM = now.getMonth();
                const fyStart = curM >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                const fyText = `This FY (${fyStart}–${String(fyStart + 1).slice(2)})`;

                const presets: Array<{ id: PeriodPreset; label: string }> = [
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "this_fy", label: fyText },
                  { id: "last_30_days", label: "Last 30 Days" },
                  { id: "today", label: "Today" },
                  { id: "custom", label: "Custom Range" },
                ];

                return presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    disabled={isGenerating}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      periodPreset === preset.id
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground">
                From Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                disabled={isGenerating}
                className="mt-1 text-xs h-8 bg-white dark:bg-zinc-900 font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground">
                To Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                disabled={isGenerating}
                className="mt-1 text-xs h-8 bg-white dark:bg-zinc-900 font-mono"
              />
            </div>
          </div>

          {/* Secondary Filters: Bill Type, Customer & Template */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Bill Type */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Bill Type
              </Label>
              <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "gst", label: "GST Only" },
                    { id: "raw", label: "Raw Only" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBillTypeFilter(tab.id)}
                    disabled={isGenerating}
                    className={`flex-1 py-1.5 text-center font-medium transition-colors cursor-pointer ${
                      billTypeFilter === tab.id
                        ? "bg-purple-600 text-white font-semibold"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Filter */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Customer Filter
              </Label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={isGenerating}
                className="w-full text-xs h-8 px-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
              >
                <option value="all">All Customers ({customerList.length})</option>
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Template Format */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                PDF Template Format
              </Label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isGenerating}
                className="w-full text-xs h-8 px-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Archive Name Preview Box */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="font-medium text-purple-900 dark:text-purple-200">
                Target ZIP File Name:
              </span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                {properZipFilename}
              </span>
            </div>
            <div className="text-[11px] text-purple-800 dark:text-purple-300 font-medium">
              Standard format &bull; 100% A4 single-page fit
            </div>
          </div>

          {/* Matching Invoices List & Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Bills in this Export ({invoicesToExport.length} of {matchingInvoices.length})
                </span>
                {exportStats.count > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono text-purple-700 dark:text-purple-300 border-purple-300">
                    Total: {formatINR(exportStats.totalAmount)} &bull; {formatNumber(exportStats.totalQty, 3)} KG
                  </Badge>
                )}
              </div>

              {matchingInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  disabled={isGenerating}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                >
                  {selectedInvoiceIds.size === matchingInvoices.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              )}
            </div>

            {/* Invoices Preview Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          matchingInvoices.length > 0 &&
                          selectedInvoiceIds.size === matchingInvoices.length
                        }
                        onChange={toggleSelectAll}
                        disabled={isGenerating}
                        className="cursor-pointer rounded"
                      />
                    </th>
                    <th className="p-2">Invoice No</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2 text-center">Type</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {matchingInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">
                        No invoices found for the selected period and criteria.
                      </td>
                    </tr>
                  ) : (
                    matchingInvoices.map((inv) => {
                      const isChecked = selectedInvoiceIds.has(inv.id);
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => !isGenerating && toggleSelectInvoice(inv.id)}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-purple-50/40 dark:bg-purple-950/20"
                              : "opacity-60"
                          }`}
                        >
                          <td
                            className="p-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectInvoice(inv.id)}
                              disabled={isGenerating}
                              className="cursor-pointer rounded"
                            />
                          </td>
                          <td className="p-2 font-mono font-semibold text-purple-700 dark:text-purple-300">
                            {inv.invoiceNo}
                          </td>
                          <td className="p-2 text-muted-foreground font-mono">
                            {inv.date}
                          </td>
                          <td className="p-2 font-semibold uppercase truncate max-w-[200px]">
                            {inv.customerName}
                          </td>
                          <td className="p-2 text-center">
                            {inv.billType === "raw" ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[9px] px-1.5 py-0">
                                Raw
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300 text-[9px] px-1.5 py-0">
                                GST
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {formatINR(inv.grandTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Generation Progress Indicator */}
          {isGenerating && (
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {progress.stage === "packaging"
                      ? "Compressing into ZIP archive..."
                      : `Generating PDF (${progress.current} of ${progress.total})`}
                  </span>
                </div>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {progress.currentInvoiceNo && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono font-medium">
                    Bill: {progress.currentInvoiceNo} &bull; {progress.currentCustomerName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      cancelGenerationRef.current = true;
                    }}
                    className="text-red-500 font-bold hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="text-xs h-9 px-4 rounded-md"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={handleStartZipDownload}
              disabled={isGenerating || invoicesToExport.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs h-9 px-5 rounded-md shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Packaging {invoicesToExport.length} Bills...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download ZIP ({invoicesToExport.length} Bills)</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hidden Isolated Rendering Sandbox for Generating PDFs */}
        <div
          ref={offscreenContainerRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "794px",
            minWidth: "794px",
            maxWidth: "794px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -99999,
          }}
        >
          {currentBatchInvoice && (
            <InvoiceTemplate
              ref={batchTemplateRef}
              invoice={currentBatchInvoice}
              settings={settings}
              templateConfig={currentTemplate}
              copyType="Original"
              interactive={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
