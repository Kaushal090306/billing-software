"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BillingStore,
  Invoice,
  Customer,
  Product,
  PaymentRecord,
  BusinessSettings,
} from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FilePlus2,
  FileText,
  Users,
  Package,
  CreditCard,
  ScanLine,
  BarChart3,
  Settings,
  Eye,
  Copy,
  Printer,
  Share2,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal";

export default function DashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );

  // Selected Invoice Preview
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const loadAll = () => {
      setInvoices(BillingStore.getInvoices());
      setCustomers(BillingStore.getCustomers());
      setProducts(BillingStore.getProducts());
      setPayments(BillingStore.getPayments());
      setSettings(BillingStore.getSettings());
    };
    loadAll();
    const unsubscribe = BillingStore.subscribe(loadAll);
    return () => unsubscribe();
  }, []);

  // Aggregations
  const totalBilled = useMemo(
    () => invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  );
  const totalPending = useMemo(
    () =>
      customers.reduce((s, c) => {
        const bal = BillingStore.getCustomerBalance(c.id);
        return s + bal.currentBalance;
      }, 0),
    [customers, invoices, payments]
  );

  // Live Today's Sales calculation
  const todaySales = useMemo(() => {
    const now = new Date();
    const todayYMD = now.toISOString().split("T")[0];
    const todayDMY = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${now.getFullYear()}`;

    return invoices
      .filter((inv) => {
        const invDate = inv.date?.trim();
        const createdDate = inv.createdAt ? inv.createdAt.split("T")[0] : "";
        return (
          invDate === todayDMY ||
          invDate === todayYMD ||
          createdDate === todayYMD
        );
      })
      .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  }, [invoices]);

  // Live Month's Sales calculation
  const monthSales = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const matched = invoices.filter((inv) => {
      if (inv.date && inv.date.includes("/")) {
        const parts = inv.date.split("/");
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          if (m === currentMonth && y === currentYear) return true;
        }
      }
      if (inv.createdAt) {
        const d = new Date(inv.createdAt);
        if (
          !isNaN(d.getTime()) &&
          d.getMonth() + 1 === currentMonth &&
          d.getFullYear() === currentYear
        ) {
          return true;
        }
      }
      return false;
    });

    return matched.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  }, [invoices]);

  const quickActions = [
    {
      title: "New Bill",
      href: "/invoices/new",
      icon: FilePlus2,
      desc: "Instant 1-click invoice",
      color: "bg-purple-600 text-white shadow-md hover:bg-purple-700",
      highlight: true,
    },
    {
      title: "Customers",
      href: "/customers",
      icon: Users,
      desc: "Buyer profiles & ledgers",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "Products",
      href: "/products",
      icon: Package,
      desc: "Kasab & Yarn master",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: FileText,
      desc: "All generated bills",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "Payments",
      href: "/payments",
      icon: CreditCard,
      desc: "Udhar & settlements",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "AI Scanner",
      href: "/ai-scanner",
      icon: ScanLine,
      desc: "OCR handwritten slips",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
      desc: "GSTR-1 & Sales analysis",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      desc: "Firm & bank config",
      color: "bg-white dark:bg-[#181922] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-purple-900 via-indigo-900 to-zinc-950 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-300">
              {settings.devotionalHeader || "ll SHREE GANESHAY NAMAH ll"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white uppercase">
            {settings.companyName || "DHARMI THREAD & JARI"}
          </h1>
          <p className="text-xs text-purple-200 font-light">
            {settings.address}, Surat &bull; GSTIN: {settings.gstin}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            asChild
            className="h-10 px-5 rounded-md bg-white text-zinc-900 hover:bg-purple-50 font-semibold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-xs sm:text-sm"
          >
            <Link href="/invoices/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-purple-600" />
              <span>Create New Bill</span>
            </Link>
          </Button>
        </div>

        {/* Glow Accent background */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Today Sales
            </span>
            <div className="text-2xl font-semibold text-foreground mt-1">
              {formatINR(todaySales)}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              Calculated for today
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase">
              This Month
            </span>
            <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {formatINR(monthSales > 0 ? monthSales : totalBilled)}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              {invoices.length} Bills Generated
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Pending Payments
            </span>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(totalPending)}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              Outstanding Udhar Balance
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Payments Received
            </span>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(totalCollected)}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-1">
              Bank RTGS & Cheque
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.title}
                href={act.href}
                className={`p-3.5 rounded-md border border-[#ececee] dark:border-[#1a1822] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xs ${act.color}`}
              >
                <Icon
                  className={`h-5 w-5 mb-1.5 ${act.highlight ? "text-white" : "text-purple-600 dark:text-purple-400"
                    }`}
                />
                <span className="font-semibold text-xs leading-tight">
                  {act.title}
                </span>
                <span
                  className={`text-[9.5px] mt-0.5 truncate max-w-full font-normal ${act.highlight ? "text-purple-200" : "text-muted-foreground"
                    }`}
                >
                  {act.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
        <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <span>Recent Invoices</span>
            </CardTitle>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 rounded-md"
          >
            <Link href="/invoices" className="flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
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
                  <th className="p-3 min-w-[200px]">Customer Name</th>
                  <th className="p-3 w-28 text-right">Net Wt</th>
                  <th className="p-3 w-32 text-right">Total Amount (₹)</th>
                  <th className="p-3 w-24 text-center">Status</th>
                  <th className="p-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                {invoices.slice(0, 5).map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-[#121016] transition-colors"
                  >
                    <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                      {inv.invoiceNo}
                    </td>
                    <td className="p-3 text-muted-foreground font-normal">{inv.date}</td>
                    <td className="p-3">
                      <Link
                        href={`/customers/${inv.customerId}`}
                        className="font-semibold text-foreground hover:text-purple-600 block uppercase"
                      >
                        {inv.customerName}
                      </Link>
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
                ))}
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
    </div>
  );
}
