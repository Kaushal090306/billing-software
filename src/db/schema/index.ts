import { pgTable, text, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. Business Profile & Settings
export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  devotionalHeader: text("devotional_header").default("ll SHREE GANESHAY NAMAH ll"),
  tradeName: text("trade_name"),
  address: text("address").notNull(),
  city: text("city").default("Surat"),
  state: text("state").default("Gujarat"),
  stateCode: text("state_code").default("24"),
  pincode: text("pincode").default("395010"),
  gstin: text("gstin").default("24AGQPT2491L1ZO"),
  pan: text("pan").default("BGOPV6750R"),
  phone: text("phone").default("99256 06480"),
  phoneAlt: text("phone_alt").default("97235 44545"),
  email: text("email"),
  bankName: text("bank_name").default("KOTAK BANK"),
  branchName: text("branch_name").default("VRAJBHUMI APT."),
  accountNumber: text("account_number").default("9948291051"),
  ifscCode: text("ifsc_code").default("KKBK0000883"),
  invoicePrefix: text("invoice_prefix").default("MTJ"),
  financialYear: text("financial_year").default("2026-27"),
  startingInvoiceNo: integer("starting_invoice_no").default(145),
  roundOffMode: text("round_off_mode").default("nearest_1"),
  termsAndConditions: jsonb("terms_and_conditions"),
  logoType: text("logo_type").default("monogram"),
  logoUrl: text("logo_url"),
  monogramText: text("monogram_text").default("DTJ"),
  monogramSubtext: text("monogram_subtext").default("DHARMI THREAD & JARI"),
  signatureType: text("signature_type").default("font"),
  signatureUrl: text("signature_url"),
  signatureFont: text("signature_font").default("Great Vibes"),
  authorizedSignatoryName: text("authorized_signatory_name").default("Pravinbhai K. Sheladiya"),
  signatoryFirmTitle: text("signatory_firm_title").default("FOR, DHARMI THREAD & JARI"),
  signatoryLabel: text("signatory_label").default("Authorised Signatory"),
  showQrCode: text("show_qr_code").default("true"),
  qrCodeType: text("qr_code_type").default("auto"),
  qrCodeUrl: text("qr_code_url"),
  upiId: text("upi_id").default("9925606480@kotak"),
  activeTemplateId: text("active_template_id").default("tpl_standard_gst"),
  templates: jsonb("templates"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 2. Customers
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull(),
  contactPerson: text("contact_person"),
  gstin: text("gstin"),
  pan: text("pan"),
  address: text("address"),
  city: text("city").default("Surat"),
  state: text("state").default("Gujarat"),
  stateCode: text("state_code").default("24"),
  pincode: text("pincode"),
  mobile: text("mobile").notNull(),
  email: text("email"),
  openingBalance: numeric("opening_balance").default("0"),
  currentBalance: numeric("current_balance").default("0"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 3. Products
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hsn: text("hsn").notNull(),
  unit: text("unit").default("KG").notNull(),
  defaultRate: numeric("default_rate").notNull(),
  gstRate: numeric("gst_rate").default("5").notNull(),
  stock: numeric("stock").default("0"),
  category: text("category").default("Jari"),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 4. Invoices
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  date: text("date").notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerGstin: text("customer_gstin"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerState: text("customer_state"),
  customerStateCode: text("customer_state_code"),
  customerMobile: text("customer_mobile"),
  
  ackNo: text("ack_no"),
  ackDate: text("ack_date"),
  irn: text("irn"),
  ewayBillNo: text("eway_bill_no"),
  vehicleNo: text("vehicle_no"),
  transportNo: text("transport_no"),

  items: jsonb("items").notNull(),
  totalQuantity: numeric("total_quantity").notNull(),
  totalTaxable: numeric("total_taxable").notNull(),
  totalCgst: numeric("total_cgst").default("0"),
  totalSgst: numeric("total_sgst").default("0"),
  totalIgst: numeric("total_igst").default("0"),
  roundOff: numeric("round_off").default("0"),
  grandTotal: numeric("grand_total").notNull(),
  amountInWords: text("amount_in_words").notNull(),

  paymentStatus: text("payment_status").default("unpaid").notNull(), // paid, partial, unpaid
  paidAmount: numeric("paid_amount").default("0"),
  remainingAmount: numeric("remaining_amount").default("0"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  billType: text("bill_type").default("gst"),
  sourceRawBillIds: jsonb("source_raw_bill_ids"),
  convertedToInvoiceId: text("converted_to_invoice_id"),
});

// 5. Payments
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id"),
  invoiceNo: text("invoice_no"),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  amount: numeric("amount").notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, Bank Transfer, Cheque, UPI
  referenceNo: text("reference_no"),
  paymentDate: text("payment_date").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 6. Customer Rate Memory
export const customerRates = pgTable("customer_rates", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  productId: text("product_id").notNull(),
  lastRate: numeric("last_rate").notNull(),
  lastBilledDate: text("last_billed_date").notNull(),
  invoiceNo: text("invoice_no").notNull(),
});
