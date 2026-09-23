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
  numberToWordsIndian,
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
  const convertRawBillIdsParam = searchParams.get("convertRawBills");
  const rawParam =
    searchParams.get("billType") === "raw" || searchParams.get("type") === "raw";
  const initialBillType: "gst" | "raw" = rawParam ? "raw" : "gst";

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

  // Bill Type: GST Tax Invoice vs Raw Bill (Non-GST)
  const [billType, setBillType] = useState<"gst" | "raw">(initialBillType);
  const [sourceRawBillIds, setSourceRawBillIds] = useState<string[]>([]);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] =
    useState<boolean>(false);

  // Customer autofill fields - All EMPTY by default!
  const [customerName, setCustomerName] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerCity, setCustomerCity] = useState<string>("");
  const [customerState, setCustomerState] = useState<string>("");
  const [customerStateCode, setCustomerStateCode] = useState<string>("");
  const [customerMobile, setCustomerMobile] = useState<string>("");

  // Transport Fields
  const [showTransportFields, setShowTransportFields] =
    useState<boolean>(true);
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [ewayBillNo, setEwayBillNo] = useState<string>("");
  const [transportNo, setTransportNo] = useState<string>("");

  // Invoice Line Items - Start with clean blank row
  const [items, setItems] = useState<
    Array<{
      id: string;
      productId: string;
      productName: string;
      hsn: string;
      quantity: string | number;
      unit: string;
      rate: string | number;
      pricePerPiece?: string | number;
      finalAmount?: string | number;
      gstRate: number;
      suggestedRate: number | null;
      lastEditedField?: "rate" | "pricePerPiece" | "finalAmount";
    }>
  >([
    {
      id: "row_1",
      productId: "",
      productName: "",
      hsn: "5605",
      quantity: "",
      unit: "KG",
      rate: "",
      pricePerPiece: "",
      finalAmount: "",
      gstRate: initialBillType === "raw" ? 0 : 5,
      suggestedRate: null,
      lastEditedField: "pricePerPiece",
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

    // Generate Next Invoice Number based on effective bill type
    const isTargetRaw = rawParam && !convertRawBillIdsParam;
    if (isTargetRaw) {
      setBillType("raw");
      const rawCount = loadedInvoices.filter((i) => i.billType === "raw").length;
      setInvoiceNo(`RAW/${rawCount + 101}`);
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          gstRate: 0,
        }))
      );
    } else if (convertRawBillIdsParam) {
      setBillType("gst");
      const lastGstInv = loadedInvoices.find((i) => i.billType !== "raw")?.invoiceNo || "MTJ/144";
      const nextNo = generateNextInvoiceNumber(
        lastGstInv,
        loadedSettings.invoicePrefix || "MTJ",
        loadedSettings.financialYear || "2026-27"
      );
      setInvoiceNo(nextNo);
    } else if (billType === "raw") {
      const rawCount = loadedInvoices.filter((i) => i.billType === "raw").length;
      setInvoiceNo(`RAW/${rawCount + 101}`);
    } else {
      const lastGstInv = loadedInvoices.find((i) => i.billType !== "raw")?.invoiceNo || "MTJ/144";
      const nextNo = generateNextInvoiceNumber(
        lastGstInv,
        loadedSettings.invoicePrefix || "MTJ",
        loadedSettings.financialYear || "2026-27"
      );
      setInvoiceNo(nextNo);
    }

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
        setCustomerSearch(srcInv.customerName);

        setItems(
          srcInv.items.map((it, idx) => {
            const net = Number(it.netAmount) || Number(it.taxableAmount) || 0;
            const q = Number(it.quantity) || 0;
            const ppp = it.pricePerPiece ? Number(it.pricePerPiece) : (q > 0 ? net / q : 0);
            return {
              id: `row_${Date.now()}_${idx}`,
              productId: it.productId,
              productName: it.productName,
              hsn: it.hsn,
              quantity: it.quantity,
              unit: it.unit,
              rate: it.rate,
              pricePerPiece: ppp > 0 ? ppp.toFixed(2) : "",
              finalAmount: net > 0 ? net.toFixed(2) : "",
              gstRate: it.gstRate,
              suggestedRate: it.rate,
            };
          })
        );
        toast.info(`Cloned invoice details from ${srcInv.invoiceNo}`);
      }
    } else if (convertRawBillIdsParam) {
      // Convert selected Raw Bills into a single official GST Invoice
      const rawIds = convertRawBillIdsParam.split(",").filter(Boolean);
      setSourceRawBillIds(rawIds);
      setBillType("gst");

      const rawBills = rawIds
        .map((id) => BillingStore.getInvoiceById(id))
        .filter(Boolean) as Invoice[];

      if (rawBills.length > 0) {
        const firstRb = rawBills[0];
        const cust = loadedCustomers.find((c) => c.id === firstRb.customerId);
        if (cust) {
          handleSelectCustomer(cust);
        } else {
          setSelectedCustomerId(firstRb.customerId);
          setCustomerName(firstRb.customerName);
          setCustomerGstin(firstRb.customerGstin || "");
          setCustomerAddress(firstRb.customerAddress || "");
          setCustomerCity(firstRb.customerCity || "SURAT");
          setCustomerState(firstRb.customerState || "Gujarat");
          setCustomerStateCode(firstRb.customerStateCode || "24");
          setCustomerMobile(firstRb.customerMobile || "");
          setCustomerSearch(firstRb.customerName);
        }

        // Product aggregation: if products are same in raw bill then in final bill total the quantity!
        const productGroups: Record<
          string,
          {
            productId: string;
            productName: string;
            hsn: string;
            unit: string;
            quantity: number;
            rawTotalAmount: number;
            gstRate: number;
          }
        > = {};

        let totalRawBillsAmount = 0;
        for (const rb of rawBills) {
          totalRawBillsAmount += Number(rb.grandTotal) || 0;
          for (const it of rb.items) {
            const key = (it.productId || it.productName).trim().toUpperCase();
            if (!productGroups[key]) {
              const matchedProd = BillingStore.getProducts().find(
                (p) =>
                  p.id === it.productId ||
                  p.name.toUpperCase() === it.productName.toUpperCase()
              );
              const gst = matchedProd ? matchedProd.gstRate : (it.gstRate || 5);
              productGroups[key] = {
                productId: it.productId || "",
                productName: it.productName,
                hsn: it.hsn || "5605",
                unit: it.unit || "KG",
                quantity: 0,
                rawTotalAmount: 0,
                gstRate: gst || 5,
              };
            }
            productGroups[key].quantity += Number(it.quantity) || 0;
            const itemAmt =
              Number(it.netAmount) ||
              Number(it.taxableAmount) ||
              Number(it.quantity) * Number(it.rate) ||
              0;
            productGroups[key].rawTotalAmount += itemAmt;
          }
        }

        // Calculate backward GST-inclusive base rates so total matches exactly:
        const aggregatedItems = Object.values(productGroups).map((grp, idx) => {
          const gst = grp.gstRate || 5;
          const multiplier = 1 + gst / 100;
          const baseTaxable = Math.round((grp.rawTotalAmount / multiplier) * 100) / 100;
          const unitRate = grp.quantity > 0 ? baseTaxable / grp.quantity : 0;
          const ppp = grp.quantity > 0 ? grp.rawTotalAmount / grp.quantity : 0;
          return {
            id: `row_conv_${Date.now()}_${idx}`,
            productId: grp.productId,
            productName: grp.productName,
            hsn: grp.hsn,
            quantity: String(Math.round(grp.quantity * 1000) / 1000),
            unit: grp.unit,
            rate: unitRate.toFixed(4),
            pricePerPiece: ppp > 0 ? ppp.toFixed(2) : "",
            finalAmount: grp.rawTotalAmount.toFixed(2),
            gstRate: gst,
            suggestedRate: unitRate,
          };
        });

        setItems(aggregatedItems);
        setCustomGrandTotal(totalRawBillsAmount.toFixed(2));
        toast.success(
          `Loaded ${rawBills.length} Raw Bills! Final GST Total preserved at ${formatINR(totalRawBillsAmount)}`
        );
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
  }, [duplicateFromId, preselectedCustomerId, convertRawBillIdsParam, rawParam]);


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
      const isRaw = billType === "raw";
      const rt = suggested !== null ? suggested : prod.defaultRate;
      const gst = isRaw ? 0 : prod.gstRate;
      const ppp = isRaw ? rt : rt * (1 + gst / 100);
      const qNum = Number(updated[index].quantity) || 0;

      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productName: prod.name,
        hsn: prod.hsn,
        unit: prod.unit,
        gstRate: isRaw ? 0 : prod.gstRate,
        rate: isRaw ? rt.toFixed(2) : rt,
        pricePerPiece: ppp > 0 ? ppp.toFixed(2) : "",
        finalAmount: qNum > 0 && ppp > 0 ? (qNum * ppp).toFixed(2) : updated[index].finalAmount,
        suggestedRate: suggested,
        lastEditedField: "pricePerPiece",
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
        hsn: "5605",
        quantity: "",
        unit: "KG",
        rate: "",
        pricePerPiece: "",
        finalAmount: "",
        gstRate: billType === "raw" ? 0 : 5,
        suggestedRate: null,
        lastEditedField: "pricePerPiece",
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.info("Invoice must contain at least 1 line item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Customer selection helper
  const isInterstate = useMemo(() => {
    if (!customerStateCode) return false;
    const cleanCustomerCode = customerStateCode.replace(/\D/g, "");
    const cleanCompanyCode = (settings.stateCode || "24").replace(/\D/g, "");
    return cleanCustomerCode !== cleanCompanyCode;
  }, [customerStateCode, settings.stateCode]);

  // Real-time Summary Calculations with Discount & Custom Grand Total
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let rawTotal = 0;

    const isRaw = billType === "raw";

    items.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rt = Number(it.rate) || 0;
      const gst = isRaw ? 0 : (Number(it.gstRate) || 0);

      if (isRaw) {
        // Raw Bill: Total is purely Rate * Qty or entered Total Amount, ZERO GST!
        const lineTotal = it.finalAmount && Number(it.finalAmount) > 0
          ? Number(it.finalAmount)
          : Math.round(qty * rt * 100) / 100;

        totalQty += qty;
        totalTaxable += lineTotal;
        rawTotal += lineTotal;
      } else {
        const calc = calculateItemRow(qty, rt, gst, isInterstate);

        let itemTaxable = calc.taxableAmount;
        let itemCgst = calc.cgstAmount;
        let itemSgst = calc.sgstAmount;
        let itemIgst = calc.igstAmount;
        let itemTotal = calc.totalAmount;

        if (it.finalAmount && Number(it.finalAmount) > 0 && gst > 0) {
          const fa = Number(it.finalAmount);
          const totalGst = Math.round((fa * (gst / (100 + gst))) * 100) / 100;
          itemTaxable = Math.round((fa - totalGst) * 100) / 100;
          if (isInterstate) {
            itemIgst = totalGst;
            itemCgst = 0;
            itemSgst = 0;
          } else {
            itemCgst = Math.round((totalGst / 2) * 100) / 100;
            itemSgst = Math.round((totalGst - itemCgst) * 100) / 100;
            itemIgst = 0;
          }
          itemTotal = fa;
        }

        totalQty += qty;
        totalTaxable += itemTaxable;
        totalCgst += itemCgst;
        totalSgst += itemSgst;
        totalIgst += itemIgst;
        rawTotal += itemTotal;
      }
    });

    const disc = Math.max(0, Number(discount) || 0);
    rawTotal = Math.max(0, rawTotal - disc);

    let finalTotal = rawTotal;
    let roundOff = 0;

    if (customGrandTotal !== undefined && customGrandTotal !== null && customGrandTotal !== "" && !isNaN(Number(customGrandTotal))) {
      finalTotal = Math.max(0, Number(customGrandTotal));
      roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
    } else {
      if (isRaw) {
        finalTotal = Math.round(rawTotal * 100) / 100;
        roundOff = 0;
      } else if (roundOffMode === "nearest_1") {
        finalTotal = Math.round(rawTotal);
        roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
      } else if (roundOffMode === "nearest_5") {
        finalTotal = Math.round(rawTotal / 5) * 5;
        roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
      } else if (roundOffMode === "nearest_10") {
        finalTotal = Math.round(rawTotal / 10) * 10;
        roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;
      }
    }

    const amountInWords = numberToWordsIndian(finalTotal);

    return {
      totalQty: Math.round(totalQty * 1000) / 1000,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCgst: isRaw ? 0 : Math.round(totalCgst * 100) / 100,
      totalSgst: isRaw ? 0 : Math.round(totalSgst * 100) / 100,
      totalIgst: isRaw ? 0 : Math.round(totalIgst * 100) / 100,
      discount: disc,
      roundOff,
      grandTotal: finalTotal,
      amountInWords,
    };
  }, [items, isInterstate, roundOffMode, discount, customGrandTotal, billType]);

  // LIVE INVOICE OBJECT FOR REAL-TIME RIGHT PREVIEW
  const liveInvoice: Invoice = useMemo(() => {
    const isRaw = billType === "raw";
    const calculatedItems: InvoiceItem[] = items.map((it, idx) => {
      const qty = Number(it.quantity) || 0;
      const rt = Number(it.rate) || 0;
      const gst = isRaw ? 0 : (Number(it.gstRate) || 0);

      if (isRaw) {
        const lineTotal = it.finalAmount && Number(it.finalAmount) > 0
          ? Number(it.finalAmount)
          : Math.round(qty * rt * 100) / 100;
        const derivedRate = qty > 0 ? Math.round((lineTotal / qty) * 100) / 100 : rt;

        return {
          id: it.id || `live_${idx}`,
          productId: it.productId || `prod_${idx}`,
          productName: (it.productName || "JARI ITEM").toUpperCase(),
          hsn: it.hsn || "5605",
          quantity: qty,
          unit: it.unit || "KG",
          rate: derivedRate,
          pricePerPiece: derivedRate,
          taxableAmount: lineTotal,
          gstRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          netAmount: lineTotal,
        };
      }

      const calc = calculateItemRow(qty, rt, gst, isInterstate);

      let itemTaxable = calc.taxableAmount;
      let itemCgst = calc.cgstAmount;
      let itemSgst = calc.sgstAmount;
      let itemIgst = calc.igstAmount;
      let itemTotal = calc.totalAmount;

      if (it.finalAmount && Number(it.finalAmount) > 0 && gst > 0) {
        const fa = Number(it.finalAmount);
        const totalGst = Math.round((fa * (gst / (100 + gst))) * 100) / 100;
        itemTaxable = Math.round((fa - totalGst) * 100) / 100;
        if (isInterstate) {
          itemIgst = totalGst;
          itemCgst = 0;
          itemSgst = 0;
        } else {
          itemCgst = Math.round((totalGst / 2) * 100) / 100;
          itemSgst = Math.round((totalGst - itemCgst) * 100) / 100;
          itemIgst = 0;
        }
        itemTotal = fa;
      }

      let derivedRate = rt;
      if (it.finalAmount && Number(it.finalAmount) > 0 && qty > 0) {
        derivedRate = Math.round((itemTaxable / qty) * 10000) / 10000;
      }
      const ppp = it.pricePerPiece ? Number(it.pricePerPiece) : (qty > 0 ? itemTotal / qty : 0);

      return {
        id: it.id || `live_${idx}`,
        productId: it.productId || `prod_${idx}`,
        productName: (it.productName || "JARI ITEM").toUpperCase(),
        hsn: it.hsn || "5605",
        quantity: qty,
        unit: it.unit || "KG",
        rate: derivedRate,
        pricePerPiece: ppp > 0 ? Math.round(ppp * 100) / 100 : undefined,
        taxableAmount: itemTaxable,
        gstRate: it.gstRate,
        cgstAmount: itemCgst,
        sgstAmount: itemSgst,
        igstAmount: itemIgst,
        netAmount: itemTotal,
      };
    });

    return {
      id: "live_preview_invoice",
      invoiceNo: invoiceNo.trim().toUpperCase() || "MTJ/101",
      date: invoiceDate.trim() || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
      customerId: selectedCustomerId || "",
      customerName: customerName.trim().toUpperCase(),
      customerGstin: customerGstin.trim().toUpperCase(),
      customerAddress: customerAddress.trim().toUpperCase(),
      customerCity: customerCity.trim().toUpperCase() || "SURAT",
      customerState: customerState.trim() || "Gujarat",
      customerStateCode: customerStateCode.trim() || "24",
      customerMobile: customerMobile.trim(),

      ewayBillNo: ewayBillNo.trim(),
      vehicleNo: vehicleNo.trim(),
      transportNo: transportNo.trim(),

      items: calculatedItems,
      totalQuantity: summary.totalQty,
      totalTaxable: summary.totalTaxable,
      totalCgst: billType === "raw" ? 0 : summary.totalCgst,
      totalSgst: billType === "raw" ? 0 : summary.totalSgst,
      totalIgst: billType === "raw" ? 0 : summary.totalIgst,
      discount: summary.discount,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      amountInWords: summary.amountInWords,

      paymentStatus: "unpaid",
      paidAmount: 0,
      remainingAmount: summary.grandTotal,
      createdAt: new Date().toISOString(),
      billType,
      sourceRawBillIds: sourceRawBillIds.length > 0 ? sourceRawBillIds : undefined,
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
    ewayBillNo,
    vehicleNo,
    transportNo,
    items,
    isInterstate,
    summary,
    billType,
    sourceRawBillIds,
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
      billType,
      sourceRawBillIds: sourceRawBillIds.length > 0 ? sourceRawBillIds : undefined,
    };

    BillingStore.saveInvoice(invToSave);

    if (sourceRawBillIds.length > 0) {
      BillingStore.markRawBillsConverted(sourceRawBillIds, invToSave.id);
      toast.success(
        `Official GST Invoice ${invToSave.invoiceNo} converted from ${sourceRawBillIds.length} Raw Bills!`
      );
    } else {
      toast.success(
        `${billType === "raw" ? "Raw Bill" : "GST Invoice"} ${invToSave.invoiceNo} saved to database!`
      );
    }
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
            className="h-10 px-3.5 rounded-md border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-medium text-xs flex items-center gap-1.5 shadow-2xs"
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
            className="h-10 px-3.5 rounded-md font-medium text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <span>Print Invoice</span>
          </Button>

          <Button
            onClick={() => handlePrintLive("Duplicate")}
            variant="outline"
            className="h-10 px-3.5 rounded-md font-medium text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <span>Duplicate</span>
          </Button>

          <Button
            onClick={handleWhatsAppLive}
            className="h-10 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs"
            title="Share on WhatsApp"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
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
                {billType === "raw" ? (
                  <Badge className="font-semibold text-[10px] rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300">
                    RAW BILL (NO GST)
                  </Badge>
                ) : (
                  <Badge
                    variant={isInterstate ? "destructive" : "secondary"}
                    className="font-medium text-[10px] rounded-md"
                  >
                    {!isInterstate ? "CGST + SGST (5%) Intra" : "IGST (5%) Inter"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              {/* Bill Type Selector: Tax Invoice vs Raw Bill */}
              <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-[#181922] rounded-lg border border-[#ececee] dark:border-[#2d2f39] w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setBillType("gst");
                    setItems((prev) =>
                      prev.map((it) => {
                        const prod = products.find(
                          (p) =>
                            p.id === it.productId ||
                            p.name.toUpperCase() === it.productName.toUpperCase()
                        );
                        const catalogGst = prod ? prod.gstRate : 5;
                        const qNum = Number(it.quantity) || 0;
                        const pppNum = Number(it.pricePerPiece) || 0;
                        const rNum = Number(it.rate) || 0;
                        const faNum = Number(it.finalAmount) || 0;
                        let newRate = rNum;
                        if (pppNum > 0) {
                          newRate = pppNum / (1 + catalogGst / 100);
                        } else if (faNum > 0 && qNum > 0) {
                          newRate = (faNum / (1 + catalogGst / 100)) / qNum;
                        }
                        return {
                          ...it,
                          gstRate: catalogGst,
                          rate: newRate > 0 ? (newRate % 1 === 0 ? String(newRate) : newRate.toFixed(4)) : it.rate,
                        };
                      })
                    );
                    const lastGst = invoices.find((i) => i.billType !== "raw")?.invoiceNo || "MTJ/144";
                    setInvoiceNo(
                      generateNextInvoiceNumber(
                        lastGst,
                        settings.invoicePrefix || "MTJ",
                        settings.financialYear || "2026-27"
                      )
                    );
                    toast.info("Switched to Official GST Tax Invoice (GST applied)");
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    billType === "gst"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tax Invoice (GST)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillType("raw");
                    setItems((prev) =>
                      prev.map((it) => {
                        const qNum = Number(it.quantity) || 0;
                        const pppNum = Number(it.pricePerPiece) || 0;
                        const rNum = Number(it.rate) || 0;
                        const faNum = Number(it.finalAmount) || 0;
                        const unitRate =
                          pppNum > 0
                            ? pppNum
                            : rNum > 0
                            ? rNum
                            : qNum > 0 && faNum > 0
                            ? faNum / qNum
                            : 0;
                        const finalAmt =
                          faNum > 0
                            ? faNum
                            : qNum > 0 && unitRate > 0
                            ? qNum * unitRate
                            : 0;
                        return {
                          ...it,
                          gstRate: 0,
                          rate: unitRate > 0 ? (unitRate % 1 === 0 ? String(unitRate) : unitRate.toFixed(2)) : it.rate,
                          pricePerPiece: unitRate > 0 ? (unitRate % 1 === 0 ? String(unitRate) : unitRate.toFixed(2)) : it.pricePerPiece,
                          finalAmount: finalAmt > 0 ? finalAmt.toFixed(2) : it.finalAmount,
                        };
                      })
                    );
                    const rawCount = invoices.filter((i) => i.billType === "raw").length;
                    setInvoiceNo(`RAW/${rawCount + 101}`);
                    toast.info("Switched to Raw Bill (0% GST - Non-taxable delivery slip)");
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    billType === "raw"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Raw Bill (No GST)
                </button>
              </div>

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

              {/* Toggle Transport Fields */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTransportFields(!showTransportFields)}
                  className="flex items-center justify-between w-full text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline pt-1"
                >
                  <span>
                    {showTransportFields ? "Hide" : "Show"} E-Way Bill & Transport Fields
                  </span>
                  {showTransportFields ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showTransportFields && (
                  <div className="space-y-2 pt-2 border-t border-[#ececee] dark:border-[#2d2f39] mt-2">
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
              <div className="divide-y divide-[#ececee] dark:divide-[#2d2f39]">
                {items.map((row, index) => {
                  const qty = Number(row.quantity) || 0;
                  const rt = Number(row.rate) || 0;
                  const effectiveGst = billType === "raw" ? 0 : row.gstRate;
                  const calc = calculateItemRow(
                    qty,
                    rt,
                    effectiveGst,
                    isInterstate
                  );
                  const totalGstFromFinal =
                    row.finalAmount && Number(row.finalAmount) > 0 && effectiveGst > 0
                      ? Math.round(
                          (Number(row.finalAmount) * (effectiveGst / (100 + effectiveGst))) * 100
                        ) / 100
                      : null;
                  const rowTaxable =
                    totalGstFromFinal !== null
                      ? Math.round((Number(row.finalAmount) - totalGstFromFinal) * 100) / 100
                      : calc.taxableAmount;
                  const rowCgst =
                    totalGstFromFinal !== null
                      ? !isInterstate
                        ? Math.round((totalGstFromFinal / 2) * 100) / 100
                        : 0
                      : calc.cgstAmount;
                  const rowSgst =
                    totalGstFromFinal !== null
                      ? !isInterstate
                        ? Math.round((totalGstFromFinal - rowCgst) * 100) / 100
                        : 0
                      : calc.sgstAmount;
                  const rowIgst =
                    totalGstFromFinal !== null
                      ? isInterstate
                        ? totalGstFromFinal
                        : 0
                      : calc.igstAmount;

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
                    <div
                      key={row.id}
                      className={`p-3.5 hover:bg-zinc-50/60 dark:hover:bg-[#121016] transition-colors space-y-2.5 ${
                        activeProductDropdown === index ? "relative z-40" : "relative z-0"
                      }`}
                    >
                      {/* Row 1: Product Combobox (Wide), HSN, and Delete */}
                      <div className="flex items-center gap-2.5">
                        <span className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {/* Product Combobox - Takes maximum available width */}
                        <div
                          ref={(el) => {
                            productDropdownRefs.current[index] = el;
                          }}
                          className="flex-1 relative"
                        >
                          <div className="relative">
                            <Input
                              placeholder="TYPE OR SELECT PRODUCT..."
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
                              className="h-9 text-xs font-semibold uppercase bg-white dark:bg-[#181922] pr-7 rounded-md border-[#ececee] dark:border-[#2d2f39]"
                            />
                            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none opacity-60" />
                          </div>

                          {/* Suggestion Dropdown */}
                          {activeProductDropdown === index && (
                            <div className="absolute left-0 top-full mt-1 w-full max-w-[420px] bg-white dark:bg-[#181922] border border-[#ececee] dark:border-[#2d2f39] rounded-md shadow-2xl z-50 max-h-56 overflow-y-auto">
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

                        {/* HSN Code (Spacious & Clear) */}
                        <div className="w-28 shrink-0">
                          <Input
                            placeholder="HSN"
                            value={row.hsn}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) => {
                                const u = [...prev];
                                u[index] = { ...u[index], hsn: val };
                                return u;
                              });
                            }}
                            className="h-9 font-mono font-bold text-center text-xs px-2 rounded-md border-[#ececee] dark:border-[#2d2f39]"
                          />
                        </div>

                        {/* Remove Row Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-red-200"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Row 2: Large & Spacious Financial & Quantity Inputs */}
                      <div className="flex items-center gap-2.5 pl-10 flex-wrap sm:flex-nowrap">
                        {/* Quantity (Never truncated, plenty of width) */}
                        <div className="flex-1 min-w-[125px]">
                          <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                            Qty ({billType === "raw" ? "Unit" : "KG"})
                          </div>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            value={row.quantity}
                            onChange={(e) => {
                              const qVal = e.target.value;
                              setItems((prev) => {
                                const u = [...prev];
                                const item = { ...u[index], quantity: qVal };
                                const qNum = Number(qVal) || 0;
                                const isRaw = billType === "raw";
                                const gst = isRaw ? 0 : (item.gstRate || 0);
                                const pppNum = Number(item.pricePerPiece) || 0;
                                const faNum = Number(item.finalAmount) || 0;
                                const rNum = Number(item.rate) || 0;

                                const isFromTotal =
                                  item.lastEditedField === "finalAmount" ||
                                  (faNum > 0 && !item.pricePerPiece && !item.rate);

                                if (qNum > 0) {
                                  if (isFromTotal && faNum > 0) {
                                    item.lastEditedField = "finalAmount";
                                    if (isRaw) {
                                      const r = (faNum / qNum).toFixed(2);
                                      item.rate = r;
                                      item.pricePerPiece = r;
                                    } else {
                                      item.pricePerPiece = (faNum / qNum).toFixed(2);
                                      const baseTax = faNum / (1 + gst / 100);
                                      item.rate = (baseTax / qNum).toFixed(4);
                                    }
                                  } else {
                                    if (isRaw) {
                                      const unitRate = pppNum > 0 ? pppNum : rNum;
                                      if (unitRate > 0) {
                                        item.rate = unitRate.toFixed(2);
                                        item.pricePerPiece = unitRate.toFixed(2);
                                        item.finalAmount = (qNum * unitRate).toFixed(2);
                                      } else if (faNum > 0) {
                                        const r = (faNum / qNum).toFixed(2);
                                        item.rate = r;
                                        item.pricePerPiece = r;
                                        item.lastEditedField = "finalAmount";
                                      }
                                    } else {
                                      if (pppNum > 0) {
                                        const total = qNum * pppNum;
                                        item.finalAmount = total.toFixed(2);
                                        const baseTax = total / (1 + gst / 100);
                                        item.rate = (baseTax / qNum).toFixed(4);
                                      } else if (rNum > 0) {
                                        const ppp = rNum * (1 + gst / 100);
                                        item.pricePerPiece = ppp.toFixed(2);
                                        item.finalAmount = (qNum * ppp).toFixed(2);
                                      } else if (faNum > 0) {
                                        item.pricePerPiece = (faNum / qNum).toFixed(2);
                                        const baseTax = faNum / (1 + gst / 100);
                                        item.rate = (baseTax / qNum).toFixed(4);
                                        item.lastEditedField = "finalAmount";
                                      }
                                    }
                                  }
                                } else {
                                  if (isFromTotal) {
                                    item.pricePerPiece = "";
                                    item.rate = "";
                                  } else {
                                    item.finalAmount = "";
                                  }
                                }
                                u[index] = item;
                                return u;
                              });
                            }}
                            className="h-9 font-mono font-bold text-sm text-right px-2.5 rounded-md border-[#ececee] dark:border-[#2d2f39]"
                          />
                        </div>

                        {/* Price Per Piece (GST) / Unit Rate (Raw) */}
                        <div className="flex-1 min-w-[130px]">
                          <div className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-1">
                            {billType === "raw" ? "Rate (₹)" : "Price/Pc (Incl. GST)"}
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={billType === "raw" ? "Rate" : "0.00"}
                            value={billType === "raw" ? (row.rate ?? row.pricePerPiece ?? "") : (row.pricePerPiece ?? "")}
                            onChange={(e) => {
                              const pppVal = e.target.value;
                              setItems((prev) => {
                                const u = [...prev];
                                const item = {
                                  ...u[index],
                                  lastEditedField: "pricePerPiece" as const,
                                };
                                const pppNum = Number(pppVal) || 0;
                                const qNum = Number(item.quantity) || 0;
                                const isRaw = billType === "raw";
                                const gst = isRaw ? 0 : (item.gstRate || 0);

                                if (isRaw) {
                                  item.rate = pppVal;
                                  item.pricePerPiece = pppVal;
                                  if (pppNum > 0 && qNum > 0) {
                                    item.finalAmount = (qNum * pppNum).toFixed(2);
                                  } else if (pppVal === "") {
                                    item.finalAmount = "";
                                  }
                                } else {
                                  item.pricePerPiece = pppVal;
                                  if (pppNum > 0) {
                                    item.rate = (pppNum / (1 + gst / 100)).toFixed(4);
                                    if (qNum > 0) {
                                      item.finalAmount = (qNum * pppNum).toFixed(2);
                                    }
                                  } else if (pppVal === "") {
                                    item.rate = "";
                                    item.finalAmount = "";
                                  }
                                }
                                u[index] = item;
                                return u;
                              });
                            }}
                            className="h-9 font-mono font-bold text-sm text-right px-2.5 rounded-md border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 bg-purple-50/40 dark:bg-purple-950/30"
                          />
                        </div>

                        {/* Total Amount Input */}
                        <div className="flex-1 min-w-[140px]">
                          <div className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-1">
                            {billType === "raw" ? "Total (₹)" : "Total Amt (Incl. GST)"}
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={billType === "raw" ? "Total" : "Incl. GST"}
                            value={row.finalAmount ?? ""}
                            onChange={(e) => {
                              const faVal = e.target.value;
                              setItems((prev) => {
                                const u = [...prev];
                                const item = {
                                  ...u[index],
                                  finalAmount: faVal,
                                  lastEditedField: "finalAmount" as const,
                                };
                                const faNum = Number(faVal) || 0;
                                const qNum = Number(item.quantity) || 0;
                                const isRaw = billType === "raw";
                                const gst = isRaw ? 0 : (item.gstRate || 0);

                                if (faNum > 0) {
                                  if (isRaw) {
                                    if (qNum > 0) {
                                      const r = (faNum / qNum).toFixed(2);
                                      item.rate = r;
                                      item.pricePerPiece = r;
                                    } else {
                                      item.rate = "";
                                      item.pricePerPiece = "";
                                    }
                                  } else {
                                    if (qNum > 0) {
                                      item.pricePerPiece = (faNum / qNum).toFixed(2);
                                      const baseTax = faNum / (1 + gst / 100);
                                      item.rate = (baseTax / qNum).toFixed(4);
                                    } else {
                                      item.pricePerPiece = "";
                                      item.rate = "";
                                    }
                                  }
                                } else if (faVal === "") {
                                  item.pricePerPiece = "";
                                  item.rate = "";
                                }
                                u[index] = item;
                                return u;
                              });
                            }}
                            className="h-9 font-mono font-black text-sm text-right px-2.5 rounded-md border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-50 bg-purple-100/50 dark:bg-purple-900/30"
                          />
                        </div>

                        {/* GST Specific Inputs: Base Rate & GST % */}
                        {billType !== "raw" && (
                          <>
                            <div className="w-28 shrink-0">
                              <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                                <span>Base Rate</span>
                                {row.suggestedRate && (
                                  <span className="text-[9px] text-purple-600 font-mono">
                                    {row.suggestedRate.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                step="0.0001"
                                placeholder="0.00"
                                value={row.rate}
                                onChange={(e) => {
                                  const rVal = e.target.value;
                                  setItems((prev) => {
                                    const u = [...prev];
                                    const item = {
                                      ...u[index],
                                      rate: rVal,
                                      lastEditedField: "rate" as const,
                                    };
                                    const rNum = Number(rVal) || 0;
                                    const qNum = Number(item.quantity) || 0;
                                    const gst = item.gstRate || 0;

                                    if (rNum > 0) {
                                      const ppp = rNum * (1 + gst / 100);
                                      item.pricePerPiece = ppp.toFixed(2);
                                      if (qNum > 0) {
                                        item.finalAmount = (qNum * ppp).toFixed(2);
                                      }
                                    } else if (rVal === "") {
                                      item.pricePerPiece = "";
                                      item.finalAmount = "";
                                    }
                                    u[index] = item;
                                    return u;
                                  });
                                }}
                                className="h-9 font-mono text-xs text-right px-2 rounded-md border-[#ececee] dark:border-[#2d2f39]"
                              />
                            </div>

                            <div className="w-20 shrink-0">
                              <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                                GST %
                              </div>
                              <select
                                value={row.gstRate}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setItems((prev) => {
                                    const u = [...prev];
                                    const item = { ...u[index], gstRate: val };
                                    const faNum = Number(item.finalAmount) || 0;
                                    const pppNum = Number(item.pricePerPiece) || 0;
                                    const rNum = Number(item.rate) || 0;
                                    const qNum = Number(item.quantity) || 0;

                                    if (item.lastEditedField === "finalAmount" && faNum > 0) {
                                      const baseTax = faNum / (1 + val / 100);
                                      if (qNum > 0) {
                                        item.pricePerPiece = (faNum / qNum).toFixed(2);
                                        item.rate = (baseTax / qNum).toFixed(4);
                                      }
                                    } else if (pppNum > 0) {
                                      item.rate = (pppNum / (1 + val / 100)).toFixed(4);
                                      if (qNum > 0) {
                                        item.finalAmount = (qNum * pppNum).toFixed(2);
                                      }
                                    } else if (rNum > 0) {
                                      const ppp = rNum * (1 + val / 100);
                                      item.pricePerPiece = ppp.toFixed(2);
                                      if (qNum > 0) {
                                        item.finalAmount = (qNum * ppp).toFixed(2);
                                      }
                                    }
                                    u[index] = item;
                                    return u;
                                  });
                                }}
                                className="h-9 w-full rounded-md border border-[#ececee] dark:border-[#2d2f39] bg-white dark:bg-[#181922] px-1 text-xs font-mono font-semibold"
                              >
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="0">0%</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Row 3 (GST Mode Only): Live Tax Breakdown */}
                      {billType !== "raw" && (
                        <div className="flex items-center justify-between pl-10 pt-1 text-[11px] font-mono text-muted-foreground border-t border-dotted border-border">
                          <span>
                            Taxable:{" "}
                            <strong className="text-foreground font-semibold">
                              {formatINR(rowTaxable)}
                            </strong>
                          </span>
                          <div className="flex items-center gap-3">
                            {!isInterstate ? (
                              <>
                                <span>
                                  CGST:{" "}
                                  <strong className="text-foreground font-medium">
                                    {formatINR(rowCgst)}
                                  </strong>
                                </span>
                                <span>
                                  SGST:{" "}
                                  <strong className="text-foreground font-medium">
                                    {formatINR(rowSgst)}
                                  </strong>
                                </span>
                              </>
                            ) : (
                              <span>
                                IGST:{" "}
                                <strong className="text-foreground font-medium">
                                  {formatINR(rowIgst)}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  {billType === "raw" ? "Subtotal:" : "Subtotal (Taxable):"}
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

              {billType !== "raw" && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">
                    {!isInterstate ? "Total CGST + SGST" : "Total IGST"}:
                  </span>
                  <span className="font-mono font-medium">
                    {formatINR(
                      !isInterstate
                        ? summary.totalCgst + summary.totalSgst
                        : summary.totalIgst
                    )}
                  </span>
                </div>
              )}

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

                {/* Copy type dropdown */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                  <select
                    value={previewCopyType}
                    onChange={(e) =>
                      setPreviewCopyType(
                        e.target.value as "Original" | "Duplicate" | "Triplicate"
                      )
                    }
                    className="bg-transparent text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer pr-1"
                  >
                    <option value="Original" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      Original
                    </option>
                    <option value="Duplicate" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      Duplicate
                    </option>
                    <option value="Triplicate" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      Triplicate
                    </option>
                  </select>
                </div>
              </div>
            </CardHeader>

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
