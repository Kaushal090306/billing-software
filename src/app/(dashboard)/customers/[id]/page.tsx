"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BillingStore,
  Customer,
  Invoice,
  PaymentRecord,
  CustomerRateMemory,
  BusinessSettings,
  Product,
} from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Printer,
  Share2,
  FileText,
  CreditCard,
  History,
  Building2,
  Phone,
  Eye,
  Copy,
  Pencil,
  MapPin,
  Mail,
} from "lucide-react";
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal";
import { toast } from "sonner";

const GST_STATE_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [rateMemories, setRateMemories] = useState<CustomerRateMemory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );

  // Selected Invoice Preview
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Record Payment Modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<
    "Cash" | "Bank Transfer (RTGS/NEFT)" | "Cheque" | "UPI"
  >("Bank Transfer (RTGS/NEFT)");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState("");

  // Edit Customer Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("Surat");
  const [editState, setEditState] = useState("Gujarat");
  const [editStateCode, setEditStateCode] = useState("24");
  const [editPincode, setEditPincode] = useState("395002");
  const [editOpeningBalance, setEditOpeningBalance] = useState("0");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    loadData();
    const today = new Date().toISOString().split("T")[0];
    setPayDate(today);
  }, [id]);

  const loadData = () => {
    const cust = BillingStore.getCustomerById(id);
    if (cust) {
      setCustomer(cust);
      setInvoices(BillingStore.getInvoicesByCustomer(cust.id));
      setPayments(BillingStore.getPaymentsByCustomer(cust.id));
      setRateMemories(
        BillingStore.getCustomerRates().filter((r) => r.customerId === cust.id)
      );
    }
    setProducts(BillingStore.getProducts());
    setSettings(BillingStore.getSettings());
  };

  const handleOpenEdit = () => {
    if (!customer) return;
    setEditName(customer.businessName || "");
    setEditContact(customer.contactPerson || "");
    setEditGstin(customer.gstin || "");
    setEditMobile(customer.mobile || "");
    setEditEmail(customer.email || "");
    setEditAddress(customer.address || "");
    setEditCity(customer.city || "Surat");
    setEditState(customer.state || "Gujarat");
    setEditStateCode(customer.stateCode || "24");
    setEditPincode(customer.pincode || "395002");
    setEditOpeningBalance(String(customer.openingBalance ?? 0));
    setEditNotes(customer.notes || "");
    setIsEditOpen(true);
  };

  const handleEditGstinChange = (value: string) => {
    const val = value.toUpperCase();
    setEditGstin(val);
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      if (GST_STATE_MAP[code]) {
        setEditStateCode(code);
        setEditState(GST_STATE_MAP[code]);
      }
    }
  };

  const handleSaveCustomerEdit = () => {
    if (!customer) return;
    if (!editName.trim() || !editMobile.trim()) {
      toast.error("Please enter Business / Firm Name and Mobile Number");
      return;
    }

    const opBal = parseFloat(editOpeningBalance) || 0;
    const cleanGstin = editGstin.trim().toUpperCase();
    const pan = cleanGstin.length >= 10 ? cleanGstin.substring(2, 12) : "";

    const oldOpBal = customer.openingBalance || 0;
    const opBalDiff = opBal - oldOpBal;
    const newCurrentBal = (customer.currentBalance || 0) + opBalDiff;

    const updatedCust: Customer = {
      ...customer,
      businessName: editName.trim().toUpperCase(),
      contactPerson: editContact.trim() || editName.trim().toUpperCase(),
      gstin: cleanGstin,
      pan: pan,
      address: editAddress.trim().toUpperCase(),
      city: editCity.trim().toUpperCase(),
      state: editState.trim(),
      stateCode: editStateCode.trim(),
      pincode: editPincode.trim() || "395002",
      mobile: editMobile.trim(),
      email: editEmail.trim(),
      openingBalance: opBal,
      currentBalance: newCurrentBal,
      notes: editNotes.trim(),
    };

    BillingStore.saveCustomer(updatedCust);
    loadData();
    setIsEditOpen(false);
    toast.success(`Customer "${updatedCust.businessName}" updated successfully!`);
  };

  const handleRecordPaymentSubmit = () => {
    if (!customer) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const pay: PaymentRecord = {
      id: `pay_${Date.now()}`,
      customerId: customer.id,
      customerName: customer.businessName,
      amount: amt,
      paymentMode: payMode,
      referenceNo: payRef.trim(),
      paymentDate: payDate,
      notes: `Payment for ${customer.businessName}`,
      createdAt: new Date().toISOString(),
    };

    BillingStore.recordPayment(pay);
    loadData();
    setIsPayOpen(false);
    setPayAmount("");
    setPayRef("");
    toast.success(`Recorded payment of ${formatINR(amt)}!`);
  };

  // Financial Stats
  const totalBilled = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = (customer?.openingBalance || 0) + totalBilled - totalPaid;

  // Combined Ledger Timeline with Running Balance Calculation
  const ledgerEntries = useMemo(() => {
    if (!customer) return [];
    const rawEntries: Array<{
      id: string;
      date: string;
      type: "OPENING" | "INVOICE" | "PAYMENT";
      reference: string;
      debit: number;
      credit: number;
      notes: string;
      rawTimestamp: number;
    }> = [];

    if ((customer.openingBalance || 0) > 0) {
      const openDate = customer.createdAt ? customer.createdAt.split("T")[0] : "2026-04-01";
      rawEntries.push({
        id: "opening",
        date: openDate,
        type: "OPENING",
        reference: "Opening Balance",
        debit: customer.openingBalance,
        credit: 0,
        notes: "Account opening balance",
        rawTimestamp: new Date(customer.createdAt || "2026-04-01").getTime(),
      });
    }

    invoices.forEach((inv) => {
      rawEntries.push({
        id: inv.id,
        date: inv.date,
        type: "INVOICE",
        reference: inv.invoiceNo,
        debit: inv.grandTotal,
        credit: 0,
        notes: `Tax Invoice (${inv.items.length} items)`,
        rawTimestamp: new Date(inv.createdAt || inv.date).getTime(),
      });
    });

    payments.forEach((p) => {
      rawEntries.push({
        id: p.id,
        date: p.paymentDate,
        type: "PAYMENT",
        reference: p.referenceNo || p.invoiceNo || "Payment",
        debit: 0,
        credit: p.amount,
        notes: `${p.paymentMode} received`,
        rawTimestamp: new Date(p.createdAt || p.paymentDate).getTime(),
      });
    });

    // Sort chronologically ascending to compute running cumulative balance
    rawEntries.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    let cumulative = 0;
    return rawEntries.map((item) => {
      cumulative += item.debit - item.credit;
      return {
        ...item,
        balance: Math.round(cumulative * 100) / 100,
      };
    });
  }, [customer, invoices, payments]);

  if (!customer) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Customer Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground uppercase">
              {customer.businessName}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>GSTIN: <strong className="font-mono text-foreground font-semibold">{customer.gstin || "Unregistered"}</strong></span>
              <span>&bull;</span>
              <span>Mo: <strong className="font-mono text-foreground font-semibold">{customer.mobile}</strong></span>
              <span>&bull;</span>
              <span>{customer.city}, {customer.state}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenEdit}
            variant="outline"
            className="h-10 px-4 rounded-md border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold text-xs sm:text-sm cursor-pointer"
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            <span>Edit Customer</span>
          </Button>

          <Button
            onClick={() => setIsPayOpen(true)}
            variant="outline"
            className="h-10 px-4 rounded-md border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs sm:text-sm cursor-pointer"
          >
            <CreditCard className="h-4 w-4 mr-1.5" />
            <span>Record Payment</span>
          </Button>

          <Button
            asChild
            className="h-10 px-4 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md text-xs sm:text-sm"
          >
            <Link href={`/invoices/new?customerId=${customer.id}`}>
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create Bill</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Total Invoices
            </span>
            <div className="text-2xl font-semibold text-foreground mt-1">
              {invoices.length} Bills
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Stored in repository
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase">
              Total Billed
            </span>
            <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {formatINR(totalBilled)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Lifetime sales
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Payments
            </span>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(totalPaid)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Received to date
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Current Outstanding
            </span>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(outstanding)}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Net Udhar Balance
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Customer-Wise Invoices Store, Ledger, Rate Memory */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-md">
          <TabsTrigger
            value="invoices"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            <span>Customer Invoices Store ({invoices.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="ledger"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            <span>Udhar / Account Ledger</span>
          </TabsTrigger>
          <TabsTrigger
            value="rates"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            <span>Rate Memory ({rateMemories.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Customer-Wise Invoices Store */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Invoices Generated for {customer.businessName}
              </CardTitle>
              <Button
                asChild
                size="sm"
                className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md"
              >
                <Link href={`/invoices/new?customerId=${customer.id}`}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span>New Bill</span>
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 w-28">Bill No</th>
                      <th className="p-3 w-24">Date</th>
                      <th className="p-3 min-w-[200px]">Line Items Summary</th>
                      <th className="p-3 w-28 text-right">Net Wt</th>
                      <th className="p-3 w-32 text-right">Bill Total (₹)</th>
                      <th className="p-3 w-24 text-center">Status</th>
                      <th className="p-3 w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No invoices generated for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-zinc-50/50 dark:hover:bg-[#121016] transition-colors"
                        >
                          <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                            {inv.invoiceNo}
                          </td>
                          <td className="p-3 text-muted-foreground font-normal">{inv.date}</td>
                          <td className="p-3">
                            <div className="font-semibold text-foreground uppercase truncate max-w-xs">
                              {inv.items.map((it) => it.productName).join(", ")}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {inv.items.length} line items
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {formatNumber(inv.totalQuantity, 3)} KG
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-sm">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase ${inv.paymentStatus === "paid"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                                : inv.paymentStatus === "partial"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200"
                                }`}
                            >
                              {inv.paymentStatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsPreviewOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs font-semibold text-purple-600 rounded-md"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>View</span>
                              </Button>

                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs font-medium rounded-md"
                              >
                                <Link
                                  href={`/invoices/new?duplicateFrom=${inv.id}`}
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1" />
                                  <span>Repeat</span>
                                </Link>
                              </Button>
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
        </TabsContent>

        {/* 2. Udhar / Account Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Statement of Accounts & Payments Ledger
              </CardTitle>
              <Button
                onClick={() => setIsPayOpen(true)}
                size="sm"
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Record Payment</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 w-24">Date</th>
                      <th className="p-3 w-28">Type</th>
                      <th className="p-3 w-36">Reference / Bill</th>
                      <th className="p-3 min-w-[200px]">Description</th>
                      <th className="p-3 w-32 text-right">Debit (₹)</th>
                      <th className="p-3 w-32 text-right">Credit (₹)</th>
                      <th className="p-3 w-36 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No transactions recorded for this customer.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry, idx) => (
                        <tr
                          key={`${entry.id}_${idx}`}
                          className="hover:bg-zinc-50/50 dark:hover:bg-[#121016]"
                        >
                          <td className="p-3 font-medium text-muted-foreground">
                            {entry.date}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                entry.type === "INVOICE"
                                  ? "destructive"
                                  : entry.type === "PAYMENT"
                                    ? "secondary"
                                    : "outline"
                              }
                              className={`text-[10px] font-medium rounded-md uppercase ${entry.type === "PAYMENT"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : ""
                                }`}
                            >
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono font-semibold">{entry.reference}</td>
                          <td className="p-3 text-muted-foreground font-normal">{entry.notes}</td>
                          <td className="p-3 text-right font-mono font-semibold text-foreground">
                            {entry.debit > 0 ? formatINR(entry.debit) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {entry.credit > 0 ? formatINR(entry.credit) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {formatINR(entry.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Rate Memory */}
        <TabsContent value="rates" className="space-y-4">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
              <CardTitle className="text-sm font-semibold text-foreground">
                Customer Specific Rate History & Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 min-w-[200px]">Product Name</th>
                      <th className="p-3 w-28">HSN</th>
                      <th className="p-3 w-36 text-right">Last Billed Rate</th>
                      <th className="p-3 w-32">Last Invoice</th>
                      <th className="p-3 w-32">Billed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {rateMemories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No product rate memory recorded yet. Rate memory is automatically created when you generate bills for this customer.
                        </td>
                      </tr>
                    ) : (
                      rateMemories.map((rm) => {
                        const prod = products.find((p) => p.id === rm.productId);
                        return (
                          <tr key={rm.id} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-semibold uppercase text-foreground">
                              {prod?.name || "Product"}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">
                              {prod?.hsn || "-"}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                              ₹{formatNumber(rm.lastRate, 4)} / {prod?.unit || "KG"}
                            </td>
                            <td className="p-3 font-mono font-medium">
                              {rm.invoiceNo}
                            </td>
                            <td className="p-3 text-muted-foreground font-normal">
                              {rm.lastBilledDate}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={selectedInvoice}
        settings={settings}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Record Payment Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Record Payment for {customer.businessName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-md bg-zinc-50 dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] flex justify-between">
              <span className="text-muted-foreground font-medium">
                Current Outstanding Udhar:
              </span>
              <span className="font-mono font-semibold text-amber-600">
                {formatINR(outstanding)}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="Amount received"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 font-mono font-semibold text-sm rounded-md"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as any)}
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
                <Label className="text-xs font-semibold">Reference / Cheque No</Label>
                <Input
                  placeholder="e.g. UTR / CHQ-1234"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-1 font-mono text-xs rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Payment Date</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 text-xs rounded-md"
                />
              </div>
            </div>

            <Button
              onClick={handleRecordPaymentSubmit}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md cursor-pointer"
            >
              Save Payment & Update Balance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>Edit Customer Details</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-foreground">
                Business / Firm Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. SHREE MANGALAM THREAD & JARI"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 uppercase font-semibold h-9 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Contact Person</Label>
                <Input
                  placeholder="e.g. Ketan Bhai"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="97235 44545"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="mt-1 font-mono h-9 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>GSTIN</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Auto state extract</span>
                </Label>
                <Input
                  placeholder="24AEYPV3370E1Z1"
                  value={editGstin}
                  onChange={(e) => handleEditGstinChange(e.target.value)}
                  className="mt-1 font-mono uppercase font-semibold h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Opening Balance (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={editOpeningBalance}
                  onChange={(e) => setEditOpeningBalance(e.target.value)}
                  className="mt-1 font-mono h-9 rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Address</Label>
              <Input
                placeholder="Shop No.1, Jay Narayan Ind.-1, Anjana Farm"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="mt-1 uppercase h-9 rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold text-foreground">City</Label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="mt-1 uppercase h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">State</Label>
                <Input
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">State Code</Label>
                <Input
                  value={editStateCode}
                  onChange={(e) => setEditStateCode(e.target.value)}
                  className="mt-1 font-mono text-center h-9 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Pincode</Label>
                <Input
                  placeholder="395002"
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value)}
                  className="mt-1 font-mono h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="party@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Internal Notes / Ledger Remarks</Label>
              <Input
                placeholder="e.g. Regular buyer of Jari Kasab and Viscose Yarn"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-1 h-9 rounded-md"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="h-9 px-4 text-xs rounded-md cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCustomerEdit}
                className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-md shadow-xs cursor-pointer"
              >
                Update Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
