// Full Reactive State and Storage Manager for Dharmi Thread & Jari ERP

export type InvoiceSectionId =
  | "devotional"
  | "brand_header"
  | "invoice_title"
  | "receiver_meta"
  | "consignee"
  | "items_table"
  | "words_bank_tax"
  | "terms_signatory"
  | "custom_footer";

export interface InvoiceTemplateSection {
  id: InvoiceSectionId;
  name: string;
  enabled: boolean;
  minHeightPx?: number;
  heightPx?: number;
  paddingY?: "compact" | "normal" | "spacious";
  fontSizePx?: number;
  customTitle?: string;
}

export interface InvoiceCustomField {
  id: string;
  label: string;
  value: string;
  placement: "header_right" | "receiver_box" | "footer_left" | "footer_right";
}

export interface InvoiceElementStyle {
  fontSizePx?: number;
  fontFamily?: string;
  fontWeight?: string; // '400', '600', '700', '900', 'bold', 'black', 'normal'
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textTransform?: "uppercase" | "capitalize" | "none";
  color?: string;
  letterSpacing?: string;
}

export interface InvoiceElementMeta {
  key: string;
  label: string;
  defaultFontSizePx: number;
  section: string;
}

export const INVOICE_ELEMENTS: InvoiceElementMeta[] = [
  { key: "devotional_header", label: "Devotional Header", defaultFontSizePx: 9.5, section: "Header" },
  { key: "company_phones", label: "Header Phone Numbers", defaultFontSizePx: 9.0, section: "Header" },
  { key: "monogram_text", label: "Logo Initials / Monogram", defaultFontSizePx: 18.0, section: "Header" },
  { key: "monogram_subtext", label: "Logo Subtext", defaultFontSizePx: 7.0, section: "Header" },
  { key: "company_name", label: "Company Legal Name", defaultFontSizePx: 16.5, section: "Header" },
  { key: "company_address", label: "Company Address", defaultFontSizePx: 9.0, section: "Header" },
  { key: "company_gstin", label: "Company GSTIN", defaultFontSizePx: 10.0, section: "Header" },
  { key: "company_pan", label: "Company PAN", defaultFontSizePx: 10.0, section: "Header" },
  { key: "invoice_title", label: "Tax Invoice Banner Title", defaultFontSizePx: 12.0, section: "Title" },
  { key: "invoice_copy_type", label: "Copy Type Badge", defaultFontSizePx: 10.0, section: "Title" },
  { key: "receiver_title", label: "Receiver Box Title", defaultFontSizePx: 10.5, section: "Receiver" },
  { key: "receiver_name", label: "Buyer / Customer Name", defaultFontSizePx: 11.0, section: "Receiver" },
  { key: "receiver_address", label: "Buyer Address", defaultFontSizePx: 9.5, section: "Receiver" },
  { key: "receiver_city", label: "Buyer City", defaultFontSizePx: 9.5, section: "Receiver" },
  { key: "receiver_gstin", label: "Buyer GSTIN & State", defaultFontSizePx: 10.5, section: "Receiver" },
  { key: "bill_number", label: "Bill Number Box", defaultFontSizePx: 11.5, section: "Bill Meta" },
  { key: "bill_date", label: "Bill Date Box", defaultFontSizePx: 10.5, section: "Bill Meta" },
  { key: "ack_irn", label: "ACK No & IRN Hash", defaultFontSizePx: 8.5, section: "Bill Meta" },
  { key: "transport_meta", label: "E-Way & Transport Details", defaultFontSizePx: 8.5, section: "Bill Meta" },
  { key: "consignee_box", label: "Consignee / Shipped To Box", defaultFontSizePx: 9.5, section: "Consignee" },
  { key: "items_table_header", label: "Table Column Headers", defaultFontSizePx: 10.0, section: "Items Table" },
  { key: "items_table_body", label: "Table Product Rows", defaultFontSizePx: 10.5, section: "Items Table" },
  { key: "items_table_totals", label: "Table Total Row", defaultFontSizePx: 11.5, section: "Items Table" },
  { key: "amount_in_words", label: "Amount in Words", defaultFontSizePx: 10.0, section: "Summary" },
  { key: "bank_details", label: "Bank Account Details", defaultFontSizePx: 9.5, section: "Summary" },
  { key: "tax_breakdown", label: "Tax Breakdown Summary", defaultFontSizePx: 10.5, section: "Summary" },
  { key: "grand_total", label: "Total Bill Grand Total", defaultFontSizePx: 15.5, section: "Summary" },
  { key: "terms_conditions", label: "Terms & Conditions", defaultFontSizePx: 9.0, section: "Footer" },
  { key: "signatory_title", label: "Signatory Firm Title", defaultFontSizePx: 10.5, section: "Footer" },
  { key: "signatory_name", label: "Signatory Name / Signature", defaultFontSizePx: 18.0, section: "Footer" },
  { key: "signatory_label", label: "Signatory Designation Label", defaultFontSizePx: 9.0, section: "Footer" },
  { key: "custom_footer", label: "Custom Footer Note", defaultFontSizePx: 8.5, section: "Footer" },
];

export function getFontFamilyCSS(font?: string): string | undefined {
  if (!font) return undefined;
  switch (font) {
    case "Inter":
      return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    case "Roboto":
      return "'Roboto', sans-serif";
    case "Outfit":
      return "'Outfit', 'Plus Jakarta Sans', sans-serif";
    case "Poppins":
      return "'Poppins', sans-serif";
    case "serif":
      return "Georgia, 'Times New Roman', Cambria, serif";
    case "mono":
      return "'Courier New', Courier, monospace";
    case "Cinzel":
      return "'Cinzel', serif";
    case "Plus Jakarta Sans":
      return "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";
    default:
      return font;
  }
}

export function getElementEffectiveFontSize(
  elementKey: string | null | undefined,
  template: InvoiceTemplateConfig
): number {
  if (!elementKey) {
    return (
      template.fontSizePx ||
      (template.fontSize === "compact"
        ? 8.5
        : template.fontSize === "large"
        ? 11
        : 9.5)
    );
  }
  const custom = template.customStyles?.[elementKey];
  if (custom?.fontSizePx) return custom.fontSizePx;
  const meta = INVOICE_ELEMENTS.find((m) => m.key === elementKey);
  const baseDefault = template.fontSizePx || 9.5;
  const ratio = (meta?.defaultFontSizePx || 9.5) / 9.5;
  return Math.round(baseDefault * ratio * 10) / 10;
}

export interface InvoiceTemplateConfig {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  themeColor: string; // e.g. '#000000', '#4f46e5', '#0f766e', '#831843', '#b45309', '#1e293b'
  fontFamily: string; // 'Plus Jakarta Sans', 'Inter', 'Arial', 'Roboto', 'serif', 'mono', 'Poppins', 'Outfit'
  fontSize: "compact" | "standard" | "large";
  fontSizePx?: number; // Base font size in px (e.g. 8.5, 9, 9.5, 10, 10.5, 11, 12)
  borderStyle: "classic-border" | "double-border" | "minimal-border" | "borderless-modern";
  tableHeaderStyle: "light-gray" | "accent-filled" | "outlined" | "minimal";
  tableDensity: "compact" | "normal" | "spacious";
  showWatermark?: boolean;
  watermarkText?: string;
  showQrCode: boolean;
  showDevotionalHeader: boolean;
  showAckIrn: boolean;
  showVehicleTransport: boolean;
  showConsignee: boolean;
  showBankDetails: boolean;
  showAmountInWords: boolean;
  showTerms: boolean;
  showSignature: boolean;
  showTaxBreakdown: boolean;
  showDiscount: boolean;
  customFields: InvoiceCustomField[];
  sectionsOrder: InvoiceTemplateSection[];
  customStyles?: Record<string, InvoiceElementStyle>;
}

export interface BusinessSettings {
  companyName: string;
  devotionalHeader: string;
  tradeName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  pan: string;
  phone: string;
  phoneAlt: string;
  email: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  invoicePrefix: string;
  financialYear: string;
  startingInvoiceNo: number;
  roundOffMode: "nearest_1" | "nearest_5" | "nearest_10" | "none";
  termsAndConditions: string[];

  // Custom Branding, Logo & Signature
  logoType?: "monogram" | "image" | "none";
  logoUrl?: string;
  logoSize?: "small" | "medium" | "large";
  monogramText?: string;
  monogramSubtext?: string;

  signatureType?: "font" | "image";
  signatureUrl?: string;
  signatureSize?: "small" | "medium" | "large";
  signatureFont?: string;
  authorizedSignatoryName: string;
  signatoryFirmTitle?: string;
  signatoryLabel?: string;

  showQrCode?: boolean;
  qrCodeType?: "auto" | "upi" | "custom" | "none";
  qrCodeUrl?: string;
  upiId?: string;

  // Multiple Invoice Templates
  activeTemplateId?: string;
  templates?: InvoiceTemplateConfig[];
}


export interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  mobile: string;
  email?: string;
  openingBalance: number;
  currentBalance: number;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  hsn: string;
  unit: "KG" | "PCS" | "MTR" | "BOX" | "CONE";
  defaultRate: number;
  gstRate: number; // e.g. 5, 12, 18
  stock: number;
  category: string;
  description?: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  pricePerPiece?: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  netAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerStateCode: string;
  customerMobile: string;
  
  ackNo?: string;
  ackDate?: string;
  irn?: string;
  ewayBillNo?: string;
  vehicleNo?: string;
  transportNo?: string;

  items: InvoiceItem[];

  totalQuantity: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  discount?: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;

  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  notes?: string;
  createdAt: string;

  // Raw Bill & GST Conversion fields
  billType?: "gst" | "raw";
  sourceRawBillIds?: string[];
  convertedToInvoiceId?: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId?: string;
  invoiceNo?: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMode: "Cash" | "Bank Transfer (RTGS/NEFT)" | "Cheque" | "UPI";
  referenceNo?: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerRateMemory {
  id: string;
  customerId: string;
  productId: string;
  lastRate: number;
  lastBilledDate: string;
  invoiceNo: string;
}

export const defaultSectionsOrder: InvoiceTemplateSection[] = [
  { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true },
  { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true },
  { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true },
  { id: "receiver_meta", name: "Receiver Details & Bill Metadata Box", enabled: true },
  { id: "consignee", name: "Consignee / Shipped To (Optional)", enabled: false },
  { id: "items_table", name: "Itemized Product Table & GST Slabs", enabled: true },
  { id: "words_bank_tax", name: "Amount in Words, Bank Details & Tax Summary", enabled: true },
  { id: "terms_signatory", name: "Terms & Conditions + Authorized Signatory", enabled: true },
  { id: "custom_footer", name: "Custom Notes & Compliance Declaration", enabled: false },
];

export const defaultInvoiceTemplates: InvoiceTemplateConfig[] = [
  {
    id: "tpl_standard_gst",
    name: "Standard Surat GST Bill",
    description: "Official Surat GST Textile & Jari Tax Invoice with Bank Details",
    isDefault: true,
    themeColor: "#000000",
    fontFamily: "Plus Jakarta Sans",
    fontSize: "standard",
    borderStyle: "classic-border",
    tableHeaderStyle: "light-gray",
    tableDensity: "normal",
    showWatermark: false,
    watermarkText: "ORIGINAL",
    showQrCode: true,
    showDevotionalHeader: true,
    showAckIrn: false,
    showVehicleTransport: false,
    showConsignee: false,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true, heightPx: 34 },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true, heightPx: 110 },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true, heightPx: 36 },
      { id: "receiver_meta", name: "Receiver Details & Bill Metadata Box", enabled: true },
      { id: "consignee", name: "Consignee / Shipped To (Optional)", enabled: false },
      { id: "items_table", name: "Itemized Product Table & GST Slabs", enabled: true },
      { id: "words_bank_tax", name: "Amount in Words, Bank Details & Tax Summary", enabled: true },
      { id: "terms_signatory", name: "Terms & Conditions + Authorized Signatory", enabled: true },
      { id: "custom_footer", name: "Custom Notes & Compliance Declaration", enabled: false },
    ],
  },
  {
    id: "tpl_modern_indigo",
    name: "Modern Minimalist (Indigo)",
    description: "Sleek contemporary invoice with subtle Indigo accent headers, rounded aesthetics and clean typography",
    isDefault: false,
    themeColor: "#4f46e5",
    fontFamily: "Inter",
    fontSize: "standard",
    borderStyle: "minimal-border",
    tableHeaderStyle: "accent-filled",
    tableDensity: "normal",
    showWatermark: false,
    watermarkText: "PAID",
    showQrCode: true,
    showDevotionalHeader: true,
    showAckIrn: false,
    showVehicleTransport: false,
    showConsignee: false,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true, heightPx: 34 },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true, heightPx: 110 },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true, heightPx: 36 },
      { id: "receiver_meta", name: "Receiver Details & Bill Metadata Box", enabled: true },
      { id: "items_table", name: "Itemized Product Table & GST Slabs", enabled: true },
      { id: "words_bank_tax", name: "Amount in Words, Bank Details & Tax Summary", enabled: true },
      { id: "terms_signatory", name: "Terms & Conditions + Authorized Signatory", enabled: true },
    ],
  },
  {
    id: "tpl_detailed_logistics",
    name: "Detailed Logistics & Textile",
    description: "Expanded format with separate Consignee (Ship to), Transport LR, Delivery Challan, and Custom compliance boxes",
    isDefault: false,
    themeColor: "#0f766e",
    fontFamily: "Plus Jakarta Sans",
    fontSize: "compact",
    borderStyle: "double-border",
    tableHeaderStyle: "accent-filled",
    tableDensity: "compact",
    showWatermark: false,
    watermarkText: "ORIGINAL",
    showQrCode: true,
    showDevotionalHeader: true,
    showAckIrn: false,
    showVehicleTransport: false,
    showConsignee: true,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true, heightPx: 34 },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true, heightPx: 110 },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true, heightPx: 36 },
      { id: "receiver_meta", name: "Receiver Details & Bill Metadata Box", enabled: true },
      { id: "consignee", name: "Consignee / Shipped To (Optional)", enabled: true },
      { id: "items_table", name: "Itemized Product Table & GST Slabs", enabled: true },
      { id: "words_bank_tax", name: "Amount in Words, Bank Details & Tax Summary", enabled: true },
      { id: "terms_signatory", name: "Terms & Conditions + Authorized Signatory", enabled: true },
      { id: "custom_footer", name: "Custom Notes & Compliance Declaration", enabled: true },
    ],
  },
  {
    id: "tpl_compact_slip",
    name: "Compact Fast Slip",
    description: "Space-optimized slip layout suited for fast counter billing and reduced paper footprint",
    isDefault: false,
    themeColor: "#1e293b",
    fontFamily: "Roboto",
    fontSize: "compact",
    borderStyle: "borderless-modern",
    tableHeaderStyle: "light-gray",
    tableDensity: "compact",
    showWatermark: false,
    watermarkText: "",
    showQrCode: false,
    showDevotionalHeader: false,
    showAckIrn: false,
    showVehicleTransport: false,
    showConsignee: false,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: false,
    customFields: [],
    sectionsOrder: [
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true, heightPx: 110 },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true, heightPx: 36 },
      { id: "receiver_meta", name: "Receiver Details & Bill Metadata Box", enabled: true },
      { id: "items_table", name: "Itemized Product Table & GST Slabs", enabled: true },
      { id: "words_bank_tax", name: "Amount in Words, Bank Details & Tax Summary", enabled: true },
      { id: "terms_signatory", name: "Terms & Conditions + Authorized Signatory", enabled: true },
    ],
  },
];

export const defaultBusinessSettings: BusinessSettings = {
  companyName: "SHREE MANGALAM THREAD & JARI",
  devotionalHeader: "ll SHREE GANESHAY NAMAH ll",
  tradeName: "DHARMI THREAD & JARI",
  address: "SHOP NO.1,JAY NARAYAN IND.-1,ANJANA FARM,SURAT.",
  city: "Surat",
  state: "Gujarat",
  stateCode: "24",
  pincode: "395002",
  gstin: "24AEYPV3370E1Z1",
  pan: "AEYPV3370E",
  phone: "97235 44545",
  phoneAlt: "98248 55454",
  email: "dharmithreadjari@gmail.com",
  bankName: "KOTAK BANK",
  branchName: "VRAJBHUMI APT.",
  accountNumber: "9948291051",
  ifscCode: "KKBK0000883",
  invoicePrefix: "MTJ",
  financialYear: "2026-27",
  startingInvoiceNo: 145,
  roundOffMode: "nearest_1",
  termsAndConditions: [
    "1. Goods Once Sold Will Not Be Accepted.",
    "2. \"Subject to \"SURAT\" Jurisdiction. E.&.O.E\"",
  ],
  logoType: "monogram",
  logoUrl: "",
  monogramText: "SMJ",
  monogramSubtext: "THREAD & JARI",
  signatureType: "font",
  signatureUrl: "",
  signatureFont: "'Brush Script MT', cursive, sans-serif",
  authorizedSignatoryName: "Ketan",
  signatoryFirmTitle: "For SHREE MANGALAM THREAD & JARI",
  signatoryLabel: "(Authorised Signatory)",
  showQrCode: true,
  qrCodeType: "auto",
  qrCodeUrl: "",
  upiId: "9723544545@okaxis",
  activeTemplateId: "tpl_standard_gst",
  templates: defaultInvoiceTemplates,
};


export const defaultCustomers: Customer[] = [];

export const defaultProducts: Product[] = [];

export const defaultCustomerRates: CustomerRateMemory[] = [];

export const defaultInvoices: Invoice[] = [];

export const defaultPayments: PaymentRecord[] = [];

const STORAGE_KEY_PREFIX = "dharmi_erp_";

export class BillingStore {
  private static isBrowser = typeof window !== "undefined";
  private static listeners = new Set<() => void>();
  private static hasSynced = false;

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Listener error:", e);
      }
    });
  }

  private static getItem<T>(key: string, defaultVal: T): T {
    if (!this.isBrowser) return defaultVal;
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
      this.notifyListeners();
    } catch (e) {
      console.error("Storage save error:", e);
    }
  }

  private static async pushMutation(
    action: string,
    data?: any,
    id?: string
  ): Promise<void> {
    if (!this.isBrowser) return;
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data, id }),
      });
    } catch (err) {
      console.warn("Background Neon DB sync failed (will retry on next sync):", err);
    }
  }

  static async syncWithDatabase(): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) return false;
      const json = await res.json();
      if (!json.success || !json.data) return false;

      const { settings, customers, products, invoices, payments, customerRates } =
        json.data;

      if (settings) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "settings",
          JSON.stringify(settings)
        );
      }
      if (customers !== undefined && customers !== null) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "customers",
          JSON.stringify(customers)
        );
      }
      if (products !== undefined && products !== null) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "products",
          JSON.stringify(products)
        );
      }
      if (invoices !== undefined && invoices !== null) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "invoices",
          JSON.stringify(invoices)
        );
      }
      if (payments !== undefined && payments !== null) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "payments",
          JSON.stringify(payments)
        );
      }
      if (customerRates !== undefined && customerRates !== null) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "customer_rates",
          JSON.stringify(customerRates)
        );
      }

      this.hasSynced = true;
      this.recalculateAllCustomerBalances();
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn("Neon Database initial sync offline/delayed:", err);
      return false;
    }
  }

  static getSettings(): BusinessSettings {
    const loaded = this.getItem<BusinessSettings>("settings", defaultBusinessSettings);
    return { ...defaultBusinessSettings, ...loaded };
  }

  static saveSettings(settings: BusinessSettings): void {
    this.setItem("settings", settings);
    this.pushMutation("save_settings", settings);
  }

  static getCustomers(): Customer[] {
    return this.getItem<Customer[]>("customers", defaultCustomers);
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  static getCustomerBalance(customerId: string): {
    openingBalance: number;
    totalBilled: number;
    totalPaid: number;
    currentBalance: number;
    invoiceCount: number;
  } {
    const cust = this.getCustomerById(customerId);
    const opening = Number(cust?.openingBalance || 0);
    const custInvoices = this.getInvoicesByCustomer(customerId);
    const custPayments = this.getPaymentsByCustomer(customerId);

    // Exclude converted raw bills from totalBilled to prevent duplicate billing
    const totalBilled = custInvoices.reduce((sum, inv) => {
      if (inv.billType === "raw" && inv.convertedToInvoiceId) {
        return sum; // Already accounted for in the generated GST invoice!
      }
      return sum + (Number(inv.grandTotal) || 0);
    }, 0);
    const totalPaid = custPayments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );

    const currentBalance = Math.round((opening + totalBilled - totalPaid) * 100) / 100;

    return {
      openingBalance: opening,
      totalBilled,
      totalPaid,
      currentBalance,
      invoiceCount: custInvoices.length,
    };
  }

  static recalculateCustomerBalance(customerId: string): void {
    const customer = this.getCustomerById(customerId);
    if (!customer) return;

    const { currentBalance } = this.getCustomerBalance(customerId);
    if (customer.currentBalance !== currentBalance) {
      customer.currentBalance = currentBalance;
      this.saveCustomer(customer);
    }
  }

  static recalculateAllCustomerBalances(): void {
    const customers = this.getCustomers();
    const invoices = this.getInvoices();
    const payments = this.getPayments();

    let hasChanges = false;
    for (const cust of customers) {
      const opening = Number(cust.openingBalance || 0);
      const billed = invoices
        .filter((i) => i.customerId === cust.id && !(i.billType === "raw" && i.convertedToInvoiceId))
        .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const paid = payments
        .filter((p) => p.customerId === cust.id)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const trueBal = Math.round((opening + billed - paid) * 100) / 100;
      if (cust.currentBalance !== trueBal) {
        cust.currentBalance = trueBal;
        hasChanges = true;
        this.pushMutation("save_customer", cust);
      }
    }

    if (hasChanges && this.isBrowser) {
      this.setItem("customers", customers);
    }
  }

  static saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex((c) => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.unshift(customer);
    }
    this.setItem("customers", customers);
    this.pushMutation("save_customer", customer);
    return customer;
  }

  static deleteCustomer(id: string): void {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    this.setItem("customers", customers);
    this.pushMutation("delete_customer", undefined, id);
  }

  static getProducts(): Product[] {
    return this.getItem<Product[]>("products", defaultProducts);
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  static saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    this.setItem("products", products);
    this.pushMutation("save_product", product);
    return product;
  }

  static deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.setItem("products", products);
    this.pushMutation("delete_product", undefined, id);
  }

  static getCustomerRates(): CustomerRateMemory[] {
    return this.getItem("customer_rates", defaultCustomerRates);
  }

  static getSuggestedRate(customerId: string, productId: string): number | null {
    const rates = this.getCustomerRates();
    const match = rates.find(
      (r) => r.customerId === customerId && r.productId === productId
    );
    if (match) return match.lastRate;

    const prod = this.getProductById(productId);
    return prod ? prod.defaultRate : null;
  }

  static recordCustomerRate(
    customerId: string,
    productId: string,
    rate: number,
    invoiceNo: string
  ): void {
    const rates = this.getCustomerRates();
    const index = rates.findIndex(
      (r) => r.customerId === customerId && r.productId === productId
    );
    const entry: CustomerRateMemory = {
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId,
      productId,
      lastRate: rate,
      lastBilledDate: new Date().toISOString().split("T")[0],
      invoiceNo,
    };
    if (index >= 0) {
      rates[index] = entry;
    } else {
      rates.push(entry);
    }
    this.setItem("customer_rates", rates);
    this.pushMutation("save_rate", entry);
  }

  static getInvoices(): Invoice[] {
    return this.getItem("invoices", defaultInvoices);
  }

  static getInvoiceById(id: string): Invoice | undefined {
    return this.getInvoices().find(
      (inv) => inv.id === id || inv.invoiceNo === id
    );
  }

  static getInvoicesByCustomer(customerId: string): Invoice[] {
    return this.getInvoices().filter((inv) => inv.customerId === customerId);
  }

  static saveInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === invoice.id);
    if (index >= 0) {
      invoices[index] = invoice;
    } else {
      invoices.unshift(invoice);
    }
    this.setItem("invoices", invoices);
    this.pushMutation("save_invoice", invoice);

    invoice.items.forEach((item) => {
      if (item.productId && item.rate) {
        this.recordCustomerRate(
          invoice.customerId,
          item.productId,
          item.rate,
          invoice.invoiceNo
        );
      }
    });

    this.recalculateCustomerBalance(invoice.customerId);
    return invoice;
  }

  static deleteInvoice(id: string): void {
    const inv = this.getInvoiceById(id);
    const invoices = this.getInvoices().filter((i) => i.id !== id);
    this.setItem("invoices", invoices);
    this.pushMutation("delete_invoice", undefined, id);
    if (inv) {
      this.recalculateCustomerBalance(inv.customerId);
    }
  }

  static getRawBills(customerId?: string): Invoice[] {
    return this.getInvoices().filter(
      (inv) =>
        inv.billType === "raw" && (!customerId || inv.customerId === customerId)
    );
  }

  static getGstInvoices(customerId?: string): Invoice[] {
    return this.getInvoices().filter(
      (inv) =>
        inv.billType !== "raw" && (!customerId || inv.customerId === customerId)
    );
  }

  static markRawBillsConverted(rawBillIds: string[], gstInvoiceId: string): void {
    const invoices = this.getInvoices();
    let hasChanges = false;
    const updated = invoices.map((inv) => {
      if (rawBillIds.includes(inv.id)) {
        hasChanges = true;
        const modified = { ...inv, convertedToInvoiceId: gstInvoiceId };
        this.pushMutation("save_invoice", modified);
        return modified;
      }
      return inv;
    });

    if (hasChanges) {
      this.setItem("invoices", updated);
      this.recalculateAllCustomerBalances();
    }
  }

  static getPayments(): PaymentRecord[] {
    return this.getItem("payments", defaultPayments);
  }

  static getPaymentsByCustomer(customerId: string): PaymentRecord[] {
    return this.getPayments().filter((p) => p.customerId === customerId);
  }

  static recordPayment(payment: PaymentRecord): PaymentRecord {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.setItem("payments", payments);
    this.pushMutation("record_payment", payment);

    if (payment.invoiceId) {
      const invoices = this.getInvoices();
      const inv = invoices.find((i) => i.id === payment.invoiceId);
      if (inv) {
        inv.paidAmount = (inv.paidAmount || 0) + payment.amount;
        inv.remainingAmount = Math.max(0, inv.grandTotal - inv.paidAmount);
        inv.paymentStatus =
          inv.remainingAmount <= 0
            ? "paid"
            : inv.paidAmount > 0
            ? "partial"
            : "unpaid";
        this.setItem("invoices", invoices);
        this.pushMutation("save_invoice", inv);
      }
    }

    this.recalculateCustomerBalance(payment.customerId);
    return payment;
  }

  static getTemplates(): InvoiceTemplateConfig[] {
    const settings = this.getSettings();
    if (settings.templates && settings.templates.length > 0) {
      return settings.templates.map((t) => ({
        ...t,
        customFields: (t.customFields || []).filter(
          (cf) =>
            cf.id !== "cf_1" &&
            cf.id !== "cf_2" &&
            cf.id !== "cf_lr" &&
            cf.id !== "cf_broker"
        ),
      }));
    }
    return defaultInvoiceTemplates;
  }

  static getActiveTemplate(): InvoiceTemplateConfig {
    const settings = this.getSettings();
    const templates = this.getTemplates();
    const active = templates.find((t) => t.id === settings.activeTemplateId);
    if (active) return active;
    const def = templates.find((t) => t.isDefault);
    return def || templates[0] || defaultInvoiceTemplates[0];
  }

  static getTemplateById(id: string): InvoiceTemplateConfig | undefined {
    return this.getTemplates().find((t) => t.id === id);
  }

  static saveTemplate(template: InvoiceTemplateConfig): void {
    const settings = this.getSettings();
    const templates = [...this.getTemplates()];
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    settings.templates = templates;
    if (template.isDefault) {
      settings.activeTemplateId = template.id;
      templates.forEach((t) => {
        t.isDefault = t.id === template.id;
      });
    }
    this.saveSettings(settings);
  }

  static deleteTemplate(id: string): void {
    const settings = this.getSettings();
    let templates = this.getTemplates().filter((t) => t.id !== id);
    if (templates.length === 0) {
      templates = defaultInvoiceTemplates;
    }
    settings.templates = templates;
    if (settings.activeTemplateId === id) {
      settings.activeTemplateId = templates[0].id;
    }
    this.saveSettings(settings);
  }

  static setDefaultTemplate(id: string): void {
    const settings = this.getSettings();
    const templates = this.getTemplates().map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    settings.templates = templates;
    settings.activeTemplateId = id;
    this.saveSettings(settings);
  }

  static duplicateTemplate(id: string): InvoiceTemplateConfig {
    const existing = this.getTemplateById(id) || this.getActiveTemplate();
    const newTemplate: InvoiceTemplateConfig = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${existing.name} (Copy)`,
      isDefault: false,
    };
    this.saveTemplate(newTemplate);
    return newTemplate;
  }

  static resetData(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(STORAGE_KEY_PREFIX + "settings");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "customers");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "products");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "invoices");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "payments");
    localStorage.removeItem(STORAGE_KEY_PREFIX + "customer_rates");
    this.notifyListeners();
  }
}
