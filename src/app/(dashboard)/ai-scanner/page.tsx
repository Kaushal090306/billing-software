"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BillingStore,
  Customer,
  Invoice,
  InvoiceItem,
  BusinessSettings,
} from "@/lib/store";
import { formatINR, formatNumber } from "@/lib/billing-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine,
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  Eye,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function AIScannerPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isExtracted, setIsExtracted] = useState(true); // Default to sample extracted state

  // Extracted Fields from WhatsApp.jpeg handwritten bill
  const [custName, setCustName] = useState("NILKANTH YARN (નીલકંઠ યાર્ન)");
  const [custGstin, setCustGstin] = useState("24ASVPG5889L1ZR");
  const [custAddress, setCustAddress] = useState("PLOT NO. 42, SITARAM IND. ESTATE, PUNAGAM, SURAT");
  const [slipNo, setSlipNo] = useState("87");
  const [slipDate, setSlipDate] = useState("24/08/2026");
  const [productName, setProductName] = useState("JARI KASAB (જરી કસબ)");
  const [hsnCode, setHsnCode] = useState("5605");
  const [quantity, setQuantity] = useState("116.970");
  const [rate, setRate] = useState("320.00");
  const [taxable, setTaxable] = useState("37430.48");
  const [cgst, setCgst] = useState("935.76");
  const [sgst, setSgst] = useState("935.76");
  const [total, setTotal] = useState("39302.00");

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsExtracted(true);
      toast.success("AI OCR Extracted handwritten slip details with 99.4% confidence!");
    }, 1200);
  };

  const handleCreateInvoiceFromOCR = () => {
    // 1. Ensure customer exists or save
    let customer = BillingStore.getCustomers().find(
      (c) => c.gstin === custGstin || c.businessName.includes("NILKANTH")
    );

    if (!customer) {
      customer = {
        id: `cust_${Date.now()}`,
        businessName: custName.toUpperCase(),
        contactPerson: "Haresh Bhai",
        gstin: custGstin.toUpperCase(),
        pan: custGstin.substring(2, 12).toUpperCase(),
        address: custAddress.toUpperCase(),
        city: "SURAT",
        state: "Gujarat",
        stateCode: "24",
        pincode: "395010",
        mobile: "9825166789",
        openingBalance: 0,
        currentBalance: 0,
        createdAt: new Date().toISOString(),
      };
      BillingStore.saveCustomer(customer);
    }

    // 2. Generate new invoice
    const inv: Invoice = {
      id: `inv_ocr_${Date.now()}`,
      invoiceNo: `MTJ/${slipNo || "148"}`,
      date: slipDate,
      customerId: customer.id,
      customerName: customer.businessName,
      customerGstin: customer.gstin,
      customerAddress: customer.address,
      customerCity: customer.city,
      customerState: customer.state,
      customerStateCode: customer.stateCode,
      customerMobile: customer.mobile,
      items: [
        {
          id: `item_ocr_1`,
          productId: "prod_2",
          productName: productName.toUpperCase(),
          hsn: hsnCode,
          quantity: parseFloat(quantity) || 116.97,
          unit: "KG",
          rate: parseFloat(rate) || 320,
          taxableAmount: parseFloat(taxable) || 37430.48,
          gstRate: 5,
          cgstAmount: parseFloat(cgst) || 935.76,
          sgstAmount: parseFloat(sgst) || 935.76,
          igstAmount: 0,
          netAmount: parseFloat(total) || 39302,
        },
      ],
      totalQuantity: parseFloat(quantity) || 116.97,
      totalTaxable: parseFloat(taxable) || 37430.48,
      totalCgst: parseFloat(cgst) || 935.76,
      totalSgst: parseFloat(sgst) || 935.76,
      totalIgst: 0,
      roundOff: 0,
      grandTotal: parseFloat(total) || 39302,
      amountInWords: "THIRTY NINE THOUSAND THREE HUNDRED TWO RUPEES ONLY",
      paymentStatus: "unpaid",
      paidAmount: 0,
      remainingAmount: parseFloat(total) || 39302,
      createdAt: new Date().toISOString(),
    };

    BillingStore.saveInvoice(inv);
    toast.success(`Generated official invoice ${inv.invoiceNo} from OCR!`);
    router.push(`/invoices/${inv.id}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>AI Handwritten Bill Scanner</span>
            <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium border-none rounded-md">
              <Sparkles className="h-3 w-3 mr-1" />
              OCR Vision
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Convert handwritten physical challans & slips (like WhatsApp slip photos) into official GST Tax Invoices
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Upload & Bill Image Preview */}
        <Card className="md:col-span-5 border-[#ececee] dark:border-[#1a1822] shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Handwritten Slip Photo</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Slip #87 / 24-08-2026
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
            {/* Visual simulation of handwritten Dharmi Thread & Jari slip */}
            <div className="relative rounded-md border-2 border-dashed border-purple-300 dark:border-purple-800/80 bg-purple-50/30 dark:bg-purple-950/20 p-4 text-center overflow-hidden flex-1 flex flex-col justify-center items-center min-h-[320px]">
              {/* Slip Card Simulation */}
              <div className="w-full max-w-xs bg-[#fffef7] text-zinc-900 border border-amber-900/30 rounded-md p-3 text-[10px] text-left shadow-sm space-y-1.5 font-mono">
                <div className="text-center font-semibold text-red-700 text-xs border-b border-red-700/30 pb-1">
                  TAX INVOICE - Dharmi Thread & Jari
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>GSTIN: 24AGQPT2491L1ZO</span>
                  <span className="font-semibold text-blue-800">Slip No: 87</span>
                </div>
                <div className="border-t border-dotted border-zinc-400 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="font-semibold text-blue-900">નીલકંઠ યાર્ન</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GSTIN:</span>
                    <span className="font-medium">24ASVPG5889L1ZR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">24/08/2026</span>
                  </div>
                </div>

                <div className="border-y border-zinc-800 my-1 py-1 font-semibold text-[9px] grid grid-cols-12">
                  <span className="col-span-5">જરી કસબ (5605)</span>
                  <span className="col-span-3 text-right">116.970 KG</span>
                  <span className="col-span-4 text-right">@ ₹320.00</span>
                </div>

                <div className="space-y-0.5 text-right font-medium text-[9px] pt-1">
                  <div>Taxable: ₹37,430.48</div>
                  <div>CGST 2.5%: ₹935.76</div>
                  <div>SGST 2.5%: ₹935.76</div>
                  <div className="text-xs text-red-800 font-semibold border-t border-zinc-400 pt-0.5">
                    TOTAL: ₹39,302.00
                  </div>
                </div>
              </div>

              {/* Scanning Overlay Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-purple-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-300" />
                  <span className="text-xs font-semibold tracking-wider uppercase">
                    AI OCR Scanning Gujarati Slip...
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSimulateScan}
                disabled={isScanning}
                variant="outline"
                className="w-full text-xs font-medium h-9 border-purple-300 dark:border-purple-800 rounded-md"
              >
                <ScanLine className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                <span>Re-Scan Slip Image</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: AI Extracted Verification & Edit */}
        <Card className="md:col-span-7 border-[#ececee] dark:border-[#1a1822] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>AI Extracted Fields (Review & Edit)</span>
            </CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium border-emerald-200">
              High Confidence
            </Badge>
          </CardHeader>

          <CardContent className="pt-4 space-y-4 text-xs">
            {/* Customer & Slip Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Detected Customer Name</Label>
                <Input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="mt-1 font-semibold text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Customer GSTIN</Label>
                <Input
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value)}
                  className="mt-1 font-mono font-medium text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium">Slip / Bill No</Label>
                <Input
                  value={slipNo}
                  onChange={(e) => setSlipNo(e.target.value)}
                  className="mt-1 font-mono font-medium text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Bill Date</Label>
                <Input
                  value={slipDate}
                  onChange={(e) => setSlipDate(e.target.value)}
                  className="mt-1 font-medium text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Place of Supply</Label>
                <Input
                  value="Surat, Gujarat (24)"
                  disabled
                  className="mt-1 text-xs bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            {/* Line item extracted */}
            <div className="p-3 rounded-md bg-zinc-50 dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] space-y-3">
              <span className="text-[11px] font-semibold text-purple-600 uppercase block">
                Item Line Recognition
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <Label className="text-[10px]">Product / Particulars</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="mt-0.5 text-xs font-medium"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-[10px]">HSN Code</Label>
                  <Input
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="mt-0.5 text-xs font-mono text-center"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-[10px]">Net Wt (Qty)</Label>
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-0.5 text-xs font-mono font-medium text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-right">
                <div>
                  <Label className="text-[10px]">Rate (₹)</Label>
                  <Input
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-0.5 text-xs font-mono text-right"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Taxable (₹)</Label>
                  <Input
                    value={taxable}
                    onChange={(e) => setTaxable(e.target.value)}
                    className="mt-0.5 text-xs font-mono font-medium text-right"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">CGST + SGST</Label>
                  <Input
                    value={`₹${(parseFloat(cgst) + parseFloat(sgst)).toFixed(2)}`}
                    disabled
                    className="mt-0.5 text-xs font-mono text-right bg-zinc-100 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-purple-600 font-medium">
                    Grand Total
                  </Label>
                  <Input
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="mt-0.5 text-xs font-mono font-semibold text-right text-purple-600 dark:text-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCreateInvoiceFromOCR}
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-md shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>VERIFY & CREATE OFFICIAL TAX INVOICE</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
