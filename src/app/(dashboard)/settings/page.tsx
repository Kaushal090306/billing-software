"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BillingStore,
  BusinessSettings,
  InvoiceTemplateConfig,
  InvoiceSectionId,
  InvoiceCustomField,
  InvoiceElementStyle,
  INVOICE_ELEMENTS,
  defaultInvoiceTemplates,
  defaultSectionsOrder,
  getElementEffectiveFontSize,
  getFontFamilyCSS,
  Invoice,
} from "@/lib/store";
import { InvoiceTemplate } from "@/components/invoice/invoice-template";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Landmark,
  FileText,
  RotateCcw,
  Save,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  PenTool,
  Image as ImageIcon,
  QrCode,
  Sparkles,
  Trash2,
  Plus,
  Type,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  LayoutTemplate,
  Palette,
  Layers,
  FileCheck,
  Printer,
  Copy,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  Edit2,
  HelpCircle,
} from "lucide-react";
import { downloadInvoicePDF } from "@/lib/pdf-download";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(
    BillingStore.getSettings()
  );

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    "designer" | "company" | "bank" | "branding" | "terms_backup"
  >("designer");

  // Active Designer Sub-Tab
  const [designerSubTab, setDesignerSubTab] = useState<
    "sections" | "styles" | "fields" | "visibility"
  >("sections");

  // Template State
  const [templates, setTemplates] = useState<InvoiceTemplateConfig[]>(
    BillingStore.getTemplates()
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    settings.activeTemplateId || "tpl_standard_gst"
  );
  const [hoveredSection, setHoveredSection] = useState<InvoiceSectionId | null>(null);
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  // Live Preview Zoom Scale
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isDownloadingTest, setIsDownloadingTest] = useState<boolean>(false);

  // Modal / Inputs for Template Creation & Renaming
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedTitle, setRenamedTitle] = useState("");

  // Custom Field Form
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [newFieldPlacement, setNewFieldPlacement] = useState<
    "header_right" | "receiver_box" | "footer_left" | "footer_right"
  >("header_right");
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);

  const previewPrintRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = BillingStore.getSettings();
    setSettings(loaded);
    const tpls = BillingStore.getTemplates();
    setTemplates(tpls);
    if (loaded.activeTemplateId) {
      setActiveTemplateId(loaded.activeTemplateId);
    }

    const unsubscribe = BillingStore.subscribe(() => {
      const updated = BillingStore.getSettings();
      setSettings(updated);
      setTemplates(BillingStore.getTemplates());
    });
    return () => unsubscribe();
  }, []);

  // Current active template configuration object
  const currentTemplate: InvoiceTemplateConfig =
    templates.find((t) => t.id === activeTemplateId) ||
    templates[0] ||
    defaultInvoiceTemplates[0];

  // Sample Mock Invoice for Live Designer Preview
  const sampleInvoice: Invoice = {
    id: "sample_inv_101",
    invoiceNo: "MTJ/145",
    date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    customerId: "cust_sample",
    customerName: "SHREE RAM TEXTILES & JARI WORKS",
    customerGstin: "24AAECR1234F1Z5",
    customerAddress: "PLOT NO. 42, GIDC SACHIN INDUSTRIAL ESTATE, ROAD NO. 6",
    customerCity: "SURAT",
    customerState: "Gujarat",
    customerStateCode: "24",
    customerMobile: "98251 23456",
    ackNo: "162625465338519",
    ackDate: "16/09/2026 11:30:00 AM",
    irn: "124530801ecefda7fd4e0972ffe7a9a50d8f8f30e60086b9fe88e8e6828bb9ec",
    ewayBillNo: "241098765432",
    vehicleNo: "GJ-05-BT-4455",
    transportNo: "GUJARAT GOODS CARRIERS",
    items: [
      {
        id: "item_1",
        productId: "p_1",
        productName: "240D POLIESTER JARI KASAB (SILVER)",
        hsn: "56050020",
        quantity: 120.5,
        unit: "KG",
        rate: 333.3333,
        taxableAmount: 40166.66,
        gstRate: 5,
        cgstAmount: 1004.17,
        sgstAmount: 1004.17,
        igstAmount: 0,
        netAmount: 42175,
      },
      {
        id: "item_2",
        productId: "p_2",
        productName: "150/48 VISCOSE BRIGHT EMBROIDERY YARN",
        hsn: "54023100",
        quantity: 65.0,
        unit: "KG",
        rate: 290.0,
        taxableAmount: 18850.0,
        gstRate: 5,
        cgstAmount: 471.25,
        sgstAmount: 471.25,
        igstAmount: 0,
        netAmount: 19792.5,
      },
    ],
    totalQuantity: 185.5,
    totalTaxable: 59016.66,
    totalCgst: 1475.42,
    totalSgst: 1475.42,
    totalIgst: 0,
    roundOff: 0.5,
    grandTotal: 61968.0,
    amountInWords: "SIXTY ONE THOUSAND NINE HUNDRED SIXTY EIGHT RUPEES ONLY",
    paymentStatus: "unpaid",
    paidAmount: 0,
    remainingAmount: 61968.0,
    dueDate: "30/09/2026",
    notes: "Delivery via Surat Ring Road Godown",
    createdAt: new Date().toISOString(),
  };

  // Save Settings & Active Template
  const handleSaveAll = () => {
    BillingStore.saveSettings(settings);
    toast.success("Settings and invoice template customized successfully!");
  };

  // Update Reactive Business Settings
  const handleUpdateSettings = (updates: Partial<BusinessSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    BillingStore.saveSettings(updated);
  };

  // Update Current Template
  const updateCurrentTemplate = (updated: Partial<InvoiceTemplateConfig>) => {
    const updatedTpl: InvoiceTemplateConfig = {
      ...currentTemplate,
      ...updated,
    };
    BillingStore.saveTemplate(updatedTpl);
    setTemplates(BillingStore.getTemplates());
    setSettings(BillingStore.getSettings());
  };

  // Update Individual Element Style
  const handleUpdateElementStyle = (
    elementKey: string,
    styleUpdates: Partial<InvoiceElementStyle>
  ) => {
    const currentStyles = currentTemplate.customStyles || {};
    const currentElem = currentStyles[elementKey] || {};
    const updatedStyles: Record<string, InvoiceElementStyle> = {
      ...currentStyles,
      [elementKey]: {
        ...currentElem,
        ...styleUpdates,
      },
    };
    updateCurrentTemplate({ customStyles: updatedStyles });
  };

  // Reset Individual Element Style Override
  const handleResetElementStyle = (elementKey: string) => {
    const currentStyles = { ...(currentTemplate.customStyles || {}) };
    delete currentStyles[elementKey];
    updateCurrentTemplate({ customStyles: currentStyles });
  };

  // Move Section Up/Down by Array Index
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const sections = [...(currentTemplate.sectionsOrder || defaultSectionsOrder)];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const [moved] = sections.splice(index, 1);
    sections.splice(targetIndex, 0, moved);

    updateCurrentTemplate({ sectionsOrder: sections });
  };

  // Move Section Up/Down directly by Section ID (From In-Preview controls)
  const handleMoveSectionById = (sectionId: InvoiceSectionId, direction: "up" | "down") => {
    const sections = [...(currentTemplate.sectionsOrder || defaultSectionsOrder)];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;
    handleMoveSection(index, direction);
  };

  // Update Section Padding / Spacing (From In-Preview controls)
  const handleUpdateSectionPadding = (
    sectionId: InvoiceSectionId,
    padding: "compact" | "normal" | "spacious"
  ) => {
    const sections = (currentTemplate.sectionsOrder || defaultSectionsOrder).map((s) =>
      s.id === sectionId ? { ...s, paddingY: padding } : s
    );
    updateCurrentTemplate({ sectionsOrder: sections });
  };

  // Update Section Height directly via Dragging Divider Line
  const handleUpdateSectionHeight = (
    sectionId: InvoiceSectionId,
    heightPx: number
  ) => {
    const sections = (currentTemplate.sectionsOrder || defaultSectionsOrder).map((s) =>
      s.id === sectionId ? { ...s, minHeightPx: heightPx, heightPx } : s
    );
    updateCurrentTemplate({ sectionsOrder: sections });
  };

  // Toggle Section Visibility
  const handleToggleSection = (sectionId: InvoiceSectionId) => {
    const sections = (currentTemplate.sectionsOrder || defaultSectionsOrder).map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );

    // Also sync boolean flags for specific sections
    const updatePayload: Partial<InvoiceTemplateConfig> = { sectionsOrder: sections };
    if (sectionId === "devotional") {
      updatePayload.showDevotionalHeader = !currentTemplate.showDevotionalHeader;
    } else if (sectionId === "consignee") {
      updatePayload.showConsignee = !currentTemplate.showConsignee;
    }

    updateCurrentTemplate(updatePayload);
  };

  // Add Custom Detail Field
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) {
      toast.error("Please enter a field label (e.g., L.R. No., Broker Name)");
      return;
    }

    const field: InvoiceCustomField = {
      id: `cf_${Date.now()}`,
      label: newFieldLabel.trim(),
      value: newFieldValue.trim() || "-",
      placement: newFieldPlacement,
    };

    const updatedFields = [...(currentTemplate.customFields || []), field];
    updateCurrentTemplate({ customFields: updatedFields });

    setNewFieldLabel("");
    setNewFieldValue("");
    setShowAddFieldForm(false);
    toast.success(`Custom field "${field.label}" added to invoice template!`);
  };

  // Delete Custom Field
  const handleDeleteCustomField = (id: string) => {
    const updated = (currentTemplate.customFields || []).filter((f) => f.id !== id);
    updateCurrentTemplate({ customFields: updated });
    toast.success("Custom field removed");
  };

  // Create New Template
  const handleCreateNewTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const newTpl: InvoiceTemplateConfig = {
      ...JSON.parse(JSON.stringify(currentTemplate)),
      id: `tpl_${Date.now()}`,
      name: newTemplateName.trim(),
      isDefault: false,
    };

    BillingStore.saveTemplate(newTpl);
    setTemplates(BillingStore.getTemplates());
    setActiveTemplateId(newTpl.id);
    setNewTemplateName("");
    setShowNewTemplateModal(false);
    toast.success(`Created template "${newTpl.name}"!`);
  };

  // Duplicate Current Template
  const handleDuplicateTemplate = () => {
    const cloned = BillingStore.duplicateTemplate(currentTemplate.id);
    setTemplates(BillingStore.getTemplates());
    setActiveTemplateId(cloned.id);
    toast.success(`Duplicated into "${cloned.name}"!`);
  };

  // Delete Template
  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      toast.error("You must have at least one invoice template");
      return;
    }
    if (confirm(`Are you sure you want to delete template "${currentTemplate.name}"?`)) {
      BillingStore.deleteTemplate(id);
      const remaining = BillingStore.getTemplates();
      setTemplates(remaining);
      setActiveTemplateId(remaining[0].id);
      toast.success("Template deleted");
    }
  };

  // Set As Default Template
  const handleSetAsDefault = () => {
    BillingStore.setDefaultTemplate(currentTemplate.id);
    setTemplates(BillingStore.getTemplates());
    setSettings(BillingStore.getSettings());
    toast.success(`"${currentTemplate.name}" is now the default template for all bills!`);
  };

  // Rename Current Template
  const handleSaveRename = () => {
    if (!renamedTitle.trim()) return;
    updateCurrentTemplate({ name: renamedTitle.trim() });
    setIsRenaming(false);
    toast.success("Template renamed successfully!");
  };

  // Download Test PDF
  const handleDownloadTestPDF = async () => {
    try {
      setIsDownloadingTest(true);
      const target = previewPrintRef.current || document.getElementById("official-invoice-print-sheet");
      if (!target) {
        toast.error("Invoice preview not ready");
        return;
      }
      await downloadInvoicePDF(target, `Sample_${currentTemplate.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Downloaded sample invoice PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingTest(false);
    }
  };

  // Print Test Bill
  const handlePrintTest = () => {
    window.print();
  };

  // Image Upload Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file too large (max 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...settings, logoType: "image" as const, logoUrl: dataUrl };
      setSettings(updated);
      BillingStore.saveSettings(updated);
      toast.success("Company logo image updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Signature image file too large (max 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...settings, signatureType: "image" as const, signatureUrl: dataUrl };
      setSettings(updated);
      BillingStore.saveSettings(updated);
      toast.success("Authorized signature stamp updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...settings, qrCodeType: "custom" as const, qrCodeUrl: dataUrl };
      setSettings(updated);
      BillingStore.saveSettings(updated);
      toast.success("Custom QR Code image updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all settings and database records to default Dharmi Thread & Jari template?")) {
      BillingStore.resetData();
      setSettings(BillingStore.getSettings());
      setTemplates(BillingStore.getTemplates());
      toast.success("Data reset to default template!");
      window.location.reload();
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      settings: BillingStore.getSettings(),
      customers: BillingStore.getCustomers(),
      products: BillingStore.getProducts(),
      invoices: BillingStore.getInvoices(),
      payments: BillingStore.getPayments(),
      customerRates: BillingStore.getCustomerRates(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dharmi_billing_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded successfully!");
  };

  // Color preset swatches
  const colorPresets = [
    { name: "Classic Black", value: "#000000" },
    { name: "Royal Indigo", value: "#4f46e5" },
    { name: "Emerald Teal", value: "#0f766e" },
    { name: "Burgundy Wine", value: "#831843" },
    { name: "Amber Gold", value: "#b45309" },
    { name: "Slate Navy", value: "#1e293b" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Settings &amp; Invoice Designer</span>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold border-purple-200 dark:border-purple-800 rounded-md">
              Live Interactive
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visually customize your bill template layout, drag &amp; reorder sections, add custom fields, and manage multiple invoice templates with instant live preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveAll}
            className="h-9 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save All Settings</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border">
        <button
          onClick={() => setActiveTab("designer")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "designer"
              ? "bg-background text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutTemplate className="h-4 w-4 text-purple-600" />
          <span>Invoice Designer &amp; Live Preview</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "company"
              ? "bg-background text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>Company Details</span>
        </button>

        <button
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "branding"
              ? "bg-background text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="h-4 w-4 text-emerald-600" />
          <span>Logo &amp; Signature Stamp</span>
        </button>

        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "bank"
              ? "bg-background text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Landmark className="h-4 w-4 text-amber-600" />
          <span>Bank &amp; UPI QR</span>
        </button>

        <button
          onClick={() => setActiveTab("terms_backup")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "terms_backup"
              ? "bg-background text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-rose-600" />
          <span>Terms &amp; Cloud Backup</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVOICE DESIGNER & LIVE PREVIEW                                   */}
      {/* ========================================================================= */}
      {activeTab === "designer" && (
        <div className="space-y-4">
          {/* Top Template Switcher & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card rounded-lg border border-border shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <LayoutTemplate className="h-4 w-4 text-purple-600" />
                <span>Template:</span>
              </span>

              {/* Template Picker */}
              <div className="relative">
                <select
                  value={activeTemplateId}
                  onChange={(e) => setActiveTemplateId(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-md bg-muted/60 border border-border text-xs font-bold text-foreground outline-none cursor-pointer hover:bg-muted transition-colors"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.isDefault ? "★ (Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {currentTemplate.isDefault ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]">
                  ★ Default Template
                </Badge>
              ) : (
                <Button
                  onClick={handleSetAsDefault}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 cursor-pointer font-medium"
                >
                  <Check className="h-3 w-3" /> Set as Default
                </Button>
              )}

              {/* Rename button */}
              {isRenaming ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={renamedTitle}
                    onChange={(e) => setRenamedTitle(e.target.value)}
                    className="h-8 text-xs w-44"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveRename} className="h-8 px-2 text-xs bg-purple-600">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsRenaming(false)} className="h-8 px-2 text-xs">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRenamedTitle(currentTemplate.name);
                    setIsRenaming(true);
                  }}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" /> Rename
                </Button>
              )}
            </div>

            {/* Template Actions (New, Duplicate, Delete) */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setShowNewTemplateModal(true)}
                size="sm"
                className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> New Template
              </Button>

              <Button
                onClick={handleDuplicateTemplate}
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs cursor-pointer"
              >
                <Copy className="h-3 w-3" /> Duplicate
              </Button>

              {templates.length > 1 && (
                <Button
                  onClick={() => handleDeleteTemplate(currentTemplate.id)}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* New Template Modal */}
          {showNewTemplateModal && (
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>Create New Invoice Template</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Starts with current configuration as a base for easy customization.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Modern Minimalist Gold, Retail Cash Bill..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="h-8 text-xs w-64 bg-background"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleCreateNewTemplate}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* SPLIT SCREEN: LEFT CONTROLS + RIGHT LIVE PREVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Visual Customizer Controls */}
            <div className="lg:col-span-5 space-y-4">
              {/* Designer Sub-Tabs */}
              <div className="grid grid-cols-4 p-1 bg-muted/60 rounded-md border border-border text-center text-xs font-semibold">
                <button
                  onClick={() => setDesignerSubTab("sections")}
                  className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    designerSubTab === "sections"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  <span>Sections</span>
                </button>
                <button
                  onClick={() => setDesignerSubTab("styles")}
                  className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    designerSubTab === "styles"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette className="h-3.5 w-3.5 text-blue-600" />
                  <span>Styling</span>
                </button>
                <button
                  onClick={() => setDesignerSubTab("fields")}
                  className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    designerSubTab === "fields"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Custom Fields</span>
                </button>
                <button
                  onClick={() => setDesignerSubTab("visibility")}
                  className={`py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    designerSubTab === "visibility"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-amber-600" />
                  <span>Toggles</span>
                </button>
              </div>

              {/* 1. SECTIONS ORDER & DRAG/MOVE PANEL */}
              {designerSubTab === "sections" && (
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-purple-600" />
                        <span>Section Order &amp; Layout Hierarchy</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        Up / Down to Move
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px]">
                      Reorder sections directly on the bill or toggle visibility on and off.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2">
                    {(currentTemplate.sectionsOrder || defaultSectionsOrder).map((sec, idx, arr) => (
                      <div
                        key={sec.id}
                        onMouseEnter={() => setHoveredSection(sec.id)}
                        onMouseLeave={() => setHoveredSection(null)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          sec.enabled
                            ? "bg-card border-border hover:border-purple-300 dark:hover:border-purple-800"
                            : "bg-muted/40 border-dashed border-border/60 opacity-60"
                        } ${hoveredSection === sec.id ? "ring-2 ring-purple-500/40" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold truncate block text-foreground">
                              {sec.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {sec.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Visibility Eye */}
                          <button
                            type="button"
                            onClick={() => handleToggleSection(sec.id)}
                            title={sec.enabled ? "Hide Section" : "Show Section"}
                            className={`p-1.5 rounded hover:bg-muted transition-colors cursor-pointer ${
                              sec.enabled ? "text-purple-600" : "text-muted-foreground"
                            }`}
                          >
                            {sec.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>

                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, "up")}
                            title="Move Up"
                            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-foreground"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => handleMoveSection(idx, "down")}
                            title="Move Down"
                            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-foreground"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 2. STYLES & COLORS PANEL */}
              {designerSubTab === "styles" && (
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-blue-600" />
                      <span>Theme Colors, Typography &amp; Borders</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-4 text-xs">
                    {/* Accent Color Palette */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">
                        Primary Accent Theme Color
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {colorPresets.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => updateCurrentTemplate({ themeColor: c.value })}
                            className={`flex items-center gap-2 p-2 rounded-md border text-left cursor-pointer transition-all ${
                              currentTemplate.themeColor === c.value
                                ? "border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/20"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/20"
                              style={{ backgroundColor: c.value }}
                            />
                            <span className="text-[11px] font-medium truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Invoice Typography / Font
                      </Label>
                      <select
                        value={currentTemplate.fontFamily || "Plus Jakarta Sans"}
                        onChange={(e) => updateCurrentTemplate({ fontFamily: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                      >
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                        <option value="Inter">Inter (Sleek UI)</option>
                        <option value="Roboto">Roboto (Standard Compact)</option>
                        <option value="serif">Georgia / Classic Serif</option>
                        <option value="mono">Courier Monospace / Typewriter</option>
                      </select>
                    </div>

                    {/* Font Size & Density */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Font Size</Label>
                        <select
                          value={currentTemplate.fontSize || "standard"}
                          onChange={(e) =>
                            updateCurrentTemplate({
                              fontSize: e.target.value as "compact" | "standard" | "large",
                            })
                          }
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                        >
                          <option value="compact">Compact (8.5px)</option>
                          <option value="standard">Standard (9.5px)</option>
                          <option value="large">Large (10.5px)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Table Density</Label>
                        <select
                          value={currentTemplate.tableDensity || "normal"}
                          onChange={(e) =>
                            updateCurrentTemplate({
                              tableDensity: e.target.value as "compact" | "normal" | "spacious",
                            })
                          }
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                        >
                          <option value="compact">Compact (22 rows)</option>
                          <option value="normal">Normal (18 rows)</option>
                          <option value="spacious">Spacious (14 rows)</option>
                        </select>
                      </div>
                    </div>

                    {/* Border & Table Header Style */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Sheet Border Style</Label>
                        <select
                          value={currentTemplate.borderStyle || "classic-border"}
                          onChange={(e) =>
                            updateCurrentTemplate({
                              borderStyle: e.target.value as any,
                            })
                          }
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                        >
                          <option value="classic-border">Classic Solid 2px</option>
                          <option value="double-border">Double Border Line</option>
                          <option value="minimal-border">Minimal 1px Border</option>
                          <option value="borderless-modern">Frameless Modern</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Table Heading Style</Label>
                        <select
                          value={currentTemplate.tableHeaderStyle || "light-gray"}
                          onChange={(e) =>
                            updateCurrentTemplate({
                              tableHeaderStyle: e.target.value as any,
                            })
                          }
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                        >
                          <option value="light-gray">Subtle Gray Background</option>
                          <option value="accent-filled">Theme Accent Color Filled</option>
                          <option value="outlined">Minimal Outlined</option>
                        </select>
                      </div>
                    </div>

                    {/* Watermark Configuration */}
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Diagonal Bill Watermark
                        </Label>
                        <input
                          type="checkbox"
                          checked={Boolean(currentTemplate.showWatermark)}
                          onChange={(e) =>
                            updateCurrentTemplate({ showWatermark: e.target.checked })
                          }
                          className="h-4 w-4 rounded text-purple-600 cursor-pointer"
                        />
                      </div>
                      {currentTemplate.showWatermark && (
                        <Input
                          placeholder="e.g. ORIGINAL, DUPLICATE, PAID, SAMPLE"
                          value={currentTemplate.watermarkText || ""}
                          onChange={(e) =>
                            updateCurrentTemplate({ watermarkText: e.target.value })
                          }
                          className="h-8 text-xs bg-background uppercase font-bold"
                        />
                      )}
                    </div>

                    {/* Per-Element Custom Style Overrides Panel */}
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                          <Type className="h-3.5 w-3.5 text-purple-600" />
                          <span>Per-Element Custom Style Overrides</span>
                        </div>
                        {selectedElementKey && (
                          <Badge variant="outline" className="text-[10px] border-purple-400 text-purple-600">
                            Active Target: {INVOICE_ELEMENTS.find((m) => m.key === selectedElementKey)?.label || selectedElementKey}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Select any individual text or section to adjust its font size, font family, weight, and style independently.
                      </p>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-foreground">Select Element to Style</Label>
                        <select
                          value={selectedElementKey || ""}
                          onChange={(e) => setSelectedElementKey(e.target.value || null)}
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-none cursor-pointer"
                        >
                          <option value="">Choose an element to style...</option>
                          {INVOICE_ELEMENTS.map((el) => (
                            <option key={el.key} value={el.key}>
                              {el.label} {currentTemplate.customStyles?.[el.key] ? "(Customized)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedElementKey && (
                        <div className="p-2.5 bg-background rounded-md border border-purple-200 dark:border-purple-800 space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                              {INVOICE_ELEMENTS.find((m) => m.key === selectedElementKey)?.label || selectedElementKey}
                            </span>
                            {currentTemplate.customStyles?.[selectedElementKey] && (
                              <button
                                type="button"
                                onClick={() => handleResetElementStyle(selectedElementKey)}
                                className="text-[10.5px] font-bold text-amber-600 hover:underline cursor-pointer"
                              >
                                Reset Element Style
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Font Size Stepper */}
                            <div className="space-y-1">
                              <Label className="text-[10.5px]">Element Font Size</Label>
                              <div className="flex items-center gap-1 border rounded px-1.5 py-1 bg-muted/30">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = getElementEffectiveFontSize(selectedElementKey, currentTemplate);
                                    handleUpdateElementStyle(selectedElementKey, { fontSizePx: Math.max(6, Math.round((cur - 0.5) * 10) / 10) });
                                  }}
                                  className="px-2 py-0.5 text-xs font-bold rounded hover:bg-muted cursor-pointer"
                                >
                                  A-
                                </button>
                                <span className="flex-1 text-center font-mono font-bold text-xs text-purple-600">
                                  {getElementEffectiveFontSize(selectedElementKey, currentTemplate).toFixed(1)}px
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = getElementEffectiveFontSize(selectedElementKey, currentTemplate);
                                    handleUpdateElementStyle(selectedElementKey, { fontSizePx: Math.min(32, Math.round((cur + 0.5) * 10) / 10) });
                                  }}
                                  className="px-2 py-0.5 text-xs font-bold rounded hover:bg-muted cursor-pointer"
                                >
                                  A+
                                </button>
                              </div>
                            </div>

                            {/* Font Family */}
                            <div className="space-y-1">
                              <Label className="text-[10.5px]">Font Family</Label>
                              <select
                                value={currentTemplate.customStyles?.[selectedElementKey]?.fontFamily || ""}
                                onChange={(e) =>
                                  handleUpdateElementStyle(selectedElementKey, { fontFamily: e.target.value || undefined })
                                }
                                className="w-full h-7 px-1.5 rounded border text-xs bg-background outline-none cursor-pointer"
                              >
                                <option value="">Default ({currentTemplate.fontFamily || "Jakarta Sans"})</option>
                                <option value="Plus Jakarta Sans">Jakarta Sans</option>
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Outfit">Outfit</option>
                                <option value="Poppins">Poppins</option>
                                <option value="serif">Serif</option>
                                <option value="mono">Monospace</option>
                                <option value="Cinzel">Cinzel</option>
                                <option value="'Brush Script MT', cursive, sans-serif">Brush Script</option>
                              </select>
                            </div>
                          </div>

                          {/* Style Toggles */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const isB =
                                  currentTemplate.customStyles?.[selectedElementKey]?.fontWeight === "bold" ||
                                  currentTemplate.customStyles?.[selectedElementKey]?.fontWeight === "700";
                                handleUpdateElementStyle(selectedElementKey, { fontWeight: isB ? "normal" : "bold" });
                              }}
                              className={`flex-1 py-1 rounded text-xs font-black cursor-pointer border ${
                                currentTemplate.customStyles?.[selectedElementKey]?.fontWeight === "bold" ||
                                currentTemplate.customStyles?.[selectedElementKey]?.fontWeight === "700"
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Bold
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const isI = currentTemplate.customStyles?.[selectedElementKey]?.fontStyle === "italic";
                                handleUpdateElementStyle(selectedElementKey, { fontStyle: isI ? "normal" : "italic" });
                              }}
                              className={`flex-1 py-1 rounded text-xs italic font-serif cursor-pointer border ${
                                currentTemplate.customStyles?.[selectedElementKey]?.fontStyle === "italic"
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Italic
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const isU = currentTemplate.customStyles?.[selectedElementKey]?.textDecoration === "underline";
                                handleUpdateElementStyle(selectedElementKey, { textDecoration: isU ? "none" : "underline" });
                              }}
                              className={`flex-1 py-1 rounded text-xs underline cursor-pointer border ${
                                currentTemplate.customStyles?.[selectedElementKey]?.textDecoration === "underline"
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              Underline
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const isTT = currentTemplate.customStyles?.[selectedElementKey]?.textTransform === "uppercase";
                                handleUpdateElementStyle(selectedElementKey, { textTransform: isTT ? "none" : "uppercase" });
                              }}
                              className={`flex-1 py-1 rounded text-xs font-bold cursor-pointer border ${
                                currentTemplate.customStyles?.[selectedElementKey]?.textTransform === "uppercase"
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-muted text-foreground border-border"
                              }`}
                            >
                              ALL CAPS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. CUSTOM DETAIL FIELDS PANEL */}
              {designerSubTab === "fields" && (
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-emerald-600" />
                        <span>Custom Bill Detail Fields</span>
                      </CardTitle>
                      <Button
                        size="sm"
                        onClick={() => setShowAddFieldForm(true)}
                        className="h-7 px-2.5 text-[11px] gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Add Detail
                      </Button>
                    </div>
                    <CardDescription className="text-[11px]">
                      Add custom fields like L.R. No., Broker Name, Agent, or Compliance notes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3 text-xs">
                    {/* Add Field Form */}
                    {showAddFieldForm && (
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2.5 animate-in fade-in">
                        <div className="font-bold text-xs text-foreground">
                          Add New Custom Field
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px]">Field Label (e.g. L.R. No., Broker)</Label>
                          <Input
                            placeholder="e.g. L.R. No. / Dispatch Agent"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            className="h-8 text-xs bg-background"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px]">Default Value (Optional)</Label>
                          <Input
                            placeholder="e.g. Direct / By Road"
                            value={newFieldValue}
                            onChange={(e) => setNewFieldValue(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px]">Where on Bill</Label>
                          <select
                            value={newFieldPlacement}
                            onChange={(e) => setNewFieldPlacement(e.target.value as any)}
                            className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs font-medium outline-none cursor-pointer"
                          >
                            <option value="header_right">Top Right (With Bill No &amp; Date)</option>
                            <option value="receiver_box">Receiver Box (With Buyer Details)</option>
                            <option value="footer_left">Footer Left (Above Terms)</option>
                            <option value="footer_right">Footer Bottom Bar</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowAddFieldForm(false)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddCustomField}
                            className="h-7 text-xs bg-purple-600 text-white font-semibold"
                          >
                            Save Field
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing Custom Fields List */}
                    {(!currentTemplate.customFields || currentTemplate.customFields.length === 0) &&
                    !showAddFieldForm ? (
                      <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border space-y-2">
                        <Sliders className="h-6 w-6 mx-auto text-muted-foreground/60" />
                        <p className="text-xs">No custom detail fields added yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddFieldForm(true)}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add First Field
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(currentTemplate.customFields || []).map((cf) => (
                          <div
                            key={cf.id}
                            className="flex items-center justify-between p-2 rounded-md border border-border bg-card text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground">{cf.label}: </span>
                              <span className="text-muted-foreground">{cf.value || "-"}</span>
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 capitalize">
                                Placement: {cf.placement.replace("_", " ")}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCustomField(cf.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 4. VISIBILITY & METADATA TOGGLES PANEL */}
              {designerSubTab === "visibility" && (
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <span>Component Visibility &amp; Details Toggles</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2.5 text-xs">
                    {[
                      { key: "showDevotionalHeader", label: "Devotional Header (ll SHREE GANESHAY NAMAH ll)" },
                      { key: "showQrCode", label: "Digital Payment QR Code on Header" },
                      { key: "showAckIrn", label: "ACK No. & IRN E-Invoice Cryptographic Hash" },
                      { key: "showVehicleTransport", label: "E-Way Bill, Vehicle No. & Transport Name" },
                      { key: "showConsignee", label: "Consignee (Shipped-to Dispatch Details Box)" },
                      { key: "showBankDetails", label: "Bank Account & RTGS/IFSC Details Box" },
                      { key: "showAmountInWords", label: "Amount in Indian English Words" },
                      { key: "showTerms", label: "Terms & Conditions Clause List" },
                      { key: "showSignature", label: "Authorized Signatory Stamp & Signature" },
                      { key: "showTaxBreakdown", label: "CGST / SGST / IGST Tax Summary Box" },
                      { key: "showDiscount", label: "Item Discount Line in Summary" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <span className="font-medium text-foreground text-xs">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean((currentTemplate as any)[item.key])}
                          onChange={(e) =>
                            updateCurrentTemplate({ [item.key]: e.target.checked } as any)
                          }
                          className="h-4 w-4 rounded text-purple-600 cursor-pointer"
                        />
                      </label>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN: Real-Time Interactive Live Invoice Preview */}
            <div className="lg:col-span-7 sticky top-4 space-y-3">
              {/* Preview Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-card rounded-lg border border-border shadow-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-semibold flex items-center gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                    <Eye className="h-3.5 w-3.5 text-purple-600" />
                    <span>Live Interactive Canvas</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    &bull; Template: <strong className="text-foreground">{currentTemplate.name}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 text-xs">
                    <button
                      onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
                      title="Zoom Out"
                      className="p-1 rounded hover:bg-background cursor-pointer"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-1.5 font-mono text-[11px] font-bold">{previewZoom}%</span>
                    <button
                      onClick={() => setPreviewZoom((z) => Math.min(125, z + 10))}
                      title="Zoom In"
                      className="p-1 rounded hover:bg-background cursor-pointer"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Button
                    onClick={handleDownloadTestPDF}
                    disabled={isDownloadingTest}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs gap-1 cursor-pointer font-medium"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Test PDF</span>
                  </Button>

                  <Button
                    onClick={handlePrintTest}
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </Button>
                </div>
              </div>

              {/* In-Preview Quick Styling Toolbar */}
              {selectedElementKey ? (
                /* SELECTED ELEMENT ACTIVE FORMAT TOOLBAR */
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-purple-50/90 dark:bg-purple-950/50 rounded-lg border-2 border-purple-500 text-xs shadow-xs animate-in fade-in duration-150">
                  {/* Selected Element Label & Quick Switcher */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-purple-600 text-white rounded px-2 py-0.5 text-[10.5px] font-bold shadow-xs">
                      <Type className="h-3 w-3" />
                      <span>Selected:</span>
                      <span className="underline ml-0.5 max-w-[130px] truncate">
                        {INVOICE_ELEMENTS.find((m) => m.key === selectedElementKey)?.label ||
                          selectedElementKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedElementKey(null)}
                        title="Deselect (Return to global font)"
                        className="ml-1 p-0.5 hover:bg-purple-700 rounded cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <select
                      value={selectedElementKey}
                      onChange={(e) => setSelectedElementKey(e.target.value || null)}
                      className="h-6 px-1.5 rounded border border-purple-300 dark:border-purple-800 bg-background text-[11px] font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="">Document Default</option>
                      {INVOICE_ELEMENTS.map((el) => (
                        <option key={el.key} value={el.key}>
                          {el.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Controls: Size + Font + Styles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Selected Element Font Size A- / A+ */}
                    <div className="flex items-center gap-1 bg-background border border-purple-300 dark:border-purple-800 rounded px-1.5 py-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground mr-0.5">Size:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const curSize = getElementEffectiveFontSize(
                            selectedElementKey,
                            currentTemplate
                          );
                          const newSize = Math.max(6, Math.round((curSize - 0.5) * 10) / 10);
                          handleUpdateElementStyle(selectedElementKey, { fontSizePx: newSize });
                        }}
                        title="Decrease Selected Font Size (A-)"
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded hover:bg-muted cursor-pointer text-foreground"
                      >
                        A-
                      </button>
                      <span className="font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400 min-w-[32px] text-center">
                        {getElementEffectiveFontSize(
                          selectedElementKey,
                          currentTemplate
                        ).toFixed(1)}px
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const curSize = getElementEffectiveFontSize(
                            selectedElementKey,
                            currentTemplate
                          );
                          const newSize = Math.min(32, Math.round((curSize + 0.5) * 10) / 10);
                          handleUpdateElementStyle(selectedElementKey, { fontSizePx: newSize });
                        }}
                        title="Increase Selected Font Size (A+)"
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded hover:bg-muted cursor-pointer text-foreground"
                      >
                        A+
                      </button>
                    </div>

                    {/* Selected Font Family Dropdown */}
                    <select
                      value={
                        currentTemplate.customStyles?.[selectedElementKey]?.fontFamily || ""
                      }
                      onChange={(e) =>
                        handleUpdateElementStyle(selectedElementKey, {
                          fontFamily: e.target.value || undefined,
                        })
                      }
                      className="h-6 px-1.5 rounded border border-purple-300 dark:border-purple-800 bg-background text-[11px] font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="">
                        Inherit ({currentTemplate.fontFamily || "Jakarta Sans"})
                      </option>
                      <option value="Plus Jakarta Sans">Jakarta Sans</option>
                      <option value="Inter">Inter (Clean)</option>
                      <option value="Roboto">Roboto (Compact)</option>
                      <option value="Outfit">Outfit (Geometric)</option>
                      <option value="Poppins">Poppins (Modern)</option>
                      <option value="serif">Georgia (Classic Serif)</option>
                      <option value="mono">Courier (Monospace)</option>
                      <option value="Cinzel">Cinzel (Heritage)</option>
                      <option value="'Brush Script MT', cursive, sans-serif">Brush Script</option>
                    </select>

                    {/* Style Toggles: B, I, U, TT */}
                    <div className="flex items-center gap-0.5 bg-background border border-purple-300 dark:border-purple-800 rounded p-0.5">
                      {/* Bold */}
                      <button
                        type="button"
                        onClick={() => {
                          const isB =
                            currentTemplate.customStyles?.[selectedElementKey]?.fontWeight ===
                              "bold" ||
                            currentTemplate.customStyles?.[selectedElementKey]?.fontWeight ===
                              "700" ||
                            currentTemplate.customStyles?.[selectedElementKey]?.fontWeight ===
                              "900";
                          handleUpdateElementStyle(selectedElementKey, {
                            fontWeight: isB ? "normal" : "bold",
                          });
                        }}
                        title="Toggle Bold"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                          currentTemplate.customStyles?.[selectedElementKey]?.fontWeight ===
                            "bold" ||
                          currentTemplate.customStyles?.[selectedElementKey]?.fontWeight === "700"
                            ? "bg-purple-600 text-white"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        B
                      </button>

                      {/* Italic */}
                      <button
                        type="button"
                        onClick={() => {
                          const isI =
                            currentTemplate.customStyles?.[selectedElementKey]?.fontStyle ===
                            "italic";
                          handleUpdateElementStyle(selectedElementKey, {
                            fontStyle: isI ? "normal" : "italic",
                          });
                        }}
                        title="Toggle Italic"
                        className={`px-1.5 py-0.5 rounded text-[10px] italic font-serif cursor-pointer ${
                          currentTemplate.customStyles?.[selectedElementKey]?.fontStyle ===
                          "italic"
                            ? "bg-purple-600 text-white"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        I
                      </button>

                      {/* Underline */}
                      <button
                        type="button"
                        onClick={() => {
                          const isU =
                            currentTemplate.customStyles?.[selectedElementKey]?.textDecoration ===
                              "underline";
                          handleUpdateElementStyle(selectedElementKey, {
                            textDecoration: isU ? "none" : "underline",
                          });
                        }}
                        title="Toggle Underline"
                        className={`px-1.5 py-0.5 rounded text-[10px] underline cursor-pointer ${
                          currentTemplate.customStyles?.[selectedElementKey]?.textDecoration ===
                          "underline"
                            ? "bg-purple-600 text-white"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        U
                      </button>

                      {/* Uppercase */}
                      <button
                        type="button"
                        onClick={() => {
                          const isTT =
                            currentTemplate.customStyles?.[selectedElementKey]?.textTransform ===
                            "uppercase";
                          handleUpdateElementStyle(selectedElementKey, {
                            textTransform: isTT ? "none" : "uppercase",
                          });
                        }}
                        title="Toggle Uppercase"
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold cursor-pointer ${
                          currentTemplate.customStyles?.[selectedElementKey]?.textTransform ===
                          "uppercase"
                            ? "bg-purple-600 text-white"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        TT
                      </button>
                    </div>

                    {/* Reset Override */}
                    {currentTemplate.customStyles?.[selectedElementKey] && (
                      <button
                        type="button"
                        onClick={() => handleResetElementStyle(selectedElementKey)}
                        title="Reset Custom Style for this Element"
                        className="px-2 py-0.5 rounded text-[10.5px] font-bold text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* GLOBAL / BASE TEMPLATE TOOLBAR */
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/70 rounded-lg border border-border text-xs">
                  {/* Element Selector Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">Target:</span>
                    <select
                      value=""
                      onChange={(e) => setSelectedElementKey(e.target.value || null)}
                      className="h-6 px-1.5 rounded border border-border bg-background text-[11px] font-semibold text-foreground outline-none cursor-pointer max-w-[180px]"
                    >
                      <option value="">Whole Invoice Default</option>
                      {INVOICE_ELEMENTS.map((el) => (
                        <option key={el.key} value={el.key}>
                          {el.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Colors */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">Theme:</span>
                    <div className="flex items-center gap-1">
                      {colorPresets.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => updateCurrentTemplate({ themeColor: c.value })}
                          title={c.name}
                          className={`h-5 w-5 rounded-full border border-black/20 transition-transform cursor-pointer ${
                            currentTemplate.themeColor === c.value
                              ? "ring-2 ring-purple-600 scale-110 shadow-xs"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Global Font Size A- / A+ Controls */}
                  <div className="flex items-center gap-1 bg-background border border-border rounded px-1.5 py-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground mr-0.5">
                      Base Font:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSize = currentTemplate.fontSizePx || 9.5;
                        const newSize = Math.max(7.5, Math.round((currentSize - 0.5) * 10) / 10);
                        updateCurrentTemplate({ fontSizePx: newSize });
                      }}
                      title="Decrease Global Font Size (A-)"
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded hover:bg-muted cursor-pointer text-foreground"
                    >
                      A-
                    </button>
                    <span className="font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400 min-w-[28px] text-center">
                      {(currentTemplate.fontSizePx || 9.5).toFixed(1)}px
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSize = currentTemplate.fontSizePx || 9.5;
                        const newSize = Math.min(14, Math.round((currentSize + 0.5) * 10) / 10);
                        updateCurrentTemplate({ fontSizePx: newSize });
                      }}
                      title="Increase Global Font Size (A+)"
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded hover:bg-muted cursor-pointer text-foreground"
                    >
                      A+
                    </button>
                  </div>

                  {/* Quick Font Family & Table Density */}
                  <div className="flex items-center gap-2">
                    <select
                      value={currentTemplate.fontFamily || "Plus Jakarta Sans"}
                      onChange={(e) => updateCurrentTemplate({ fontFamily: e.target.value })}
                      className="h-6 px-1.5 rounded border border-border bg-background text-[11px] font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="Plus Jakarta Sans">Jakarta Sans</option>
                      <option value="Inter">Inter (Clean)</option>
                      <option value="Roboto">Roboto (Compact)</option>
                      <option value="Outfit">Outfit (Geometric)</option>
                      <option value="Poppins">Poppins (Modern)</option>
                      <option value="serif">Georgia (Classic Serif)</option>
                      <option value="mono">Courier (Monospace)</option>
                      <option value="Cinzel">Cinzel (Heritage)</option>
                    </select>

                    <select
                      value={currentTemplate.tableDensity || "normal"}
                      onChange={(e) =>
                        updateCurrentTemplate({
                          tableDensity: e.target.value as "compact" | "normal" | "spacious",
                        })
                      }
                      className="h-6 px-1.5 rounded border border-border bg-background text-[11px] font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="compact">22 Rows</option>
                      <option value="normal">18 Rows</option>
                      <option value="spacious">14 Rows</option>
                    </select>
                  </div>
                </div>
              )}

              {/* The Live Render Canvas */}
              <div className="p-4 sm:p-6 pt-10 sm:pt-14 pb-12 bg-zinc-200/80 dark:bg-zinc-950 rounded-xl border border-border overflow-x-auto max-h-[85vh] overflow-y-auto flex justify-center shadow-inner">
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease",
                  }}
                  className="shadow-2xl rounded-sm bg-white"
                >
                  <InvoiceTemplate
                    ref={previewPrintRef}
                    invoice={sampleInvoice}
                    settings={settings}
                    templateConfig={currentTemplate}
                    copyType="Original"
                    interactive={true}
                    hoveredSectionId={hoveredSection}
                    selectedElementKey={selectedElementKey}
                    onSelectElement={setSelectedElementKey}
                    onUpdateElementStyle={handleUpdateElementStyle}
                    onResetElementStyle={handleResetElementStyle}
                    onUpdateSettings={handleUpdateSettings}
                    onUpdateTemplate={updateCurrentTemplate}
                    onMoveSection={handleMoveSectionById}
                    onToggleSection={handleToggleSection}
                    onUpdateSectionPadding={handleUpdateSectionPadding}
                    onUpdateSectionHeight={handleUpdateSectionHeight}
                    onSectionClick={(secId) => {
                      setHoveredSection(secId);
                      setDesignerSubTab("sections");
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPANY PROFILE & DETAILS                                         */}
      {/* ========================================================================= */}
      {activeTab === "company" && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Business Profile &amp; GST Identification</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Company legal entity name, GSTIN, PAN, and address printed at the top of every bill.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Full Legal Company Name *</Label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Trade Name (Subtitle / Brand)</Label>
                <Input
                  value={settings.tradeName || ""}
                  onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Devotional Header Line</Label>
                <Input
                  value={settings.devotionalHeader}
                  onChange={(e) => setSettings({ ...settings, devotionalHeader: e.target.value })}
                  className="h-9 text-xs tracking-widest uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Shop / Mill / Factory Address *</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">City</Label>
                <Input
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pincode</Label>
                <Input
                  value={settings.pincode}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">State &amp; State Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    className="h-9 text-xs flex-1"
                  />
                  <Input
                    value={settings.stateCode}
                    onChange={(e) => setSettings({ ...settings, stateCode: e.target.value })}
                    className="h-9 text-xs w-16 font-mono text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">GSTIN No. *</Label>
                <Input
                  value={settings.gstin}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono uppercase font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">PAN Card No.</Label>
                <Input
                  value={settings.pan}
                  onChange={(e) => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Primary Mobile *</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="h-9 text-xs font-mono font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Alternate Mobile</Label>
                <Input
                  value={settings.phoneAlt}
                  onChange={(e) => setSettings({ ...settings, phoneAlt: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email Address</Label>
                <Input
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BRANDING, LOGO & SIGNATURE                                        */}
      {/* ========================================================================= */}
      {activeTab === "branding" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Logo & Monogram Master */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                <span>Company Logo &amp; Monogram Badge</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoType: "monogram" })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
                    settings.logoType === "monogram"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-3.5 w-3.5" /> Monogram Badge
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoType: "image" })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 cursor-pointer ${
                    settings.logoType === "image"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Image Logo
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoType: "none" })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs cursor-pointer ${
                    settings.logoType === "none"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  None
                </button>
              </div>

              {settings.logoType === "monogram" && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Monogram Initials</Label>
                      <Input
                        value={settings.monogramText || "SMJ"}
                        onChange={(e) => setSettings({ ...settings, monogramText: e.target.value })}
                        className="h-8 text-xs font-serif font-black tracking-wider"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subtext Banner</Label>
                      <Input
                        value={settings.monogramSubtext || "THREAD & JARI"}
                        onChange={(e) => setSettings({ ...settings, monogramSubtext: e.target.value })}
                        className="h-8 text-xs uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {settings.logoType === "image" && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Logo Image
                    </Button>
                    {settings.logoUrl && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Image Loaded
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature & Stamp Master */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PenTool className="h-4 w-4 text-emerald-600" />
                <span>Authorized Signatory &amp; Stamp</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Signatory Name *</Label>
                  <Input
                    value={settings.authorizedSignatoryName}
                    onChange={(e) =>
                      setSettings({ ...settings, authorizedSignatoryName: e.target.value })
                    }
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Firm Title (Top Line)</Label>
                  <Input
                    value={settings.signatoryFirmTitle || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, signatoryFirmTitle: e.target.value })
                    }
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, signatureType: "font" })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs cursor-pointer ${
                    settings.signatureType === "font"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stylized Script Font
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, signatureType: "image" })}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs cursor-pointer ${
                    settings.signatureType === "image"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload Stamp / Signature Image
                </button>
              </div>

              {settings.signatureType === "image" && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => sigInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Signature / Stamp PNG
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BANK ACCOUNT & UPI QR                                              */}
      {/* ========================================================================= */}
      {activeTab === "bank" && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-amber-600" />
              <span>Banking &amp; Digital UPI Payment Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Bank Name *</Label>
                <Input
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  className="h-9 text-xs font-semibold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Branch Name</Label>
                <Input
                  value={settings.branchName}
                  onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                  className="h-9 text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Current Account Number *</Label>
                <Input
                  value={settings.accountNumber}
                  onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">RTGS / IFSC Code *</Label>
                <Input
                  value={settings.ifscCode}
                  onChange={(e) => setSettings({ ...settings, ifscCode: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">UPI VPA ID (For Instant QR Payments)</Label>
                <Input
                  value={settings.upiId || ""}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                  className="h-9 text-xs font-mono"
                  placeholder="e.g. 9723544545@okaxis"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Custom QR Code Image (Optional)</Label>
                <div>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => qrInputRef.current?.click()}
                    className="h-9 text-xs gap-1.5 cursor-pointer w-full"
                  >
                    <QrCode className="h-4 w-4" /> Upload Custom QR Code Image
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TERMS & CLOUD BACKUP                                              */}
      {/* ========================================================================= */}
      {activeTab === "terms_backup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Terms & Conditions */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span>Invoice Terms &amp; Conditions Clauses</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              {(settings.termsAndConditions || []).map((term, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={term}
                    onChange={(e) => {
                      const updated = [...(settings.termsAndConditions || [])];
                      updated[idx] = e.target.value;
                      setSettings({ ...settings, termsAndConditions: updated });
                    }}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const updated = (settings.termsAndConditions || []).filter((_, i) => i !== idx);
                      setSettings({ ...settings, termsAndConditions: updated });
                    }}
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings({
                    ...settings,
                    termsAndConditions: [...(settings.termsAndConditions || []), ""],
                  })
                }
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Term Line
              </Button>
            </CardContent>
          </Card>

          {/* Database Backup & Reset */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Data Backup &amp; System Maintenance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                <div className="font-semibold text-foreground">Cloud Sync &amp; JSON Export</div>
                <p className="text-[11px] text-muted-foreground">
                  Download a complete backup snapshot of all invoices, customer rate histories, settings, and templates.
                </p>
                <Button
                  onClick={handleExportBackup}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download JSON Backup
                </Button>
              </div>

              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/60 space-y-2">
                <div className="font-semibold text-red-700 dark:text-red-400">Reset System Data</div>
                <p className="text-[11px] text-muted-foreground">
                  Restores default Dharmi Thread &amp; Jari configuration and templates.
                </p>
                <Button
                  onClick={handleResetDefaults}
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
