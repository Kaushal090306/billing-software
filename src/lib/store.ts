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
    description: "Official Surat GST Textile & Jari Tax Invoice with detailed ACK, IRN, and Bank Details",
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
    showAckIrn: true,
    showVehicleTransport: true,
    showConsignee: false,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [
      { id: "cf_1", label: "Agent / Broker", value: "Direct", placement: "header_right" },
      { id: "cf_2", label: "L.R. No.", value: "", placement: "header_right" },
    ],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true },
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
    showVehicleTransport: true,
    showConsignee: false,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true },
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
    showAckIrn: true,
    showVehicleTransport: true,
    showConsignee: true,
    showBankDetails: true,
    showAmountInWords: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakdown: true,
    showDiscount: true,
    customFields: [
      { id: "cf_lr", label: "L.R. No.", value: "", placement: "header_right" },
      { id: "cf_broker", label: "Broker / Agent", value: "", placement: "receiver_box" },
      { id: "cf_cases", label: "No. of Cases / Bags", value: "", placement: "footer_left" },
    ],
    sectionsOrder: [
      { id: "devotional", name: "Devotional Header & Phone Numbers", enabled: true },
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true },
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
      { id: "brand_header", name: "Company Brand Header (Logo/Title/GST/QR)", enabled: true },
      { id: "invoice_title", name: "Tax Invoice Banner & Copy Label", enabled: true },
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


export const defaultCustomers: Customer[] = [
  {
    id: "cust_1",
    businessName: "SHREE MANGALAM THREAD & JARI",
    contactPerson: "Ketan Bhai",
    gstin: "24AEYPV3370E1Z1",
    pan: "AEYPV3370E",
    address: "SHOP NO.1, JAY NARAYAN IND.-1, ANJANA FARM",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395002",
    mobile: "9723544545",
    email: "shreemangalam@example.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Regular wholesale customer for Jari Kasab and Viscose Yarn",
    createdAt: "2026-07-01T10:00:00Z",
  },
  {
    id: "cust_2",
    businessName: "NILKANTH YARN (નીલકંઠ યાર્ન)",
    contactPerson: "Haresh Bhai",
    gstin: "24ASVPG5889L1ZR",
    pan: "ASVPG5889L",
    address: "Plot No. 42, Sitaram Industrial Estate, Punagam",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395010",
    mobile: "9825166789",
    email: "nilkanthyarn@example.com",
    openingBalance: 0,
    currentBalance: 39302,
    notes: "Matches handwritten slip 87 / Jari Kasab buyer",
    createdAt: "2026-07-10T11:00:00Z",
  },
  {
    id: "cust_3",
    businessName: "SHREE RADHE EMBROIDERY & JARI",
    contactPerson: "Radheshyam Agrawal",
    gstin: "24AAAFR1294C1ZV",
    pan: "AAAFR1294C",
    address: "Shop 104-106, Kuberji Textile Park, Ring Road",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395002",
    mobile: "9824155220",
    email: "shreeradhe.surat@gmail.com",
    openingBalance: 0,
    currentBalance: 42450,
    notes: "High volume buyer for 120D Viscose & Metallic Gold Kasab",
    createdAt: "2026-07-15T10:30:00Z",
  },
  {
    id: "cust_4",
    businessName: "BHAGWATI THREADS & KASAB WORKS",
    contactPerson: "Pravinbhai Patel",
    gstin: "24ABXPB8742M1ZA",
    pan: "ABXPB8742M",
    address: "Plot No. 12, Jay Narayan Ind. Estate, Anjana Farm",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395002",
    mobile: "9898234567",
    email: "bhagwatithreads@yahoo.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Wholesale kasab thread job work party",
    createdAt: "2026-07-18T14:00:00Z",
  },
  {
    id: "cust_5",
    businessName: "BALAJI CREATIONS & EMBROIDERY",
    contactPerson: "Ghanshyamdas Sharma",
    gstin: "24AALCB9941L1Z9",
    pan: "AALCB9941L",
    address: "Block B-12, Sitaram Industrial Estate, Punagam",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395010",
    mobile: "9879012345",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Multi-head computerized embroidery machines",
    createdAt: "2026-07-22T09:15:00Z",
  },
  {
    id: "cust_6",
    businessName: "MAHALAXMI YARN AGENCIES",
    contactPerson: "Ashokbhai Shah",
    gstin: "24AAQFM4521J1ZT",
    pan: "AAQFM4521J",
    address: "B-204, Millennium Textile Market, Ring Road",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395002",
    mobile: "9825099881",
    email: "mahalaxmi.surat@outlook.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Yarn broker & wholesale distributor",
    createdAt: "2026-07-25T11:45:00Z",
  },
  {
    id: "cust_7",
    businessName: "SHIVAM SILK & THREAD TRADERS",
    contactPerson: "Sureshbhai Vaghani",
    gstin: "24AAGCS3321K1ZW",
    pan: "AAGCS3321K",
    address: "Shop 14, Somnath Complex, Dabholi Char Rasta",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395004",
    mobile: "9909944332",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Jacquard lace and jari border manufacturers",
    createdAt: "2026-08-01T15:20:00Z",
  },
  {
    id: "cust_8",
    businessName: "VRUNDAVAN EMBROIDERY HOUSE",
    contactPerson: "Mansukhbhai Gondaliya",
    gstin: "24AARPV9932E1Z8",
    pan: "AARPV9932E",
    address: "Plot 88, Katargam GIDC, Near Fulpada",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395004",
    mobile: "9824411990",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Saree designer & lace border unit",
    createdAt: "2026-08-05T12:00:00Z",
  },
  {
    id: "cust_9",
    businessName: "JAI HIND JARI EMPORIUM (BHIWANDI)",
    contactPerson: "Sunil Shinde",
    gstin: "27AAACJ8822L1ZY",
    pan: "AAACJ8822L",
    address: "G-14, Bhiwandi Textile Plaza, Agra Road, Bhiwandi",
    city: "Thane",
    state: "Maharashtra",
    stateCode: "27",
    pincode: "421302",
    mobile: "9820011445",
    email: "jaihind.bhiwandi@gmail.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Interstate IGST (State Code 27 - Maharashtra)",
    createdAt: "2026-08-10T10:00:00Z",
  },
  {
    id: "cust_10",
    businessName: "VARANASI BROCADE & SILK WORKS",
    contactPerson: "Anand Kumar Mishra",
    gstin: "09AAAFV5544P1Z3",
    pan: "AAAFV5544P",
    address: "K-44/12, Chowk Thatheri Bazaar, Varanasi",
    city: "Varanasi",
    state: "Uttar Pradesh",
    stateCode: "09",
    pincode: "221001",
    mobile: "9415088221",
    email: "varanasibrocade@rediffmail.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Interstate IGST (State Code 09 - UP) Pure Zari & Kasab weaver",
    createdAt: "2026-08-15T14:30:00Z",
  },
  {
    id: "cust_11",
    businessName: "JAIPUR GOTA PATTI & JARI TRADERS",
    contactPerson: "Ratanlal Sharma",
    gstin: "08AABCJ1188D1Z2",
    pan: "AABCJ1188D",
    address: "108, Johari Bazaar, Pink City",
    city: "Jaipur",
    state: "Rajasthan",
    stateCode: "08",
    pincode: "302003",
    mobile: "9829033441",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Interstate IGST (State Code 08 - Rajasthan) Gota patti kasab buyer",
    createdAt: "2026-08-20T16:10:00Z",
  },
  {
    id: "cust_12",
    businessName: "TIRUPATI EMBROIDERY & ACCESSORIES",
    contactPerson: "Venkat Ramanathan",
    gstin: "29AABCT3311E1Z5",
    pan: "AABCT3311E",
    address: "No. 45, Chickpet Main Road, Bengaluru",
    city: "Bengaluru",
    state: "Karnataka",
    stateCode: "29",
    pincode: "560053",
    mobile: "9845012993",
    email: "tirupati.textiles.blr@gmail.com",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Interstate IGST (State Code 29 - Karnataka)",
    createdAt: "2026-08-25T11:00:00Z",
  },
  {
    id: "cust_13",
    businessName: "GAYATRI THREAD MART",
    contactPerson: "Jayeshbhai Patel",
    gstin: "24AAOFG4412R1Z6",
    pan: "AAOFG4412R",
    address: "Shop 42, Sardar Textile Market, Ring Road",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395002",
    mobile: "9825677112",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Retail & semi-wholesale thread distributor",
    createdAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "cust_14",
    businessName: "KHODIYAR FASHION EMBROIDERY",
    contactPerson: "Lalitbhai Chovatiya",
    gstin: "24AAEFK7712N1Z4",
    pan: "AAEFK7712N",
    address: "Plot 24, Mini Bazaar, Varachha Road",
    city: "Surat",
    state: "Gujarat",
    stateCode: "24",
    pincode: "395006",
    mobile: "9879944556",
    openingBalance: 0,
    currentBalance: 0,
    notes: "Embroidery job works & kasab matching",
    createdAt: "2026-09-02T13:40:00Z",
  },
];

export const defaultProducts: Product[] = [
  {
    id: "prod_1",
    name: "VISCOSE YARN",
    hsn: "5403",
    unit: "KG",
    defaultRate: 328.5714,
    gstRate: 5,
    stock: 4500,
    category: "Yarn",
    description: "High quality premium Viscose Yarn for embroidery & weaving",
  },
  {
    id: "prod_2",
    name: "JARI KASAB",
    hsn: "5605002",
    unit: "KG",
    defaultRate: 333.3333,
    gstRate: 5,
    stock: 8200,
    category: "Jari",
    description: "Premium metallic Kasab Jari thread for embroidery machines",
  },
  {
    id: "prod_3",
    name: "JARI FANCY (જરી ફેન્સી)",
    hsn: "5605",
    unit: "KG",
    defaultRate: 345.0,
    gstRate: 5,
    stock: 2100,
    category: "Jari",
    description: "Fancy shiny Jari thread for borders & sarees",
  },
  {
    id: "prod_4",
    name: "JARI GOLD METALLIC",
    hsn: "5605",
    unit: "KG",
    defaultRate: 360.0,
    gstRate: 5,
    stock: 3400,
    category: "Jari",
    description: "Gold grade metallic yarn spool",
  },
  {
    id: "prod_5",
    name: "POLYESTER YARN (150D)",
    hsn: "5402",
    unit: "KG",
    defaultRate: 145.0,
    gstRate: 12,
    stock: 6500,
    category: "Yarn",
    description: "150 Denier bright polyester embroidery yarn",
  },
  {
    id: "prod_6",
    name: "EMBROIDERY BOBBIN THREAD",
    hsn: "5401",
    unit: "PCS",
    defaultRate: 48.0,
    gstRate: 5,
    stock: 12000,
    category: "Thread",
    description: "Prewound white bottom bobbin thread",
  },
];

export const defaultCustomerRates: CustomerRateMemory[] = [
  {
    id: "cr_1",
    customerId: "cust_1",
    productId: "prod_1",
    lastRate: 328.5714,
    lastBilledDate: "2026-07-31",
    invoiceNo: "MTJ/145",
  },
  {
    id: "cr_2",
    customerId: "cust_1",
    productId: "prod_2",
    lastRate: 333.3333,
    lastBilledDate: "2026-07-31",
    invoiceNo: "MTJ/145",
  },
  {
    id: "cr_3",
    customerId: "cust_2",
    productId: "prod_2",
    lastRate: 320.0,
    lastBilledDate: "2026-08-24",
    invoiceNo: "MTJ/146",
  },
];

export const defaultInvoices: Invoice[] = [
  {
    id: "inv_145",
    invoiceNo: "MTJ/145",
    date: "31/07/2026",
    customerId: "cust_1",
    customerName: "SHREE MANGALAM THREAD & JARI",
    customerGstin: "24AEYPV3370E1Z1",
    customerAddress: "SHOP NO.1,JAY NARAYAN IND.-1,ANJANA FARM,SURAT",
    customerCity: "SURAT",
    customerState: "Gujarat",
    customerStateCode: "24",
    customerMobile: "9723544545",
    ackNo: "162625465338519",
    ackDate: "02/08/2026 11:17:00 AM",
    irn: "124530801ecefda7fd4e0972ffe7a9a50d8f8f30e60086b9fe88e8e6828bb9ec",
    ewayBillNo: "",
    vehicleNo: "",
    transportNo: "",
    items: [
      {
        id: "item_1",
        productId: "prod_1",
        productName: "VISCOSE YARN",
        hsn: "5403",
        quantity: 63.0,
        unit: "KG",
        rate: 328.5714,
        taxableAmount: 20700.0,
        gstRate: 5,
        cgstAmount: 517.5,
        sgstAmount: 517.5,
        igstAmount: 0,
        netAmount: 21735.0,
      },
      {
        id: "item_2",
        productId: "prod_2",
        productName: "JARI KASAB",
        hsn: "5605002",
        quantity: 243.774,
        unit: "KG",
        rate: 333.3333,
        taxableAmount: 81258.0,
        gstRate: 5,
        cgstAmount: 2031.45,
        sgstAmount: 2031.45,
        igstAmount: 0,
        netAmount: 85320.9,
      },
    ],
    totalQuantity: 306.774,
    totalTaxable: 101958.0,
    totalCgst: 2548.95,
    totalSgst: 2548.95,
    totalIgst: 0,
    roundOff: 0.1,
    grandTotal: 107056.0,
    amountInWords: "ONE LAKH SEVEN THOUSAND FIFTY SIX RUPEES ONLY",
    paymentStatus: "paid",
    paidAmount: 107056.0,
    remainingAmount: 0,
    createdAt: "2026-07-31T14:30:00Z",
  },
  {
    id: "inv_146",
    invoiceNo: "MTJ/146",
    date: "24/08/2026",
    customerId: "cust_2",
    customerName: "NILKANTH YARN (નીલકંઠ યાર્ન)",
    customerGstin: "24ASVPG5889L1ZR",
    customerAddress: "Plot No. 42, Sitaram Industrial Estate, Punagam, Surat",
    customerCity: "SURAT",
    customerState: "Gujarat",
    customerStateCode: "24",
    customerMobile: "9825166789",
    items: [
      {
        id: "item_3",
        productId: "prod_2",
        productName: "JARI KASAB (જરી કસબ)",
        hsn: "5605",
        quantity: 116.97,
        unit: "KG",
        rate: 320.0,
        taxableAmount: 37430.48,
        gstRate: 5,
        cgstAmount: 935.76,
        sgstAmount: 935.76,
        igstAmount: 0,
        netAmount: 39302.0,
      },
    ],
    totalQuantity: 116.97,
    totalTaxable: 37430.48,
    totalCgst: 935.76,
    totalSgst: 935.76,
    totalIgst: 0,
    roundOff: 0.0,
    grandTotal: 39302.0,
    amountInWords: "THIRTY NINE THOUSAND THREE HUNDRED TWO RUPEES ONLY",
    paymentStatus: "unpaid",
    paidAmount: 0,
    remainingAmount: 39302.0,
    createdAt: "2026-08-24T12:15:00Z",
  },
  {
    id: "inv_147",
    invoiceNo: "MTJ/147",
    date: "05/09/2026",
    customerId: "cust_3",
    customerName: "SHREE RADHE EMBROIDERY & JARI",
    customerGstin: "24AAAFR1294C1ZV",
    customerAddress: "Shop 104-106, Kuberji Textile Park, Ring Road",
    customerCity: "SURAT",
    customerState: "Gujarat",
    customerStateCode: "24",
    customerMobile: "9824155220",
    items: [
      {
        id: "item_4",
        productId: "prod_3",
        productName: "JARI FANCY",
        hsn: "5605",
        quantity: 200.0,
        unit: "KG",
        rate: 345.0,
        taxableAmount: 69000.0,
        gstRate: 5,
        cgstAmount: 1725.0,
        sgstAmount: 1725.0,
        igstAmount: 0,
        netAmount: 72450.0,
      },
    ],
    totalQuantity: 200.0,
    totalTaxable: 69000.0,
    totalCgst: 1725.0,
    totalSgst: 1725.0,
    totalIgst: 0,
    roundOff: 0.0,
    grandTotal: 72450.0,
    amountInWords: "SEVENTY TWO THOUSAND FOUR HUNDRED FIFTY RUPEES ONLY",
    paymentStatus: "partial",
    paidAmount: 30000.0,
    remainingAmount: 42450.0,
    createdAt: "2026-09-05T15:00:00Z",
  },
];

export const defaultPayments: PaymentRecord[] = [
  {
    id: "pay_1",
    invoiceId: "inv_145",
    invoiceNo: "MTJ/145",
    customerId: "cust_1",
    customerName: "SHREE MANGALAM THREAD & JARI",
    amount: 107056.0,
    paymentMode: "Bank Transfer (RTGS/NEFT)",
    referenceNo: "KKBKR520260802099",
    paymentDate: "2026-08-02",
    notes: "Full payment received via Kotak RTGS",
    createdAt: "2026-08-02T16:45:00Z",
  },
  {
    id: "pay_2",
    invoiceId: "inv_147",
    invoiceNo: "MTJ/147",
    customerId: "cust_3",
    customerName: "SHREE RADHE EMBROIDERY & JARI",
    amount: 30000.0,
    paymentMode: "Cheque",
    referenceNo: "CHQ-882104",
    paymentDate: "2026-09-08",
    notes: "Part payment via HDFC Cheque",
    createdAt: "2026-09-08T11:20:00Z",
  },
];

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
      if (customers && customers.length > 0) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "customers",
          JSON.stringify(customers)
        );
      }
      if (products && products.length > 0) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "products",
          JSON.stringify(products)
        );
      }
      if (invoices && invoices.length > 0) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "invoices",
          JSON.stringify(invoices)
        );
      }
      if (payments && payments.length > 0) {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + "payments",
          JSON.stringify(payments)
        );
      }
      if (customerRates && customerRates.length > 0) {
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
    const loaded = this.getItem<Customer[]>("customers", defaultCustomers);
    const existingIds = new Set(loaded.map((c) => c.id));
    let hasNew = false;
    const merged = [...loaded];
    for (const def of defaultCustomers) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
        hasNew = true;
      }
    }
    if (hasNew && this.isBrowser) {
      this.setItem("customers", merged);
    }
    return merged;
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

    const totalBilled = custInvoices.reduce(
      (sum, inv) => sum + (Number(inv.grandTotal) || 0),
      0
    );
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
        .filter((i) => i.customerId === cust.id)
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
    const loaded = this.getItem<Product[]>("products", defaultProducts);
    const existingIds = new Set(loaded.map((p) => p.id));
    let hasNew = false;
    const merged = [...loaded];
    for (const def of defaultProducts) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
        hasNew = true;
      }
    }
    if (hasNew && this.isBrowser) {
      this.setItem("products", merged);
    }
    return merged;
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
      return settings.templates;
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
