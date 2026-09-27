"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BillingStore, Customer, Invoice } from "@/lib/store";
import { formatINR } from "@/lib/billing-utils";
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
  Users,
  Plus,
  Search,
  FilePlus2,
  FileText,
  CreditCard,
  Mail,
  MapPin,
  Building2,
  Phone,
  ChevronRight,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  ClipboardPaste,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { OfficialGstModal } from "@/components/gst/official-gst-modal";
import { CustomerMonthlyLedgerModal } from "@/components/customer/customer-monthly-ledger-modal";

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>("");

  // Customer Add/Edit Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contact, setContact] = useState("");
  const [gstin, setGstin] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Surat");
  const [state, setState] = useState("Gujarat");
  const [stateCode, setStateCode] = useState("24");
  const [pincode, setPincode] = useState("395002");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");

  // Official GST Verification State
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstVerifiedData, setGstVerifiedData] = useState<any>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = BillingStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    BillingStore.recalculateAllCustomerBalances();
    setCustomers(BillingStore.getCustomers());
    setInvoices(BillingStore.getInvoices());
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName("");
    setTradeName("");
    setLegalName("");
    setContact("");
    setGstin("");
    setMobile("");
    setEmail("");
    setAddress("");
    setCity("Surat");
    setState("Gujarat");
    setStateCode("24");
    setPincode("395002");
    setOpeningBalance("0");
    setNotes("");
    setIsOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.businessName || "");
    setTradeName(cust.tradeName || cust.businessName || "");
    setLegalName(cust.legalName || cust.contactPerson || "");
    setContact(cust.contactPerson || "");
    setGstin(cust.gstin || "");
    setMobile(cust.mobile || "");
    setEmail(cust.email || "");
    setAddress(cust.address || "");
    setCity(cust.city || "Surat");
    setState(cust.state || "Gujarat");
    setStateCode(cust.stateCode || "24");
    setPincode(cust.pincode || "395002");
    setOpeningBalance(String(cust.openingBalance ?? 0));
    setNotes(cust.notes || "");
    setIsOpen(true);
  };

  const [isPastingGst, setIsPastingGst] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedGstText, setPastedGstText] = useState("");
  const [isOfficialModalOpen, setIsOfficialModalOpen] = useState(false);

  // Customer Monthly Ledger Modal
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const handleOpenOfficialGstPortal = () => {
    const clean = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(clean);
      }
      toast.success(`Copied GSTIN (${clean}) to clipboard! Opening official GST portal...`);
    } else {
      toast.info("Opening official GST portal (services.gst.gov.in)...");
    }
    window.open("https://services.gst.gov.in/services/searchtp", "_blank", "noopener,noreferrer");
  };

  const handleProcessPastedGst = async (textToParse: string) => {
    if (!textToParse.trim()) {
      toast.error("Please paste text from the official GST portal");
      return;
    }
    setIsPastingGst(true);
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: textToParse }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.gstin) setGstin(data.gstin);
        if (data.tradeName) setTradeName(data.tradeName);
        if (data.legalName) setLegalName(data.legalName);
        if (data.tradeName || data.businessName) setName(data.tradeName || data.businessName);
        if (data.legalName || data.contactPerson) setContact(data.legalName || data.contactPerson);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
        if (data.stateCode) setStateCode(data.stateCode);
        if (data.pincode) setPincode(data.pincode);
        setGstVerifiedData(data);
        setShowPasteBox(false);
        setPastedGstText("");
        toast.success(`✓ Official GST Details Extracted: ${data.tradeName || data.businessName || data.gstin}`);
      } else {
        toast.error(data.error || "Could not parse GST details from text");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process text");
    } finally {
      setIsPastingGst(false);
    }
  };

  const handleAutoLookupGstin = async (gstinToLookup: string) => {
    const clean = gstinToLookup.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 15) {
      toast.error("Please enter a full 15-digit GSTIN number");
      return;
    }
    // Open Official Live Portal Verification Modal
    setIsOfficialModalOpen(true);
  };

  const handleGstinChange = (value: string) => {
    const val = value.toUpperCase();
    setGstin(val);
    if (val.length >= 2) {
      const code = val.substring(0, 2);
      if (GST_STATE_MAP[code]) {
        setStateCode(code);
        setState(GST_STATE_MAP[code]);
      }
    }
    // Auto lookup when exact 15 alphanumeric characters are entered
    const clean = val.replace(/[^A-Z0-9]/g, "");
    if (clean.length === 15) {
      handleAutoLookupGstin(clean);
    } else {
      setGstVerifiedData(null);
    }
  };

  const handleSaveCustomer = () => {
    const effectiveTrade = tradeName.trim() || name.trim() || legalName.trim();
    if (!effectiveTrade || !mobile.trim()) {
      toast.error("Please enter Business / Trade Name and Mobile Number");
      return;
    }

    const opBal = parseFloat(openingBalance) || 0;
    const cleanGstin = gstin.trim().toUpperCase();
    const pan = cleanGstin.length >= 10 ? cleanGstin.substring(2, 12) : "";

    if (editingCustomer) {
      const updatedCust: Customer = {
        ...editingCustomer,
        businessName: effectiveTrade.toUpperCase(),
        tradeName: (tradeName.trim() || effectiveTrade).toUpperCase(),
        legalName: legalName.trim().toUpperCase(),
        contactPerson: contact.trim() || legalName.trim() || effectiveTrade.toUpperCase(),
        gstin: cleanGstin,
        pan: pan,
        address: address.trim().toUpperCase(),
        city: city.trim().toUpperCase(),
        state: state.trim(),
        stateCode: stateCode.trim(),
        pincode: pincode.trim() || "395010",
        mobile: mobile.trim(),
        email: email.trim(),
        openingBalance: opBal,
        notes: notes.trim(),
      };

      BillingStore.saveCustomer(updatedCust);
      BillingStore.recalculateCustomerBalance(updatedCust.id);
      loadData();
      setIsOpen(false);
      toast.success(`Customer "${updatedCust.businessName}" updated successfully!`);
    } else {
      const newCust: Customer = {
        id: `cust_${Date.now()}`,
        businessName: effectiveTrade.toUpperCase(),
        tradeName: (tradeName.trim() || effectiveTrade).toUpperCase(),
        legalName: legalName.trim().toUpperCase(),
        contactPerson: contact.trim() || legalName.trim() || effectiveTrade.toUpperCase(),
        gstin: cleanGstin,
        pan: pan,
        address: address.trim().toUpperCase(),
        city: city.trim().toUpperCase(),
        state: state.trim(),
        stateCode: stateCode.trim(),
        pincode: pincode.trim() || "395010",
        mobile: mobile.trim(),
        email: email.trim(),
        openingBalance: opBal,
        currentBalance: opBal,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      BillingStore.saveCustomer(newCust);
      BillingStore.recalculateCustomerBalance(newCust.id);
      loadData();
      setIsOpen(false);
      toast.success(`Customer "${newCust.businessName}" added successfully!`);
    }
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"? This will not delete previously generated invoices.`)) {
      BillingStore.deleteCustomer(id);
      loadData();
      toast.success(`Customer "${name}" removed from directory`);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.businessName.toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => {
      const bal = BillingStore.getCustomerBalance(c.id);
      return sum + bal.currentBalance;
    }, 0);
  }, [customers, invoices]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Customer Master & Ledgers</span>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold border-purple-200 dark:border-purple-800 rounded-md">
              {customers.length} Accounts
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage buyer profiles, edit GSTIN & addresses, track credit / udhar balances, and review customer ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Active Buyers
              </span>
              <div className="text-2xl font-bold text-foreground mt-1">
                {customers.length}
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Total Invoices Generated
              </span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {invoices.length} Bills
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                Total Customer Outstanding
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatINR(totalOutstanding)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <Card className="shadow-xs rounded-lg">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name, GSTIN, mobile, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Directory Table */}
      <Card className="shadow-xs overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-border text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3 min-w-[240px]">Customer / Business</th>
                  <th className="p-3 w-36">GSTIN</th>
                  <th className="p-3 w-32">Mobile</th>
                  <th className="p-3 w-36">City / State</th>
                  <th className="p-3 w-24 text-center">Bills</th>
                  <th className="p-3 w-32 text-right">Outstanding (₹)</th>
                  <th className="p-3 w-56 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No customers found matching &quot;{search}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const balanceInfo = BillingStore.getCustomerBalance(cust.id);
                    const billCount = balanceInfo.invoiceCount;
                    const balance = balanceInfo.currentBalance;
                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-[#121016] transition-colors"
                      >
                        <td className="p-3">
                          <Link
                            href={`/customers/${cust.id}`}
                            className="font-bold text-foreground hover:text-purple-600 dark:hover:text-purple-400 block uppercase"
                          >
                            {cust.businessName}
                          </Link>
                          {cust.contactPerson && cust.contactPerson !== cust.businessName && (
                            <span className="text-[11px] text-muted-foreground">
                              Attn: {cust.contactPerson}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                          {cust.gstin || "Unregistered"}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground font-normal">
                          {cust.mobile}
                        </td>
                        <td className="p-3 text-muted-foreground font-normal">
                          {cust.city}, {cust.state}
                          {cust.stateCode && (
                            <span className="text-[10px] ml-1 px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
                              ({cust.stateCode})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
                            {billCount}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-sm">
                          {balance > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatINR(balance)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ₹0.00
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Customer Details */}
                            <Button
                              onClick={() => handleOpenEdit(cust)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-md cursor-pointer"
                              title="Edit Customer Details"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              <span>Edit</span>
                            </Button>

                            {/* Monthly Ledger Statement */}
                            <Button
                              onClick={() => {
                                setSelectedLedgerCustomer(cust);
                                setIsLedgerModalOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs font-medium border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md cursor-pointer"
                              title="Download / View Monthly Statement & Ledger PDF"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                              <span>Ledger</span>
                            </Button>

                            {/* View Customer Details */}
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs font-medium border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 rounded-md"
                            >
                              <Link href={`/customers/${cust.id}`}>
                                <span>Profile</span>
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>

                            {/* Create Raw Bill for this Customer */}
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md"
                              title="Create Non-GST Raw Bill"
                            >
                              <Link href={`/invoices/new?customerId=${cust.id}&billType=raw`}>
                                <Plus className="h-3 w-3 mr-0.5" />
                                <span>Raw</span>
                              </Link>
                            </Button>

                            {/* Create GST Bill for this Customer */}
                            <Button
                              asChild
                              size="sm"
                              className="h-8 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-xs"
                              title="Create Official GST Tax Invoice"
                            >
                              <Link href={`/invoices/new?customerId=${cust.id}`}>
                                <Plus className="h-3 w-3 mr-0.5" />
                                <span>GST</span>
                              </Link>
                            </Button>

                            {/* Delete Customer */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(cust.id, cust.businessName)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Delete customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      {/* Customer Add / Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-border shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>{editingCustomer ? "Edit Customer Details" : "Add New Customer"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* GSTIN First with Auto-Fetch Badge */}
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span>GSTIN Number (Official Auto-Check)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenOfficialGstPortal}
                    className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-700 shadow-2xs"
                    title="Open official government portal (services.gst.gov.in/services/searchtp)"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 font-medium hover:underline cursor-pointer"
                  >
                    {showPasteBox ? "Hide Paste Tool" : "Paste from Portal"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 24ASVPG5889L1ZR"
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  className="font-mono uppercase font-bold text-xs h-9 bg-white dark:bg-zinc-900 border-purple-300 dark:border-purple-700 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAutoLookupGstin(gstin)}
                  disabled={isFetchingGst || !gstin || gstin.trim().length < 15}
                  className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5 cursor-pointer shrink-0"
                >
                  {isFetchingGst ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Auto Fetch</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Paste helper box if user copied taxpayer text from the official portal */}
              {showPasteBox && (
                <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-md border border-purple-200 dark:border-purple-700 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                    <span>Paste text or details copied from official GST Portal:</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clip = await navigator.clipboard.readText();
                          if (clip) {
                            setPastedGstText(clip);
                            handleProcessPastedGst(clip);
                          }
                        } catch {
                          toast.error("Clipboard permission denied. Please paste manually.");
                        }
                      }}
                      className="text-[10px] text-purple-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      <span>Paste from Clipboard</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={pastedGstText}
                    onChange={(e) => setPastedGstText(e.target.value)}
                    placeholder="e.g. Legal Name: NILKANTH ART, Trade Name: NILKANTH YARN, Principal Place: SHOP NO.1, JAY NARAYAN IND.-1, ANJANA FARM..."
                    className="w-full text-xs font-mono p-2 border border-border rounded bg-zinc-50 dark:bg-zinc-800 outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPasteBox(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleProcessPastedGst(pastedGstText)}
                      disabled={isPastingGst || !pastedGstText.trim()}
                      className="h-7 text-xs bg-purple-600 text-white hover:bg-purple-700"
                    >
                      {isPastingGst ? <Loader2 className="h-3 w-3 animate-spin" /> : "Extract & Fill"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Verified Feedback Banner */}
              {gstVerifiedData && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold uppercase text-xs">
                        {gstVerifiedData.tradeName || gstVerifiedData.businessName}
                      </div>
                      {gstVerifiedData.legalName && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Proprietor / Legal: {gstVerifiedData.legalName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[9.5px] font-mono border-emerald-400 text-emerald-700 dark:text-emerald-300">
                      PAN: {gstVerifiedData.pan}
                    </Badge>
                    <div className="text-[9.5px] text-emerald-600 font-semibold mt-0.5">
                      {gstVerifiedData.status || "ACTIVE"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trade Name & Legal Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Trade Name (Firm / Brand) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. NILKANTH ART"
                  value={tradeName}
                  onChange={(e) => {
                    setTradeName(e.target.value);
                    setName(e.target.value);
                  }}
                  className="mt-1 uppercase font-semibold h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Legal Name (Proprietor / Company)
                </Label>
                <Input
                  placeholder="e.g. ASHVIN THAKARSHIBHAI GOLKIYA"
                  value={legalName}
                  onChange={(e) => {
                    setLegalName(e.target.value);
                    if (!contact) setContact(e.target.value);
                  }}
                  className="mt-1 uppercase h-9 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Contact Person</Label>
                <Input
                  placeholder="e.g. Ketan Bhai / Representative"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="97235 44545"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="mt-1 font-mono h-9 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                <Input
                  type="email"
                  placeholder="customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Opening Balance (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="mt-1 font-mono h-9 rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Address (Principal Place of Business)</Label>
              <Input
                placeholder="2nd Floor, 104, Orange Embroidery Park, Surat Kadodara Road"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 uppercase h-9 rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold text-foreground">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 uppercase h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">State</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 h-9 rounded-md"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-foreground">State Code</Label>
                <Input
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="mt-1 font-mono text-center h-9 rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Pincode</Label>
              <Input
                placeholder="395010"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="mt-1 font-mono h-9 rounded-md"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Internal Notes / Ledger Remarks</Label>
              <Input
                placeholder="e.g. Regular buyer of Jari Kasab and Viscose Yarn"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-9 rounded-md"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 text-xs rounded-md cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCustomer}
                className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-md shadow-xs cursor-pointer"
              >
                {editingCustomer ? "Update Customer" : "Save Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official GST Portal Live Captcha Verification Modal */}
      <OfficialGstModal
        isOpen={isOfficialModalOpen}
        onClose={() => setIsOfficialModalOpen(false)}
        gstin={gstin}
        onSuccess={(data) => {
          if (data.gstin) setGstin(data.gstin);
          if (data.tradeName) setTradeName(data.tradeName);
          if (data.legalName) setLegalName(data.legalName);
          if (data.tradeName || data.businessName) setName(data.tradeName || data.businessName);
          if (data.legalName || data.contactPerson) setContact(data.legalName || data.contactPerson || "");
          if (data.address) setAddress(data.address);
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
          if (data.stateCode) setStateCode(data.stateCode);
          if (data.pincode) setPincode(data.pincode);
          setGstVerifiedData(data);
        }}
      />

      {/* Customer Monthly Ledger Modal */}
      <CustomerMonthlyLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        customer={selectedLedgerCustomer}
      />
    </div>
  );
}
