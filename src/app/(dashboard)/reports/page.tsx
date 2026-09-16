"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BillingStore,
  Invoice,
  Customer,
  Product,
  PaymentRecord,
} from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Layers,
  FileText,
  Users,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const loadData = () => {
      setInvoices(BillingStore.getInvoices());
      setCustomers(BillingStore.getCustomers());
      setProducts(BillingStore.getProducts());
      setPayments(BillingStore.getPayments());
    };
    loadData();
    const unsubscribe = BillingStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  // Summary Metrics
  const totalTaxable = useMemo(
    () => invoices.reduce((s, i) => s + i.totalTaxable, 0),
    [invoices]
  );
  const totalCgst = useMemo(
    () => invoices.reduce((s, i) => s + i.totalCgst, 0),
    [invoices]
  );
  const totalSgst = useMemo(
    () => invoices.reduce((s, i) => s + i.totalSgst, 0),
    [invoices]
  );
  const totalIgst = useMemo(
    () => invoices.reduce((s, i) => s + i.totalIgst, 0),
    [invoices]
  );
  const totalGross = useMemo(
    () => invoices.reduce((s, i) => s + i.grandTotal, 0),
    [invoices]
  );

  // Customer-wise Sales Aggregation
  const customerWiseSales = useMemo(() => {
    const map: Record<string, { name: string; gstin: string; count: number; total: number }> = {};
    invoices.forEach((inv) => {
      if (!map[inv.customerId]) {
        map[inv.customerId] = {
          name: inv.customerName,
          gstin: inv.customerGstin,
          count: 0,
          total: 0,
        };
      }
      map[inv.customerId].count += 1;
      map[inv.customerId].total += inv.grandTotal;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  // HSN-wise Sales Aggregation for GSTR-1
  const hsnWiseSales = useMemo(() => {
    const map: Record<
      string,
      { hsn: string; name: string; qty: number; unit: string; taxable: number; cgst: number; sgst: number; igst: number; total: number }
    > = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.hsn || "5605";
        if (!map[key]) {
          map[key] = {
            hsn: key,
            name: item.productName,
            qty: 0,
            unit: item.unit || "KG",
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
          };
        }
        map[key].qty += Number(item.quantity) || 0;
        map[key].taxable += item.taxableAmount;
        map[key].cgst += item.cgstAmount;
        map[key].sgst += item.sgstAmount;
        map[key].igst += item.igstAmount;
        map[key].total += item.netAmount;
      });
    });

    return Object.values(map);
  }, [invoices]);

  const handleExportCSV = () => {
    const headers = [
      "Invoice No",
      "Date",
      "Customer Name",
      "GSTIN",
      "Taxable Value",
      "CGST",
      "SGST",
      "IGST",
      "Total Amount",
      "Status",
    ];

    const rows = invoices.map((i) => [
      i.invoiceNo,
      i.date,
      `"${i.customerName}"`,
      i.customerGstin || "",
      i.totalTaxable,
      i.totalCgst,
      i.totalSgst,
      i.totalIgst,
      i.grandTotal,
      i.paymentStatus,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dharmi_Sales_GST_Report_2026-27.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales and GST report exported to CSV!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Sales & GST Reports</span>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-800 rounded-md">
              GSTR-1 Ready
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dharmi Thread & Jari sales analysis, GSTR-1 B2B returns, HSN summary, and customer performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="h-10 px-4 rounded-md border-zinc-300 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV / Excel</span>
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-10 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Total Taxable Sales
            </span>
            <div className="text-lg font-semibold text-foreground mt-1">
              {formatINR(totalTaxable)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">
              CGST Total (2.5%)
            </span>
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {formatINR(totalCgst)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">
              SGST Total (2.5%)
            </span>
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-1">
              {formatINR(totalSgst)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs rounded-lg">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
              IGST Total
            </span>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
              {formatINR(totalIgst)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs rounded-lg">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase">
              Grand Total Sales
            </span>
            <div className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-1">
              {formatINR(totalGross)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue="gstr1" className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-md">
          <TabsTrigger
            value="gstr1"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            <span>GSTR-1 B2B Summary</span>
          </TabsTrigger>
          <TabsTrigger
            value="hsn"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            <span>HSN Wise Summary</span>
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-sm text-xs font-semibold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-[#181922] data-[state=active]:shadow-xs"
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            <span>Customer-Wise Sales</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. GSTR-1 Invoices Table */}
        <TabsContent value="gstr1">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
              <CardTitle className="text-sm font-semibold">
                B2B Invoices Return Schedule (GST Table 4A, 4B)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 w-28">Invoice No</th>
                      <th className="p-3 w-24">Date</th>
                      <th className="p-3 min-w-[200px]">Receiver Name</th>
                      <th className="p-3 w-36">Receiver GSTIN</th>
                      <th className="p-3 w-32 text-right">Taxable (₹)</th>
                      <th className="p-3 w-28 text-right">CGST (₹)</th>
                      <th className="p-3 w-28 text-right">SGST (₹)</th>
                      <th className="p-3 w-28 text-right">IGST (₹)</th>
                      <th className="p-3 w-32 text-right">Invoice Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-[#121016]"
                      >
                        <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                          {inv.invoiceNo}
                        </td>
                        <td className="p-3 text-muted-foreground font-normal">{inv.date}</td>
                        <td className="p-3 font-semibold uppercase text-foreground">
                          {inv.customerName}
                        </td>
                        <td className="p-3 font-mono font-medium">
                          {inv.customerGstin || "Unregistered"}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">
                          {formatNumber(inv.totalTaxable, 2)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground font-normal">
                          {formatNumber(inv.totalCgst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground font-normal">
                          {formatNumber(inv.totalSgst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground font-normal">
                          {formatNumber(inv.totalIgst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                          {formatINR(inv.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. HSN Wise Summary */}
        <TabsContent value="hsn">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
              <CardTitle className="text-sm font-semibold">
                HSN-wise Summary of Outward Supplies (GST Table 12)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 w-28">HSN Code</th>
                      <th className="p-3 min-w-[200px]">Description</th>
                      <th className="p-3 w-32 text-right">Total Quantity</th>
                      <th className="p-3 w-32 text-right">Taxable Value (₹)</th>
                      <th className="p-3 w-28 text-right">CGST (₹)</th>
                      <th className="p-3 w-28 text-right">SGST (₹)</th>
                      <th className="p-3 w-28 text-right">IGST (₹)</th>
                      <th className="p-3 w-32 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {hsnWiseSales.map((h) => (
                      <tr
                        key={h.hsn}
                        className="hover:bg-zinc-50/50 dark:hover:bg-[#121016]"
                      >
                        <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                          {h.hsn}
                        </td>
                        <td className="p-3 font-semibold uppercase">{h.name}</td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatNumber(h.qty, 3)} {h.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {formatNumber(h.taxable, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-normal">
                          {formatNumber(h.cgst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-normal">
                          {formatNumber(h.sgst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-normal">
                          {formatNumber(h.igst, 2)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                          {formatINR(h.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Customer Wise Sales */}
        <TabsContent value="customers">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs overflow-hidden rounded-lg">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
              <CardTitle className="text-sm font-semibold">
                Customer-Wise Turnover & Contribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-semibold text-[11px]">
                      <th className="p-3 min-w-[240px]">Customer / Business Name</th>
                      <th className="p-3 w-36">GSTIN</th>
                      <th className="p-3 w-28 text-center">Bills Count</th>
                      <th className="p-3 w-36 text-right">Total Sales (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {customerWiseSales.map((c, i) => (
                      <tr
                        key={i}
                        className="hover:bg-zinc-50/50 dark:hover:bg-[#121016]"
                      >
                        <td className="p-3 font-semibold uppercase text-foreground">
                          {c.name}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground font-normal">
                          {c.gstin || "Unregistered"}
                        </td>
                        <td className="p-3 text-center font-mono font-medium">
                          {c.count}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-sm text-purple-600 dark:text-purple-400">
                          {formatINR(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
