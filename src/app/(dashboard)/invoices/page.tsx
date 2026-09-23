"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BillingStore,
  Invoice,
  BusinessSettings,
  PaymentRecord,
} from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Printer,
  Share2,
  Copy,
  Eye,
  Trash2,
  CreditCard,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal";
import { toast } from "sonner";

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "gst" | "raw" | "raw_pending">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Invoice for Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMode, setPayMode] = useState<
    "Cash" | "Bank Transfer (RTGS/NEFT)" | "Cheque" | "UPI"
  >("Bank Transfer (RTGS/NEFT)");
  const [payRef, setPayRef] = useState<string>("");
  const [payDate, setPayDate] = useState<string>("");

  useEffect(() => {
    loadData();
    const unsubscribe = BillingStore.subscribe(loadData);
    const today = new Date().toISOString().split("T")[0];
    setPayDate(today);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setInvoices(BillingStore.getInvoices());
    setSettings(BillingStore.getSettings());
  };

  const handleDuplicate = (invoiceId: string) => {
    router.push(`/invoices/new?duplicateFrom=${invoiceId}`);
  };

  const handleDelete = (id: string, invoiceNo: string) => {
    if (confirm(`Are you sure you want to delete invoice ${invoiceNo}?`)) {
      BillingStore.deleteInvoice(id);
      loadData();
      toast.success(`Invoice ${invoiceNo} deleted`);
    }
  };

  const handleOpenPayment = (inv: Invoice) => {
    setPayingInvoice(inv);
    setPayAmount(String(inv.remainingAmount || inv.grandTotal));
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = () => {
    if (!payingInvoice) return;
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const record: PaymentRecord = {
      id: `pay_${Date.now()}`,
      invoiceId: payingInvoice.id,
      invoiceNo: payingInvoice.invoiceNo,
      customerId: payingInvoice.customerId,
      customerName: payingInvoice.customerName,
      amount: amountNum,
      paymentMode: payMode,
      referenceNo: payRef.trim(),
      paymentDate: payDate,
      notes: `Payment for Invoice ${payingInvoice.invoiceNo}`,
      createdAt: new Date().toISOString(),
    };

    BillingStore.recordPayment(record);
    loadData();
    setIsPaymentModalOpen(false);
    toast.success(`Payment of ${formatINR(amountNum)} recorded successfully!`);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (inv.customerGstin &&
          inv.customerGstin.toLowerCase().includes(search.toLowerCase()));

      const isRaw = inv.billType === "raw";
      const isConverted = !!inv.convertedToInvoiceId;
      
      let matchType = true;
      if (typeFilter === "gst") {
        matchType = !isRaw;
      } else if (typeFilter === "raw") {
        matchType = isRaw;
      } else if (typeFilter === "raw_pending") {
        matchType = isRaw && !isConverted;
      }

      const matchStatus =
        statusFilter === "all" || inv.paymentStatus === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [invoices, search, typeFilter, statusFilter]);

  // Totals - Exclude converted raw bills to avoid double counting
  const stats = useMemo(() => {
    const totalBills = invoices.length;
    const rawBills = invoices.filter((i) => i.billType === "raw");
    const rawPending = rawBills.filter((i) => !i.convertedToInvoiceId);
    const gstBills = invoices.filter((i) => i.billType !== "raw");

    // Active bills: omit raw bills that have already been converted into a GST bill
    const activeBills = invoices.filter(
      (i) => !(i.billType === "raw" && i.convertedToInvoiceId)
    );
    const totalAmount = activeBills.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = activeBills.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalPending = activeBills.reduce((s, i) => s + (i.remainingAmount || 0), 0);

    return {
      totalBills,
      gstBillsCount: gstBills.length,
      rawBillsCount: rawBills.length,
      rawPendingCount: rawPending.length,
      totalAmount,
      totalPaid,
      totalPending,
    };
  }, [invoices]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Invoices & Bills</span>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-800 rounded-md">
              {invoices.length} Total
            </Badge>
            {stats.rawPendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium border-amber-200 dark:border-amber-800 rounded-md">
                {stats.rawPendingCount} Pending Raw
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage official GST invoices, non-GST raw bills, duplicate, print, and track balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-10 px-3.5 rounded-md border-amber-300 dark:border-amber-700/60 bg-amber-50/50 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm"
          >
            <Link href="/invoices/new?billType=raw" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>New Raw Bill</span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-10 px-4 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] text-xs sm:text-sm"
          >
            <Link href="/invoices/new" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Create GST Bill</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Total Invoices
            </span>
            <div className="text-xl font-semibold text-foreground mt-1">
              {stats.totalBills}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              FY 2026-27
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Total Billed
            </span>
            <div className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {formatINR(stats.totalAmount)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Tax inclusive
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Collected
            </span>
            <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(stats.totalPaid)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Bank / Cash
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Pending Payments
            </span>
            <div className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(stats.totalPending)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Outstanding Udhar
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice number, customer name, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 rounded-md"
              />
            </div>

            {/* Bill Type Filter Tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(
                [
                  { id: "all", label: "All Bills", count: stats.totalBills },
                  { id: "gst", label: "GST Invoices", count: stats.gstBillsCount },
                  { id: "raw_pending", label: "Pending Raw Bills", count: stats.rawPendingCount },
                  { id: "raw", label: "All Raw Bills", count: stats.rawBillsCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    typeFilter === tab.id
                      ? "bg-purple-600 text-white shadow-xs font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      typeFilter === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status Secondary Filter */}
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-medium text-muted-foreground">Payment:</span>
            {(
              [
                { id: "all", label: "All Statuses" },
                { id: "paid", label: "Paid" },
                { id: "partial", label: "Partial" },
                { id: "unpaid", label: "Unpaid" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3 w-36">Invoice / Bill No</th>
                  <th className="p-3 w-24">Date</th>
                  <th className="p-3 min-w-[200px]">Customer Name</th>
                  <th className="p-3 w-28 text-right">Net Wt</th>
                  <th className="p-3 w-32 text-right">Total (₹)</th>
                  <th className="p-3 w-28 text-center">Payment</th>
                  <th className="p-3 w-56 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-[#121016] transition-colors"
                    >
                      <td className="p-3 font-mono">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            {inv.invoiceNo}
                          </span>
                          {inv.billType === "raw" ? (
                            inv.convertedToInvoiceId ? (
                              <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 text-[9px] px-1.5 py-0">
                                Raw (Converted)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[9px] px-1.5 py-0 font-semibold">
                                Raw Bill
                              </Badge>
                            )
                          ) : inv.sourceRawBillIds && inv.sourceRawBillIds.length > 0 ? (
                            <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 text-[9px] px-1.5 py-0 font-medium">
                              From {inv.sourceRawBillIds.length} Raw Bills
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                              GST Invoice
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-normal text-muted-foreground">
                        {inv.date}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/customers/${inv.customerId}`}
                          className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400 block uppercase"
                        >
                          {inv.customerName}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {inv.customerGstin || "Unregistered"} &bull; {inv.customerCity}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {formatNumber(inv.totalQuantity, 3)} KG
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase ${inv.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : inv.paymentStatus === "partial"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800"
                            }`}
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Convert if unconverted raw bill */}
                          {inv.billType === "raw" && !inv.convertedToInvoiceId && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-950 dark:text-amber-300 rounded-md"
                              title="Convert this Raw Bill into official GST Tax Invoice"
                            >
                              <Link href={`/invoices/new?convertRawBills=${inv.id}&customerId=${inv.customerId}`}>
                                <span>GST Bill</span>
                              </Link>
                            </Button>
                          )}
                          {/* Preview / View */}
                          <Button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPreviewOpen(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-md"
                            title="Preview & Print Bill"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>View</span>
                          </Button>

                          {/* Duplicate / Repeat Invoice */}
                          <Button
                            onClick={() => handleDuplicate(inv.id)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs font-medium border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md"
                            title="Duplicate Bill (Creates next invoice with same items)"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span>Repeat</span>
                          </Button>

                          {/* Record Payment */}
                          {inv.paymentStatus !== "paid" && (
                            <Button
                              onClick={() => handleOpenPayment(inv)}
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-md"
                              title="Record Payment for this invoice"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              <span>Pay</span>
                            </Button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(inv.id, inv.invoiceNo)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete invoice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={selectedInvoice}
        settings={settings}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Record Payment - {payingInvoice?.invoiceNo}</span>
            </DialogTitle>
          </DialogHeader>

          {payingInvoice && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-md bg-zinc-50 dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold uppercase">
                    {payingInvoice.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Bill Amount:</span>
                  <span className="font-mono font-semibold">
                    {formatINR(payingInvoice.grandTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    {formatINR(payingInvoice.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#ececee] dark:border-[#2d2f39] pt-1 font-semibold">
                  <span>Remaining Due:</span>
                  <span className="font-mono text-amber-600">
                    {formatINR(
                      payingInvoice.remainingAmount || payingInvoice.grandTotal
                    )}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Mode</Label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  className="w-full h-9 mt-1 rounded-lg border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-3 font-semibold text-xs"
                >
                  <option value="Bank Transfer (RTGS/NEFT)">
                    Bank Transfer (RTGS/NEFT)
                  </option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold">Reference / Cheque No</Label>
                  <Input
                    placeholder="e.g. UTR / CHQ-1234"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Payment Date</Label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleRecordPaymentSubmit}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirm & Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
