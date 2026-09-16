"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BillingStore,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  BusinessSettings,
} from "@/lib/store";
import {
  calculateItemRow,
  calculateInvoiceSummary,
  generateNextInvoiceNumber,
  formatINR,
  formatNumber,
  buildWhatsAppInvoiceShareUrl,
} from "@/lib/billing-utils";
import { downloadInvoicePDF } from "@/lib/pdf-download";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Printer,
  Share2,
  Eye,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  History,
  Download,
  Maximize2,
  Check,
  Loader2,
} from "lucide-react";
import { InvoiceTemplate } from "@/components/invoice/invoice-template";
import { InvoicePreviewModal } from "@/components/invoice/invoice-preview-modal";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import Link from "next/link";

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const duplicateFromId = searchParams.get("duplicateFrom");
  const preselectedCustomerId = searchParams.get("customerId");

  const { setOpen } = useSidebar();

  // Auto shrink sidebar once by default when creating a new bill, while allowing manual toggle
  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    settings.activeTemplateId || "tpl_standard_gst"
  );

  const templates = settings.templates && settings.templates.length > 0
    ? settings.templates
    : BillingStore.getTemplates();

  const currentTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates[0];

  // Form State
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] =
    useState<boolean>(false);

  // Customer autofill fields
  const [customerName, setCustomerName] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerCity, setCustomerCity] = useState<string>("SURAT");
  const [customerState, setCustomerState] = useState<string>("Gujarat");
  const [customerStateCode, setCustomerStateCode] = useState<string>("24");
  const [customerMobile, setCustomerMobile] = useState<string>("");

  // Transport & E-Invoice Fields
  const [showTransportFields, setShowTransportFields] =
    useState<boolean>(false);
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [ewayBillNo, setEwayBillNo] = useState<string>("");
  const [ackNo, setAckNo] = useState<string>("");
  const [ackDate, setAckDate] = useState<string>("");
  const [irn, setIrn] = useState<string>("");
  const [transportNo, setTransportNo] = useState<string>("");

  // Invoice Line Items
  const [items, setItems] = useState<
    Array<{
      id: string;
      productId: string;
      productName: string;
      hsn: string;
      quantity: string | number;
      unit: string;
      rate: string | number;
      gstRate: number;
      suggestedRate: number | null;
    }>
  >([
    {
      id: "row_1",
      productId: "prod_1",
      productName: "VISCOSE YARN (54033100)",
      hsn: "5403",
      quantity: "63.000",
      unit: "KG",
      rate: "328.5714",
      gstRate: 5,
      suggestedRate: 328.5714,
    },
    {
      id: "row_2",
      productId: "prod_2",
      productName: "JARI KASAB (56050020)",
      hsn: "5605",
      quantity: "243.77",
      unit: "KG",
      rate: "333.3333",
      gstRate: 5,
      suggestedRate: 333.3333,
    },
  ]);

  // Round off & Settings
  const [roundOffMode, setRoundOffMode] = useState<
    "nearest_1" | "nearest_5" | "nearest_10" | "none"
  >("nearest_1");

  // Discount & Custom Editable Grand Total
  const [discount, setDiscount] = useState<string>("");
  const [customGrandTotal, setCustomGrandTotal] = useState<string>("");

  // Live Preview Copy Type & Zoom Scale (Default 100%)
  const [previewCopyType, setPreviewCopyType] = useState<
    "Original" | "Duplicate" | "Triplicate"
  >("Original");
  const [previewScale, setPreviewScale] = useState<number>(100);

  // Dropdown Container Ref for instant close on click outside
  const customerSearchContainerRef = React.useRef<HTMLDivElement>(null);

  // Add Customer Inline Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustCity, setNewCustCity] = useState("Surat");
  const [newCustState, setNewCustState] = useState("Gujarat");
  const [newCustStateCode, setNewCustStateCode] = useState("24");

  // Add Product Inline Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductHsn, setNewProductHsn] = useState("5605");
  const [newProductRate, setNewProductRate] = useState("");
  const [newProductGst, setNewProductGst] = useState("5");
  const [newProductUnit, setNewProductUnit] = useState("KG");
  const [newProductCategory, setNewProductCategory] = useState("Jari Kasab");
  const [targetProductRowIndex, setTargetProductRowIndex] = useState<number | null>(null);

  // Writable Product Combobox Autocomplete State
  const [activeProductDropdown, setActiveProductDropdown] = useState<number | null>(null);
  const productDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // PDF Export state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Modal Preview
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Click Outside Listener to close customer & product dropdowns immediately
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      // Customer search container check
      if (
        customerSearchContainerRef.current &&
        !customerSearchContainerRef.current.contains(e.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }

      // Product search container check
      if (activeProductDropdown !== null) {
        const activeContainer = productDropdownRefs.current[activeProductDropdown];
        if (activeContainer && !activeContainer.contains(e.target as Node)) {
          setActiveProductDropdown(null);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCustomerDropdownOpen(false);
        setActiveProductDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProductDropdown]);


  // Load Initial Store Data & Keep in sync with Settings
  useEffect(() => {
    const refreshData = () => {
      setSettings(BillingStore.getSettings());
      setCustomers(BillingStore.getCustomers());
      setProducts(BillingStore.getProducts());
      setInvoices(BillingStore.getInvoices());
    };

    refreshData();
    const unsubscribe = BillingStore.subscribe(refreshData);

    const loadedCustomers = BillingStore.getCustomers();
    const loadedSettings = BillingStore.getSettings();
    const loadedInvoices = BillingStore.getInvoices();


    // Default Today's Date in DD/MM/YYYY
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    setInvoiceDate(`${dd}/${mm}/${yyyy}`);

    // Default to first customer if not yet selected
    if (loadedCustomers.length > 0 && !selectedCustomerId && !customerName) {
      const defaultCust = loadedCustomers[0];
      setSelectedCustomerId(defaultCust.id);
      setCustomerName(defaultCust.businessName);
      setCustomerGstin(defaultCust.gstin || "");
      setCustomerAddress(defaultCust.address || "");
      setCustomerCity(defaultCust.city || "SURAT");
      setCustomerState(defaultCust.state || "Gujarat");
      setCustomerStateCode(defaultCust.stateCode || "24");
      setCustomerMobile(defaultCust.mobile || "");
      setCustomerSearch(defaultCust.businessName);
    }

    // Generate Next Invoice Number
    const lastInv = loadedInvoices[0]?.invoiceNo || "MTJ/144";
    const nextNo = generateNextInvoiceNumber(
      lastInv,
      loadedSettings.invoicePrefix || "MTJ",
      loadedSettings.financialYear || "2026-27"
    );
    setInvoiceNo(nextNo);

    // Check duplicateFrom param
    if (duplicateFromId) {
      const srcInv = BillingStore.getInvoiceById(duplicateFromId);
      if (srcInv) {
        setSelectedCustomerId(srcInv.customerId);
        setCustomerName(srcInv.customerName);
        setCustomerGstin(srcInv.customerGstin);
        setCustomerAddress(srcInv.customerAddress);
        setCustomerCity(srcInv.customerCity);
        setCustomerState(srcInv.customerState);
        setCustomerStateCode(srcInv.customerStateCode);
        setCustomerMobile(srcInv.customerMobile);

        setItems(
          srcInv.items.map((it, idx) => ({
            id: `row_${Date.now()}_${idx}`,
            productId: it.productId,
            productName: it.productName,
            hsn: it.hsn,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            gstRate: it.gstRate,
            suggestedRate: it.rate,
          }))
        );
        toast.info(`Cloned invoice details from ${srcInv.invoiceNo}`);
      }
    } else if (preselectedCustomerId) {
      const cust = loadedCustomers.find((c) => c.id === preselectedCustomerId);
      if (cust) {
        handleSelectCustomer(cust);
      }
    }

    window.addEventListener("focus", refreshData);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", refreshData);
    };
  }, [duplicateFromId, preselectedCustomerId]);


  // Handle Customer Selection & Auto-fill
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.businessName);
    setCustomerGstin(cust.gstin || "");
    setCustomerAddress(cust.address || "");
    setCustomerCity(cust.city || "SURAT");
    setCustomerState(cust.state || "Gujarat");
    setCustomerStateCode(cust.stateCode || "24");
    setCustomerMobile(cust.mobile || "");
    setCustomerSearch(cust.businessName);
    setIsCustomerDropdownOpen(false);

    // Refresh suggested rates for existing rows
    setItems((prev) =>
      prev.map((row) => {
        if (row.productId) {
          const suggested = BillingStore.getSuggestedRate(
            cust.id,
            row.productId
          );
          return { ...row, suggestedRate: suggested };
        }
        return row;
      })
    );

    toast.success(`Selected: ${cust.businessName}`);
  };

  // Add New Customer inline
  const handleAddNewCustomer = () => {
    if (!newCustName.trim() || !newCustMobile.trim()) {
      toast.error("Please enter customer name and mobile number");
      return;
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      businessName: newCustName.trim().toUpperCase(),
      contactPerson: newCustName.trim(),
      gstin: newCustGstin.trim().toUpperCase(),
      pan: newCustGstin.trim().substring(2, 12).toUpperCase(),
      address: newCustAddress.trim().toUpperCase(),
      city: newCustCity.trim().toUpperCase(),
      state: newCustState.trim(),
      stateCode: newCustStateCode.trim(),
      pincode: "395010",
      mobile: newCustMobile.trim(),
      openingBalance: 0,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
    };

    BillingStore.saveCustomer(newCust);
    setCustomers(BillingStore.getCustomers());
    handleSelectCustomer(newCust);
    setIsAddCustomerOpen(false);
    toast.success("New customer created and selected!");
  };

  // Add New Product directly to catalog at billing time
  const handleAddNewProduct = () => {
    if (!newProductName.trim()) {
      toast.error("Please enter product name");
      return;
    }

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      name: newProductName.trim().toUpperCase(),
      hsn: newProductHsn.trim() || "5605",
      unit: (newProductUnit.trim() || "KG") as "KG" | "PCS" | "MTR" | "BOX" | "CONE",
      defaultRate: Number(newProductRate) || 0,
      gstRate: Number(newProductGst) || 5,
      category: newProductCategory || "Jari Kasab",
      stock: 100,
      description: "",
    };

    BillingStore.saveProduct(newProd);
    const updated = BillingStore.getProducts();
    setProducts(updated);

    if (targetProductRowIndex !== null && targetProductRowIndex < items.length) {
      handleSelectProduct(targetProductRowIndex, newProd.id);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `row_${Date.now()}`,
          productId: newProd.id,
          productName: newProd.name,
          hsn: newProd.hsn,
          quantity: "",
          unit: newProd.unit,
          rate: newProd.defaultRate || "",
          gstRate: newProd.gstRate,
          suggestedRate: newProd.defaultRate,
        },
      ]);
    }

    setIsAddProductOpen(false);
    setNewProductName("");
    setNewProductHsn("5605");
    setNewProductRate("");
    toast.success(`Product "${newProd.name}" saved to catalog & selected!`);
  };

  // Direct PDF Download
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const target = document.getElementById("official-invoice-print-sheet");
      if (!target) {
        toast.error("Invoice element not ready");
        return;
      }
      const safeInvoiceName = (liveInvoice.invoiceNo || "Invoice").replace(/[\/\\]/g, "_");
      await downloadInvoicePDF(target, `SaleBill_${safeInvoiceName}.pdf`);
      toast.success(`Downloaded SaleBill_${safeInvoiceName}.pdf successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF download");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Product Selection on Line Item
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    let suggested: number | null = null;
    if (selectedCustomerId) {
      suggested = BillingStore.getSuggestedRate(selectedCustomerId, prod.id);
    }

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productName: prod.name,
        hsn: prod.hsn,
        unit: prod.unit,
        gstRate: prod.gstRate,
        rate: suggested !== null ? suggested : prod.defaultRate,
        suggestedRate: suggested,
      };
      return updated;
    });
  };

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}`,
        productId: "",
        productName: "",
        hsn: "5605002",
        quantity: "",
        unit: "KG",
        rate: "",
        gstRate: 5,
        suggestedRate: null,
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.warning("Invoice must contain at least one item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Check Interstate vs Intra-state
  const isInterstate = useMemo(() => {
    return (
      customerStateCode &&
      settings.stateCode &&
      customerStateCode !== settings.stateCode
    );
  }, [customerStateCode, settings.stateCode]);

  // Real-time Summary Calculations with Discount & Custom Grand Total
  const summary = useMemo(() => {
    const validItems = items.map((it) => ({
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      gstRate: Number(it.gstRate) || 5,
    }));
    return calculateInvoiceSummary(
      validItems,
      isInterstate,
      roundOffMode,
      Number(discount) || 0,
      customGrandTotal ? Number(customGrandTotal) : null
    );
  }, [items, isInterstate, roundOffMode, discount, customGrandTotal]);

  // LIVE INVOICE OBJECT FOR REAL-TIME RIGHT PREVIEW
  const liveInvoice: Invoice = useMemo(() => {
    const calculatedItems: InvoiceItem[] = items.map((it, idx) => {
      const qty = Number(it.quantity) || 0;
      const rt = Number(it.rate) || 0;
      const calc = calculateItemRow(qty, rt, it.gstRate, isInterstate);

      return {
        id: it.id || `live_${idx}`,
        productId: it.productId || `prod_${idx}`,
        productName: (it.productName || "JARI ITEM").toUpperCase(),
        hsn: it.hsn || "5605",
        quantity: qty,
        unit: it.unit || "KG",
        rate: rt,
        taxableAmount: calc.taxableAmount,
        gstRate: it.gstRate,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        netAmount: calc.totalAmount,
      };
    });

    return {
      id: "live_preview_invoice",
      invoiceNo: invoiceNo.trim().toUpperCase() || "MTJ/145",
      date: invoiceDate.trim() || "15/09/2026",
      customerId: selectedCustomerId || "cust_1",
      customerName:
        customerName.trim().toUpperCase() || "SHREE MANGALAM THREAD & JARI",
      customerGstin: customerGstin.trim().toUpperCase() || "24AEYPV3370E1Z1",
      customerAddress:
        customerAddress.trim().toUpperCase() ||
        "SHOP NO.1,JAY NARAYAN IND.-1,ANJANA FARM,SURAT",
      customerCity: customerCity.trim().toUpperCase() || "SURAT",
      customerState: customerState.trim() || "Gujarat",
      customerStateCode: customerStateCode.trim() || "24",
      customerMobile: customerMobile.trim() || "9723544545",

      ackNo: ackNo.trim() || "162625465338519",
      ackDate: ackDate.trim() || "02/08/2026 11:17:00 AM",
      irn:
        irn.trim() ||
        "124530801ecefda7fd4e0972ffe7a9a50d8f8f30e60086b9fe88e8e6828bb9ec",
      ewayBillNo: ewayBillNo.trim(),
      vehicleNo: vehicleNo.trim(),
      transportNo: transportNo.trim(),

      items: calculatedItems,
      totalQuantity: summary.totalQty,
      totalTaxable: summary.totalTaxable,
      totalCgst: summary.totalCgst,
      totalSgst: summary.totalSgst,
      totalIgst: summary.totalIgst,
      discount: summary.discount,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      amountInWords: summary.amountInWords,

      paymentStatus: "unpaid",
      paidAmount: 0,
      remainingAmount: summary.grandTotal,
      createdAt: new Date().toISOString(),
    };
  }, [
    invoiceNo,
    invoiceDate,
    selectedCustomerId,
    customerName,
    customerGstin,
    customerAddress,
    customerCity,
    customerState,
    customerStateCode,
    customerMobile,
    ackNo,
    ackDate,
    irn,
    ewayBillNo,
    vehicleNo,
    transportNo,
    items,
    isInterstate,
    summary,
  ]);

  // Save Invoice & Show Actions
  const handleSaveInvoice = () => {
    if (!customerName.trim()) {
      toast.error("Please select or enter customer details");
      return;
    }

    const invToSave: Invoice = {
      ...liveInvoice,
      id: `inv_${Date.now()}`,
    };

    BillingStore.saveInvoice(invToSave);
    toast.success(`Invoice ${invToSave.invoiceNo} saved to database!`);
    router.push(`/invoices/${invToSave.id}`);
  };

  const handlePrintLive = (copy: "Original" | "Duplicate" | "Triplicate") => {
    setPreviewCopyType(copy);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleWhatsAppLive = () => {
    const url = buildWhatsAppInvoiceShareUrl(
      liveInvoice.customerMobile,
      {
        invoiceNo: liveInvoice.invoiceNo,
        customerName: liveInvoice.customerName,
        date: liveInvoice.date,
        grandTotal: liveInvoice.grandTotal,
      },
      settings.companyName
    );
    window.open(url, "_blank");
    toast.success("WhatsApp sharing opened");
  };

  // Filtered customer search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.businessName.toLowerCase().includes(query) ||
        (c.gstin && c.gstin.toLowerCase().includes(query)) ||
        (c.mobile && c.mobile.includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query))
    );
  }, [customers, customerSearch]);

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>Fast Billing Engine</span>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium border-purple-200 dark:border-purple-800">
                Live Template Preview
              </Badge>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground ml-10">
            Real-time side-by-side invoice calculation & instant PDF template preview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            variant="outline"
            className="h-10 px-4 rounded-md border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-medium text-xs flex items-center gap-1.5 shadow-2xs"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-purple-600" />
            )}
            <span>Download PDF</span>
          </Button>

          <Button
            onClick={() => handlePrintLive("Original")}
            variant="outline"
            className="h-10 px-4 rounded-md font-medium text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <span>Print Invoice</span>
          </Button>

          <Button
            onClick={handleSaveInvoice}
            className="h-10 px-5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>SAVE INVOICE</span>
          </Button>
        </div>
      </div>

      {/* Main Split Grid: Left Form (6 cols) | Right Live Preview (6 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT SIDE: BILLING ENTRY FORM ================= */}
        <div className="xl:col-span-6 space-y-5">
          {/* Customer Selection Card */}
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 text-xs font-semibold">
                  1
                </span>
                <span>Customer Details (Billed To)</span>
              </CardTitle>

              <Dialog
                open={isAddCustomerOpen}
                onOpenChange={setIsAddCustomerOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-md"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                      Add New Customer to Master
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2 text-xs">
                    <div>
                      <Label className="text-xs font-medium">Business Name *</Label>
                      <Input
                        placeholder="e.g. SHREE MANGALAM THREAD & JARI"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="mt-1 uppercase font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium">GSTIN</Label>
                        <Input
                          placeholder="24AEYPV3370E1Z1"
                          value={newCustGstin}
                          onChange={(e) => setNewCustGstin(e.target.value)}
                          className="mt-1 font-mono uppercase font-normal"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Mobile *</Label>
                        <Input
                          placeholder="97235 44545"
                          value={newCustMobile}
                          onChange={(e) => setNewCustMobile(e.target.value)}
                          className="mt-1 font-mono font-normal"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Address</Label>
                      <Input
                        placeholder="Shop No.1, Jay Narayan Ind.-1, Anjana Farm"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        className="mt-1 uppercase font-normal"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs font-medium">City</Label>
                        <Input
                          placeholder="Surat"
                          value={newCustCity}
                          onChange={(e) => setNewCustCity(e.target.value)}
                          className="mt-1 uppercase font-normal"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">State</Label>
                        <Input
                          value={newCustState}
                          onChange={(e) => setNewCustState(e.target.value)}
                          className="mt-1 font-normal"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">State Code</Label>
                        <Input
                          value={newCustStateCode}
                          onChange={(e) => setNewCustStateCode(e.target.value)}
                          className="mt-1 font-mono text-center font-semibold"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddNewCustomer}
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md"
                    >
                      Save & Auto-Select
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {/* Customer Search Autocomplete (Closes instantly on click outside) */}
              <div ref={customerSearchContainerRef} className="relative">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select / Search Customer
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type customer name (e.g. Shree Mangalam, Nilkanth Yarn)..."
                    value={customerSearch}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerName(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    className="pl-9 pr-8 font-medium uppercase bg-white dark:bg-[#181922] border-[#ececee] dark:border-[#2d2f39] rounded-md"
                  />
                  {selectedCustomerId && (
                    <button
                      onClick={() => {
                        setSelectedCustomerId("");
                        setCustomerSearch("");
                        setCustomerName("");
                        setCustomerGstin("");
                        setCustomerAddress("");
                        setCustomerMobile("");
                      }}
                      className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-red-500 font-semibold"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] rounded-md shadow-xl max-h-56 overflow-y-auto">
                    {filteredCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer border-b border-[#ececee]/60 dark:border-[#2d2f39]/60 last:border-none transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-foreground uppercase">
                            {cust.businessName}
                          </span>
                          <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            {cust.gstin || "Unregistered"}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                          <span className="truncate max-w-[280px]">
                            {cust.address}, {cust.city}
                          </span>
                          <span className="font-mono">Mo: {cust.mobile}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-filled details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] text-muted-foreground font-normal">GSTIN</Label>
                  <Input
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    placeholder="24AEYPV3370E1Z1"
                    className="font-mono font-normal uppercase mt-1 h-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground font-normal">
                    Mobile Number
                  </Label>
                  <Input
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="97235 44545"
                    className="font-mono font-normal mt-1 h-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground font-normal">
                    State & Code
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      placeholder="Gujarat"
                      className="h-8 font-normal bg-zinc-50 dark:bg-zinc-900/50 flex-1 rounded-md"
                    />
                    <Input
                      value={customerStateCode}
                      onChange={(e) => setCustomerStateCode(e.target.value)}
                      placeholder="24"
                      className="font-mono font-normal w-14 h-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground font-normal">
                  Address
                </Label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Shop No.1, Jay Narayan Ind.-1, Anjana Farm, Surat"
                  className="mt-1 h-8 uppercase font-normal bg-zinc-50 dark:bg-zinc-900/50 rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Meta & Date */}
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822]">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 text-xs font-bold">
                    2
                  </span>
                  <span>Invoice Metadata</span>
                </div>
                <Badge
                  variant={isInterstate ? "destructive" : "secondary"}
                  className="font-medium text-[10px] rounded-md"
                >
                  {!isInterstate ? "CGST + SGST (5%) Intra" : "IGST (5%) Inter"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Invoice Number
                  </Label>
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="font-mono font-normal text-sm uppercase mt-1 h-9 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Invoice Date
                  </Label>
                  <Input
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="font-normal mt-1 h-9 rounded-md"
                  />
                </div>
              </div>

              {/* Toggle E-Invoice / Transport */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTransportFields(!showTransportFields)}
                  className="flex items-center justify-between w-full text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline pt-1"
                >
                  <span>
                    {showTransportFields ? "Hide" : "Show"} E-Invoice & Vehicle
                    Fields
                  </span>
                  {showTransportFields ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showTransportFields && (
                  <div className="space-y-2 pt-2 border-t border-[#ececee] dark:border-[#2d2f39] mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">ACK No</Label>
                        <Input
                          placeholder="ACK No"
                          value={ackNo}
                          onChange={(e) => setAckNo(e.target.value)}
                          className="h-7 text-[10px] font-mono mt-0.5 rounded-md"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">ACK Date</Label>
                        <Input
                          placeholder="DD/MM/YYYY HH:MM"
                          value={ackDate}
                          onChange={(e) => setAckDate(e.target.value)}
                          className="h-7 text-[10px] mt-0.5 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px]">IRN (64-character hash)</Label>
                      <Input
                        placeholder="IRN Hash"
                        value={irn}
                        onChange={(e) => setIrn(e.target.value)}
                        className="h-7 text-[10px] font-mono mt-0.5 rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Eway Bill No</Label>
                        <Input
                          placeholder="Eway Bill"
                          value={ewayBillNo}
                          onChange={(e) => setEwayBillNo(e.target.value)}
                          className="h-7 text-[10px] font-mono mt-0.5 rounded-md"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Vehicle No</Label>
                        <Input
                          placeholder="GJ05..."
                          value={vehicleNo}
                          onChange={(e) => setVehicleNo(e.target.value)}
                          className="h-7 text-[10px] font-mono mt-0.5 uppercase rounded-md"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Transport No</Label>
                        <Input
                          placeholder="LR / Transporter"
                          value={transportNo}
                          onChange={(e) => setTransportNo(e.target.value)}
                          className="h-7 text-[10px] font-mono mt-0.5 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items Card */}
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-xs">
            <CardHeader className="pb-3 border-b border-[#ececee] dark:border-[#1a1822] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 text-xs font-bold">
                  3
                </span>
                <span>Line Items (Thread &amp; Kasab)</span>
              </CardTitle>

              <div className="flex items-center gap-2">
                <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetProductRowIndex(null)}
                      className="h-7 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-md flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Product</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base font-semibold">
                        Add New Product to Master Catalog
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2 text-xs">
                      <div>
                        <Label className="text-xs font-medium">Product / Quality Name *</Label>
                        <Input
                          placeholder="e.g. VISCOSE EMBROIDERY 120D / JARI SPECIAL"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          className="mt-1 uppercase font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-medium">HSN Code</Label>
                          <Input
                            placeholder="5605 / 5403"
                            value={newProductHsn}
                            onChange={(e) => setNewProductHsn(e.target.value)}
                            className="mt-1 font-mono text-center font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Standard Rate (₹/KG)</Label>
                          <Input
                            placeholder="e.g. 330.00"
                            type="number"
                            step="0.01"
                            value={newProductRate}
                            onChange={(e) => setNewProductRate(e.target.value)}
                            className="mt-1 font-mono font-medium"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs font-medium">GST Rate</Label>
                          <select
                            value={newProductGst}
                            onChange={(e) => setNewProductGst(e.target.value)}
                            className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-2 font-medium text-xs"
                          >
                            <option value="5">5% (Yarn/Jari)</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Unit</Label>
                          <Input
                            value={newProductUnit}
                            onChange={(e) => setNewProductUnit(e.target.value.toUpperCase())}
                            className="mt-1 font-mono text-center font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Category</Label>
                          <select
                            value={newProductCategory}
                            onChange={(e) => setNewProductCategory(e.target.value)}
                            className="w-full h-9 mt-1 rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-2 font-medium text-xs"
                          >
                            <option value="Jari Kasab">Jari Kasab</option>
                            <option value="Viscose Yarn">Viscose Yarn</option>
                            <option value="Polyester Thread">Polyester Thread</option>
                            <option value="Embroidery Thread">Embroidery Thread</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        onClick={handleAddNewProduct}
                        className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md"
                      >
                        Save Product to Catalog & Auto-Select
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  onClick={handleAddItem}
                  size="sm"
                  className="h-7 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-md flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Row</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-visible">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] text-muted-foreground font-medium text-[10.5px]">
                      <th className="p-2.5 w-8 text-center font-normal">#</th>
                      <th className="p-2.5 min-w-[190px] font-normal">Product Name</th>
                      <th className="p-2.5 w-16 text-center font-normal">HSN</th>
                      <th className="p-2.5 w-24 text-right font-normal">Qty (KG)</th>
                      <th className="p-2.5 w-28 text-right font-normal">Rate (₹)</th>
                      <th className="p-2.5 w-16 text-center font-normal">GST</th>
                      <th className="p-2.5 w-24 text-right font-normal">Taxable</th>
                      <th className="p-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                    {items.map((row, index) => {
                      const qty = Number(row.quantity) || 0;
                      const rt = Number(row.rate) || 0;
                      const calc = calculateItemRow(
                        qty,
                        rt,
                        row.gstRate,
                        isInterstate
                      );

                      const filteredRowProducts = products.filter((p) => {
                        if (!row.productName) return true;
                        const q = row.productName.toLowerCase().trim();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.hsn.toLowerCase().includes(q) ||
                          (p.category && p.category.toLowerCase().includes(q))
                        );
                      });

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-zinc-50/50 dark:hover:bg-[#121016] ${activeProductDropdown === index ? "relative z-40" : "relative z-0"
                            }`}
                        >
                          <td className="p-2 text-center font-normal text-muted-foreground">
                            {index + 1}
                          </td>

                          {/* Product Writable Combobox with Suggestions */}
                          <td className="p-2">
                            <div
                              ref={(el) => {
                                productDropdownRefs.current[index] = el;
                              }}
                              className="relative"
                            >
                              <div className="relative">
                                <Input
                                  placeholder="Type or select product..."
                                  value={row.productName}
                                  onFocus={() => setActiveProductDropdown(index)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItems((prev) => {
                                      const u = [...prev];
                                      u[index] = {
                                        ...u[index],
                                        productName: val,
                                        productId: "",
                                      };
                                      return u;
                                    });
                                    setActiveProductDropdown(index);
                                  }}
                                  className="h-8 text-xs font-normal uppercase bg-white dark:bg-[#181922] pr-6 rounded-md"
                                />
                                <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none opacity-60" />
                              </div>

                              {/* Suggestion Dropdown */}
                              {activeProductDropdown === index && (
                                <div className="absolute left-0 top-full mt-1 w-[320px] bg-white dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] rounded-md shadow-2xl z-50 max-h-56 overflow-y-auto">
                                  {filteredRowProducts.length > 0 ? (
                                    filteredRowProducts.map((p) => (
                                      <div
                                        key={p.id}
                                        onClick={() => {
                                          handleSelectProduct(index, p.id);
                                          setActiveProductDropdown(null);
                                        }}
                                        className="p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer border-b border-[#ececee]/60 dark:border-[#2d2f39]/60 last:border-none transition-colors"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium text-xs text-foreground uppercase">
                                            {p.name}
                                          </span>
                                          <span className="font-mono text-[10.5px] text-purple-600 dark:text-purple-400 font-normal">
                                            ₹{p.defaultRate}/{p.unit || "KG"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 font-mono">
                                          <span>HSN: {p.hsn}</span>
                                          <span>GST: {p.gstRate}%</span>
                                          <span>{p.category}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-2.5 text-center text-xs text-muted-foreground">
                                      No catalog product matches &ldquo;{row.productName}&rdquo;
                                    </div>
                                  )}

                                  {/* Quick Add Product to Master Catalog */}
                                  <div
                                    onClick={() => {
                                      setTargetProductRowIndex(index);
                                      setNewProductName(row.productName || "");
                                      setIsAddProductOpen(true);
                                      setActiveProductDropdown(null);
                                    }}
                                    className="p-2 text-xs text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer flex items-center gap-1.5 border-t border-[#ececee] dark:border-[#2d2f39]"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>
                                      {row.productName
                                        ? `Add "${row.productName}" to Master Catalog`
                                        : "Add New Product to Master Catalog"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* HSN */}
                          <td className="p-2">
                            <Input
                              value={row.hsn}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems((prev) => {
                                  const u = [...prev];
                                  u[index] = { ...u[index], hsn: val };
                                  return u;
                                });
                              }}
                              className="h-8 font-mono font-normal text-center text-xs px-1 rounded-md"
                            />
                          </td>

                          {/* Qty (Light weight font) */}
                          <td className="p-2">
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="0.000"
                              value={row.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems((prev) => {
                                  const u = [...prev];
                                  u[index] = { ...u[index], quantity: val };
                                  return u;
                                });
                              }}
                              className="h-8 font-mono font-normal text-xs text-right px-1 rounded-md"
                            />
                          </td>

                          {/* Rate */}
                          <td className="p-2">
                            <div className="space-y-0.5">
                              <Input
                                type="number"
                                step="0.0001"
                                placeholder="0.00"
                                value={row.rate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItems((prev) => {
                                    const u = [...prev];
                                    u[index] = { ...u[index], rate: val };
                                    return u;
                                  });
                                }}
                                className="h-8 font-mono font-normal text-xs text-right px-1 rounded-md"
                              />
                              {row.suggestedRate && (
                                <div
                                  onClick={() => {
                                    setItems((prev) => {
                                      const u = [...prev];
                                      u[index] = {
                                        ...u[index],
                                        rate: row.suggestedRate!,
                                      };
                                      return u;
                                    });
                                  }}
                                  className="text-[9px] text-purple-600 dark:text-purple-400 font-normal cursor-pointer hover:underline truncate"
                                >
                                  Last: ₹{row.suggestedRate}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* GST % (Light weight font) */}
                          <td className="p-2">
                            <select
                              value={row.gstRate}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItems((prev) => {
                                  const u = [...prev];
                                  u[index] = { ...u[index], gstRate: val };
                                  return u;
                                });
                              }}
                              className="h-8 w-full text-xs font-normal rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-0.5 text-center font-mono"
                            >
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="0">0%</option>
                            </select>
                          </td>

                          {/* Taxable (Light weight font) */}
                          <td className="p-2 text-right font-mono font-normal text-foreground">
                            {formatNumber(calc.taxableAmount, 2)}
                          </td>

                          {/* Remove */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fast Summary Strip with Editable Discount & Editable Grand Total */}
          <Card className="border-purple-200 dark:border-purple-800/80 bg-gradient-to-br from-white to-purple-50/30 dark:from-[#181922] dark:to-purple-950/20 shadow-xs">
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Total Weight:
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {formatNumber(summary.totalQty, 3)} KG
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Subtotal (Taxable):
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {formatINR(summary.totalTaxable)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">
                    Discount (₹):
                  </span>
                  {discount && Number(discount) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDiscount("")}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="h-7 text-xs font-mono text-right bg-white dark:bg-[#181922] rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  {!isInterstate ? "CGST + SGST (5%)" : "IGST (5%)"}:
                </span>
                <span className="font-mono font-medium">
                  {formatINR(
                    !isInterstate
                      ? summary.totalCgst + summary.totalSgst
                      : summary.totalIgst
                  )}
                </span>
              </div>

              {summary.roundOff !== 0 && (
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Round Off:</span>
                  <span className="font-mono">
                    {summary.roundOff > 0 ? "+" : ""}
                    {formatINR(summary.roundOff)}
                  </span>
                </div>
              )}

              {/* Editable Grand Total */}
              <div className="flex justify-between items-center border-t border-purple-200 dark:border-purple-800/60 pt-2.5">
                <div>
                  <span className="font-bold text-sm uppercase text-foreground">
                    Grand Total:
                  </span>
                  {customGrandTotal && (
                    <button
                      type="button"
                      onClick={() => setCustomGrandTotal("")}
                      className="ml-2 text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-normal"
                    >
                      (Auto Reset)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(summary.grandTotal)}
                    value={customGrandTotal || String(summary.grandTotal)}
                    onChange={(e) => setCustomGrandTotal(e.target.value)}
                    className="h-8 w-36 font-mono font-bold text-base text-right bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 rounded-md"
                  />
                </div>
              </div>

              <div className="text-[10.5px] text-muted-foreground italic truncate pt-0.5">
                Words: <span className="font-medium text-foreground">{summary.amountInWords}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT SIDE: LIVE TEMPLATE PREVIEW (FIXED & NON-SCROLLABLE) ================= */}
        <div className="xl:col-span-6 sticky top-4 space-y-2">
          <Card className="border-[#ececee] dark:border-[#1a1822] shadow-sm overflow-hidden bg-zinc-100 dark:bg-[#121016]">
            {/* Live Preview Header Toolbar */}
            <CardHeader className="p-2.5 bg-white dark:bg-[#181922] border-b border-[#ececee] dark:border-[#2d2f39] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <span>Live Invoice Preview</span>
                  <Badge variant="outline" className="text-[10px] font-mono rounded-md font-medium">
                    {liveInvoice.invoiceNo}
                  </Badge>
                </CardTitle>
              </div>

              {/* Copy & Zoom selector */}
              <div className="flex items-center gap-2">
                {/* Zoom buttons */}
                <div className="hidden sm:flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-[10px] font-medium">
                  {[
                    { label: "Fit", value: 75 },
                    { label: "85%", value: 85 },
                    { label: "100%", value: 100 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setPreviewScale(item.value)}
                      className={`px-1.5 py-0.5 rounded transition-all ${previewScale === item.value
                        ? "bg-white dark:bg-zinc-700 text-foreground shadow-2xs font-semibold"
                        : "text-zinc-500 hover:text-foreground"
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Template Selector */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="bg-transparent text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer pr-1"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Copy type */}
                <div className="flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-[11px] font-medium">
                  {(["Original", "Duplicate", "Triplicate"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPreviewCopyType(type)}
                      className={`px-2 py-0.5 rounded transition-all ${previewCopyType === type
                        ? "bg-purple-600 text-white shadow-2xs font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            {/* Quick action bar */}
            <div className="px-2.5 py-1.5 bg-zinc-50 dark:bg-[#14121a] border-b border-[#ececee] dark:border-[#2d2f39] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-md flex items-center gap-1 shadow-2xs"
                >
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Download PDF</span>
                </Button>
                <Button
                  onClick={() => handlePrintLive("Original")}
                  className="h-7 px-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Original</span>
                </Button>
                <Button
                  onClick={() => handlePrintLive("Duplicate")}
                  variant="outline"
                  className="h-7 px-2 text-xs font-medium rounded-md flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Duplicate</span>
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  onClick={handleWhatsAppLive}
                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </Button>
                <Button
                  onClick={handleSaveInvoice}
                  className="h-7 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-xs rounded-md flex items-center gap-1 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Bill</span>
                </Button>
              </div>
            </div>

            {/* Fixed Non-Scrollable Rendered Live Template Sheet */}
            <CardContent className="p-3 bg-zinc-100 dark:bg-zinc-950/80 overflow-hidden flex justify-center items-start min-h-[640px]">
              <div
                className="transform origin-top transition-transform w-full flex justify-center"
                style={{
                  transform: `scale(${previewScale / 100})`,
                  transformOrigin: "top center",
                }}
              >
                <div className="shadow-md rounded-xs bg-white border border-zinc-300/80">
                  <InvoiceTemplate
                    invoice={liveInvoice}
                    settings={settings}
                    templateConfig={currentTemplate}
                    copyType={previewCopyType}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-semibold">
          Loading billing engine with live preview...
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}
