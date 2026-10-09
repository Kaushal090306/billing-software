"use client";

import React, { useState, useMemo, useRef } from "react";
import { Customer, Invoice, PaymentRecord, BusinessSettings, BillingStore } from "@/lib/store";
import { formatINR, formatNumber, normalizeDateToYMD } from "@/lib/billing-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Share2,
  Filter,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { downloadInvoicePDF, shareLedgerPDFOnWhatsApp, printInvoiceElement } from "@/lib/pdf-download";
import { toast } from "sonner";

interface CustomerMonthlyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  defaultMonth?: string; // e.g. "2026-04"
}

export function CustomerMonthlyLedgerModal({
  isOpen,
  onClose,
  customer,
  defaultMonth,
}: CustomerMonthlyLedgerModalProps) {
  const [settings, setSettings] = useState<BusinessSettings>(() =>
    BillingStore.getSettings()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (defaultMonth) return defaultMonth;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [filterType, setFilterType] = useState<"all" | "gst" | "raw">("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Invoices & Payments for this customer
  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    return BillingStore.getInvoicesByCustomer(customer.id);
  }, [customer, isOpen]);

  const customerPayments = useMemo(() => {
    if (!customer) return [];
    return BillingStore.getPaymentsByCustomer(customer.id);
  }, [customer, isOpen]);

  // Available Months with Transactions
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    // Add current month
    const now = new Date();
    monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

    customerInvoices.forEach((inv) => {
      const d = normalizeDateToYMD(inv.date) || normalizeDateToYMD(inv.createdAt);
      if (d && d.length >= 7) {
        monthSet.add(d.substring(0, 7));
      }
    });

    customerPayments.forEach((p) => {
      const d = normalizeDateToYMD(p.paymentDate) || normalizeDateToYMD(p.createdAt);
      if (d && d.length >= 7) {
        monthSet.add(d.substring(0, 7));
      }
    });

    const arr = Array.from(monthSet).sort().reverse();
    return arr;
  }, [customerInvoices, customerPayments]);

  // Calculate full timeline entries
  const fullLedger = useMemo(() => {
    if (!customer) return [];
    const rawEntries: Array<{
      id: string;
      date: string;
      normalizedDate: string;
      type: "OPENING" | "INVOICE" | "PAYMENT";
      billType?: "gst" | "raw";
      reference: string;
      debit: number;
      credit: number;
      notes: string;
      rawTimestamp: number;
    }> = [];

    // Opening balance
    if ((customer.openingBalance || 0) > 0) {
      const openDate = customer.createdAt
        ? normalizeDateToYMD(customer.createdAt)
        : "2026-04-01";
      rawEntries.push({
        id: "opening",
        date: openDate,
        normalizedDate: openDate,
        type: "OPENING",
        reference: "Opening Balance",
        debit: customer.openingBalance,
        credit: 0,
        notes: "Account Opening Balance",
        rawTimestamp: new Date(openDate).getTime(),
      });
    }

    customerInvoices.forEach((inv) => {
      if (inv.billType === "raw" && inv.convertedToInvoiceId) return; // Prevent double debit
      if (filterType === "gst" && inv.billType === "raw") return;
      if (filterType === "raw" && inv.billType !== "raw") return;

      const normDate =
        normalizeDateToYMD(inv.date) || normalizeDateToYMD(inv.createdAt) || "";
      const timestamp = normDate
        ? new Date(normDate).getTime()
        : new Date(inv.createdAt || 0).getTime();

      rawEntries.push({
        id: inv.id,
        date: inv.date,
        normalizedDate: normDate,
        type: "INVOICE",
        billType: inv.billType === "raw" ? "raw" : "gst",
        reference: inv.invoiceNo,
        debit: inv.grandTotal,
        credit: 0,
        notes:
          inv.billType === "raw"
            ? `Raw Bill (${inv.items.length} items, Qty: ${inv.totalQuantity})`
            : `Tax Invoice (${inv.items.length} items, Qty: ${inv.totalQuantity})`,
        rawTimestamp: isNaN(timestamp) ? 0 : timestamp,
      });
    });

    customerPayments.forEach((p) => {
      const normDate =
        normalizeDateToYMD(p.paymentDate) || normalizeDateToYMD(p.createdAt) || "";
      const timestamp = normDate
        ? new Date(normDate).getTime()
        : new Date(p.createdAt || 0).getTime();

      rawEntries.push({
        id: p.id,
        date: p.paymentDate,
        normalizedDate: normDate,
        type: "PAYMENT",
        reference: p.referenceNo || p.invoiceNo || "Payment",
        debit: 0,
        credit: p.amount,
        notes: `${p.paymentMode} received`,
        rawTimestamp: isNaN(timestamp) ? 0 : timestamp,
      });
    });

    rawEntries.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    let cumulative = 0;
    return rawEntries.map((item) => {
      cumulative += item.debit - item.credit;
      return {
        ...item,
        balance: Math.round(cumulative * 100) / 100,
      };
    });
  }, [customer, customerInvoices, customerPayments, filterType]);

  // Filter for the selected month or all period
  const { monthEntries, openingForPeriod, periodDebit, periodCredit, closingBalance, periodLabel } = useMemo(() => {
    if (selectedMonth === "ALL") {
      const open = customer?.openingBalance || 0;
      const deb = fullLedger.reduce((s, e) => s + (e.type !== "OPENING" ? e.debit : 0), 0);
      const cred = fullLedger.reduce((s, e) => s + e.credit, 0);
      const close = open + deb - cred;
      return {
        monthEntries: fullLedger,
        openingForPeriod: open,
        periodDebit: deb,
        periodCredit: cred,
        closingBalance: close,
        periodLabel: "All Transactions (Complete Financial Period)",
      };
    }

    // Determine start of month date string: e.g. "2026-04-01"
    const startOfMonth = `${selectedMonth}-01`;
    const [y, m] = selectedMonth.split("-");
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    const monthName = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });

    // Calculate opening balance before this month
    let openingBeforeMonth = 0;
    for (const entry of fullLedger) {
      if (entry.normalizedDate && entry.normalizedDate < startOfMonth) {
        openingBeforeMonth += entry.debit - entry.credit;
      }
    }

    // Entries in this month
    const inMonth = fullLedger.filter(
      (e) =>
        e.normalizedDate &&
        e.normalizedDate.startsWith(selectedMonth) &&
        e.type !== "OPENING"
    );

    let deb = 0;
    let cred = 0;
    inMonth.forEach((e) => {
      deb += e.debit;
      cred += e.credit;
    });

    const close = openingBeforeMonth + deb - cred;

    return {
      monthEntries: inMonth,
      openingForPeriod: Math.round(openingBeforeMonth * 100) / 100,
      periodDebit: Math.round(deb * 100) / 100,
      periodCredit: Math.round(cred * 100) / 100,
      closingBalance: Math.round(close * 100) / 100,
      periodLabel: `Statement for ${monthName}`,
    };
  }, [fullLedger, selectedMonth, customer]);

  const handleDownloadPDF = async () => {
    if (!printRef.current || !customer) return;
    setIsDownloading(true);
    try {
      const sanitizedName = customer.businessName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Ledger_${sanitizedName}_${selectedMonth}.pdf`;
      await downloadInvoicePDF(printRef.current, filename);
      toast.success(`✓ Downloaded Monthly Ledger for ${customer.businessName}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate ledger PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!printRef.current || !customer) return;
    setIsSharingWhatsApp(true);
    try {
      const sanitizedName = customer.businessName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Ledger_${sanitizedName}_${selectedMonth}.pdf`;
      const res = await shareLedgerPDFOnWhatsApp({
        elementIdOrRef: printRef.current,
        customerName: customer.businessName,
        customerMobile: customer.mobile,
        periodLabel: periodLabel,
        closingBalance: closingBalance,
        companyName: settings.companyName,
        filename,
      });

      if (res.sharedVia === "native_share") {
        toast.success(`✓ Monthly Ledger PDF shared on WhatsApp!`);
      } else {
        if (res.copiedMobile) {
          toast.success(`📋 Mobile ${res.copiedMobile} copied! Paste (Ctrl+V) in WhatsApp search bar to open chat & attach ${res.filename}`);
        } else {
          toast.success(`✓ ${res.filename} downloaded! Attach the PDF into WhatsApp chat.`);
        }
      }
    } catch (err: any) {
      console.error("Ledger WhatsApp share error:", err);
      toast.error(err?.message || "Failed to generate Ledger PDF for WhatsApp");
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      printInvoiceElement(printRef.current);
    } else {
      window.print();
    }
  };

  const handleExportCSV = () => {
    if (!customer) return;
    const headers = ["Date", "Type", "Reference", "Description", "Debit (INR)", "Credit (INR)", "Running Balance (INR)"];
    const rows: string[][] = [headers];

    // Opening row
    rows.push([
      selectedMonth === "ALL" ? (customer.createdAt?.split("T")[0] || "2026-04-01") : `${selectedMonth}-01`,
      "OPENING",
      "Opening Balance",
      `Opening Balance for period`,
      openingForPeriod > 0 ? openingForPeriod.toFixed(2) : "0.00",
      "0.00",
      openingForPeriod.toFixed(2),
    ]);

    monthEntries.forEach((e) => {
      rows.push([
        e.date,
        e.type,
        `"${e.reference}"`,
        `"${e.notes}"`,
        e.debit > 0 ? e.debit.toFixed(2) : "0.00",
        e.credit > 0 ? e.credit.toFixed(2) : "0.00",
        e.balance.toFixed(2),
      ]);
    });

    // Closing row
    rows.push([
      "CLOSING",
      "BALANCE",
      "Net Closing Outstanding",
      `Closing Balance as of ${periodLabel}`,
      "0.00",
      "0.00",
      closingBalance.toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedName = customer.businessName.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("download", `Ledger_${sanitizedName}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("✓ Exported Ledger CSV successfully!");
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-border shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>Customer Monthly Ledger &amp; Statement</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {customer.businessName} &bull; GSTIN: {customer.gstin || "Unregistered"} &bull; {customer.city}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs gap-1 cursor-pointer border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Excel CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </Button>
              <Button
                size="sm"
                onClick={handleWhatsAppShare}
                disabled={isSharingWhatsApp}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
                title="Share Monthly Ledger PDF on WhatsApp"
              >
                {isSharingWhatsApp ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-border text-xs">
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span>Select Statement Month</span>
            </Label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 w-full h-8 px-2.5 rounded border border-border bg-white dark:bg-zinc-900 font-semibold text-xs text-foreground cursor-pointer"
            >
              {availableMonths.map((mStr) => {
                const [y, m] = mStr.split("-");
                const d = new Date(Number(y), Number(m) - 1, 1);
                const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
                return (
                  <option key={mStr} value={mStr}>
                    {label} ({mStr})
                  </option>
                );
              })}
              <option value="ALL">All Transactions (Full History)</option>
            </select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-purple-600" />
              <span>Bill Hierarchy</span>
            </Label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="mt-1 w-full h-8 px-2.5 rounded border border-border bg-white dark:bg-zinc-900 font-medium text-xs text-foreground cursor-pointer"
            >
              <option value="all">All Transactions (GST + Raw Bills + Payments)</option>
              <option value="gst">GST Tax Invoices &amp; Payments Only</option>
              <option value="raw">Raw Non-GST Bills &amp; Payments Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-right w-full">
              <span className="text-[10px] text-muted-foreground block">Period Closing Outstanding</span>
              <span className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatINR(closingBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Period Opening</span>
            <div className="text-sm font-mono font-bold text-foreground mt-0.5">
              {formatINR(openingForPeriod)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Billed (Debit)</span>
            <div className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              +{formatINR(periodDebit)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Paid (Credit)</span>
            <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              -{formatINR(periodCredit)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-2xs">
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold uppercase">Closing Balance</span>
            <div className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300 mt-0.5">
              {formatINR(closingBalance)}
            </div>
          </div>
        </div>

        {/* Printable Pristine Ledger Sheet */}
        <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
          <div
            ref={printRef}
            id="customer-monthly-ledger-print"
            className="p-6 bg-white text-zinc-900 font-sans text-xs space-y-4"
            style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}
          >
            {/* Header with Business Information */}
            <div className="flex justify-between items-start border-b-2 border-purple-800 pb-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-purple-950 uppercase">
                  {settings.companyName || "DHARMI THREAD & JARI"}
                </h2>
                <p className="text-[10px] text-zinc-600 font-medium">
                  {settings.address}, {settings.city} - {settings.pincode}, {settings.state} ({settings.stateCode})
                </p>
                <p className="text-[10px] text-zinc-600">
                  <span className="font-semibold">GSTIN:</span> {settings.gstin} | <span className="font-semibold">Mo:</span> {settings.phone || settings.phoneAlt}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-purple-900 text-white font-bold text-[11px] uppercase tracking-wider rounded">
                  Statement of Accounts
                </span>
                <p className="text-[10px] font-bold text-zinc-800 mt-1">
                  {periodLabel}
                </p>
                <p className="text-[9px] text-zinc-500">
                  Generated: {new Date().toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>

            {/* Customer Box & Statement Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-50 rounded border border-zinc-200 text-[11px]">
              <div>
                <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Customer / Account Holder
                </span>
                <div className="font-bold text-sm text-zinc-950 uppercase mt-0.5">
                  {customer.businessName}
                </div>
                {customer.tradeName && customer.tradeName !== customer.businessName && (
                  <div className="text-[10px] text-zinc-600">Trade: {customer.tradeName}</div>
                )}
                {customer.legalName && (
                  <div className="text-[10px] text-zinc-600">Legal: {customer.legalName}</div>
                )}
                <div className="text-[10px] text-zinc-700 mt-1">
                  {customer.address}, {customer.city} ({customer.state})
                </div>
                <div className="text-[10px] font-mono font-semibold text-purple-900 mt-0.5">
                  GSTIN: {customer.gstin || "Unregistered"} | Mo: {customer.mobile}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-zinc-500">Opening Balance:</span>
                  <span className="font-mono font-semibold">{formatINR(openingForPeriod)}</span>
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-zinc-500">Total Billed (+):</span>
                  <span className="font-mono font-semibold text-purple-900">+{formatINR(periodDebit)}</span>
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-zinc-500">Total Paid (-):</span>
                  <span className="font-mono font-semibold text-emerald-800">-{formatINR(periodCredit)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-zinc-300">
                  <span className="text-zinc-900">Closing Balance:</span>
                  <span className="font-mono text-amber-900 font-bold">{formatINR(closingBalance)}</span>
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-purple-950 text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-2 w-20">Date</th>
                    <th className="p-2 w-24">Type</th>
                    <th className="p-2 w-28">Reference</th>
                    <th className="p-2">Description / Particulars</th>
                    <th className="p-2 w-24 text-right">Debit (₹)</th>
                    <th className="p-2 w-24 text-right">Credit (₹)</th>
                    <th className="p-2 w-28 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {/* Period Opening Row */}
                  <tr className="bg-purple-50/70 font-semibold text-zinc-900">
                    <td className="p-2 font-mono">
                      {selectedMonth === "ALL" ? (customer.createdAt?.split("T")[0] || "2026-04-01") : `${selectedMonth}-01`}
                    </td>
                    <td className="p-2 uppercase text-purple-900">OPENING</td>
                    <td className="p-2 font-mono">-</td>
                    <td className="p-2 text-zinc-700 italic">Balance brought forward</td>
                    <td className="p-2 text-right font-mono">{openingForPeriod > 0 ? formatINR(openingForPeriod) : "-"}</td>
                    <td className="p-2 text-right font-mono">-</td>
                    <td className="p-2 text-right font-mono font-bold text-purple-950">{formatINR(openingForPeriod)}</td>
                  </tr>

                  {monthEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-zinc-500 italic">
                        No transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    monthEntries.map((entry, idx) => (
                      <tr
                        key={`${entry.id}_${idx}`}
                        className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                      >
                        <td className="p-2 font-mono text-zinc-700">{entry.date}</td>
                        <td className="p-2 font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              entry.type === "INVOICE"
                                ? entry.billType === "raw"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-purple-100 text-purple-900"
                                : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {entry.type === "INVOICE" ? (entry.billType === "raw" ? "RAW BILL" : "TAX INV") : "PAYMENT"}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-bold text-zinc-900">{entry.reference}</td>
                        <td className="p-2 text-zinc-600">{entry.notes}</td>
                        <td className="p-2 text-right font-mono font-semibold text-purple-950">
                          {entry.debit > 0 ? formatINR(entry.debit) : "-"}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-emerald-800">
                          {entry.credit > 0 ? formatINR(entry.credit) : "-"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-amber-900">
                          {formatINR(entry.balance)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Period Total Row */}
                  <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-400 text-zinc-950">
                    <td colSpan={4} className="p-2 text-right uppercase tracking-wider text-[10px]">
                      Period Totals &amp; Closing Outstanding:
                    </td>
                    <td className="p-2 text-right font-mono text-purple-950">{formatINR(periodDebit)}</td>
                    <td className="p-2 text-right font-mono text-emerald-900">{formatINR(periodCredit)}</td>
                    <td className="p-2 text-right font-mono text-amber-900 text-xs font-black">{formatINR(closingBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Notes & Bank Details */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-300 text-[10px]">
              <div>
                <span className="font-bold text-zinc-700 uppercase">Bank Details for Payment:</span>
                <p className="text-zinc-600 mt-0.5">
                  <span className="font-semibold">Bank:</span> {settings.bankName || "HDFC Bank Ltd"} | <span className="font-semibold">A/C:</span> {settings.accountNumber || "50200012345678"}
                </p>
                <p className="text-zinc-600">
                  <span className="font-semibold">IFSC:</span> {settings.ifscCode || "HDFC0000123"} | <span className="font-semibold">Branch:</span> {settings.branchName || "Ring Road, Surat"}
                </p>
                <p className="text-zinc-500 italic mt-1">
                  * Please verify all bills and report any discrepancy within 7 days.
                </p>
              </div>

              <div className="text-right flex flex-col justify-end items-end">
                <p className="text-[10px] font-bold text-zinc-800">For, {settings.companyName || "DHARMI THREAD & JARI"}</p>
                <div className="h-10"></div>
                <p className="text-[9px] text-zinc-500 border-t border-zinc-400 pt-0.5 w-40 text-center">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
