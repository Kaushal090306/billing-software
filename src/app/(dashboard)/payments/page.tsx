"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BillingStore,
  PaymentRecord,
  Customer,
  Invoice,
} from "@/lib/store";
import { formatINR, formatDate } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>("");

  // Record Payment Modal
  const [isOpen, setIsOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<
    "Cash" | "Bank Transfer (RTGS/NEFT)" | "Cheque" | "UPI"
  >("Bank Transfer (RTGS/NEFT)");
  const [refNo, setRefNo] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
    const unsubscribe = BillingStore.subscribe(loadData);
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setPayments(BillingStore.getPayments());
    setCustomers(BillingStore.getCustomers());
    setInvoices(BillingStore.getInvoices());
  };

  const handleRecordPayment = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const cust = customers.find((c) => c.id === customerId);
    const inv = invoices.find((i) => i.id === invoiceId);

    const record: PaymentRecord = {
      id: `pay_${Date.now()}`,
      customerId,
      customerName: cust ? cust.businessName : "CUSTOMER",
      invoiceId: invoiceId || undefined,
      invoiceNo: inv ? inv.invoiceNo : undefined,
      amount: amtNum,
      paymentMode: mode,
      referenceNo: refNo.trim(),
      paymentDate: date,
      notes: notes.trim() || `Payment received via ${mode}`,
      createdAt: new Date().toISOString(),
    };

    BillingStore.recordPayment(record);
    loadData();
    setIsOpen(false);
    setAmount("");
    setRefNo("");
    setNotes("");
    toast.success(`Recorded payment of ${formatINR(amtNum)}!`);
  };

  const totalCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce(
      (sum, c) => sum + BillingStore.getCustomerBalance(c.id).currentBalance,
      0
    );
  }, [customers, invoices, payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(
      (p) =>
        p.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [payments, search]);

  const custPendingInvoices = useMemo(() => {
    if (!customerId) return [];
    return invoices.filter(
      (i) => i.customerId === customerId && i.paymentStatus !== "paid"
    );
  }, [invoices, customerId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Payments & Udhar Ledger</span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium border-emerald-200 rounded-md">
              {payments.length} Transactions
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track customer balances, settlements, cheque logs, and Bank RTGS receipts
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Record Payment</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Record Customer Payment</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-semibold">Select Customer *</Label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setInvoiceId("");
                  }}
                  className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-3 font-medium text-xs uppercase"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => {
                    const bal = BillingStore.getCustomerBalance(c.id).currentBalance;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.businessName} (Bal: {formatINR(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {customerId && custPendingInvoices.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Apply Against Invoice (Optional)</Label>
                  <select
                    value={invoiceId}
                    onChange={(e) => {
                      setInvoiceId(e.target.value);
                      const inv = invoices.find((i) => i.id === e.target.value);
                      if (inv) {
                        setAmount(String(inv.remainingAmount || inv.grandTotal));
                      }
                    }}
                    className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-3 font-medium text-xs"
                  >
                    <option value="">-- On Account (Customer Balance) --</option>
                    {custPendingInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} (Due: {formatINR(inv.remainingAmount || inv.grandTotal)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">Amount Received (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 font-mono font-semibold text-sm rounded-md"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-3 font-medium text-xs"
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
                  <Label className="text-xs font-semibold">Reference / UTR / Cheque</Label>
                  <Input
                    placeholder="Ref number"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="mt-1 font-mono text-xs rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Payment Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 text-xs rounded-md"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  placeholder="e.g. Paid in full via Kotak Bank"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 rounded-md"
                />
              </div>

              <Button
                onClick={handleRecordPayment}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md"
              >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                Total Collections Received
              </span>
              <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatINR(totalCollected)}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Across {payments.length} transactions
              </span>
            </div>
            <div className="h-12 w-12 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                Total Customer Outstanding (Udhar)
              </span>
              <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {formatINR(totalOutstanding)}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Unsettled balance across all buyers
              </span>
            </div>
            <div className="h-12 w-12 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, invoice, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Transactions Table */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 min-w-[200px]">Customer Name</th>
                  <th className="p-3 w-32">Invoice #</th>
                  <th className="p-3 w-36">Payment Mode</th>
                  <th className="p-3 w-36">Reference / UTR</th>
                  <th className="p-3 min-w-[180px]">Notes</th>
                  <th className="p-3 w-32 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-[#121016] transition-colors"
                  >
                    <td className="p-3 font-medium text-muted-foreground font-normal">
                      {p.paymentDate}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/customers/${p.customerId}`}
                        className="font-semibold text-foreground hover:text-purple-600 block uppercase"
                      >
                        {p.customerName}
                      </Link>
                    </td>
                    <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                      {p.invoiceNo || "On Account"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium rounded-md"
                      >
                        {p.paymentMode}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground font-normal">
                      {p.referenceNo || "-"}
                    </td>
                    <td className="p-3 text-muted-foreground font-normal">{p.notes || "-"}</td>
                    <td className="p-3 text-right font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
