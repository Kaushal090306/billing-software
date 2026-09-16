import { neon } from "@neondatabase/serverless";
import {
  defaultBusinessSettings,
  defaultCustomers,
  defaultProducts,
  defaultInvoices,
  defaultPayments,
  defaultCustomerRates,
} from "../lib/store";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_SRNJjlF7gIG5@ep-mute-dust-b38n2upd-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export async function runMigration() {
  console.log("Starting Neon PostgreSQL database migration...");
  const sql = neon(connectionString);

  try {
    // 1. Create business_settings table
    console.log("Creating table: business_settings");
    await sql`
      CREATE TABLE IF NOT EXISTS business_settings (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        devotional_header TEXT DEFAULT 'll SHREE GANESHAY NAMAH ll',
        trade_name TEXT,
        address TEXT NOT NULL,
        city TEXT DEFAULT 'Surat',
        state TEXT DEFAULT 'Gujarat',
        state_code TEXT DEFAULT '24',
        pincode TEXT DEFAULT '395010',
        gstin TEXT DEFAULT '24AGQPT2491L1ZO',
        pan TEXT DEFAULT 'BGOPV6750R',
        phone TEXT DEFAULT '99256 06480',
        phone_alt TEXT DEFAULT '97235 44545',
        email TEXT,
        bank_name TEXT DEFAULT 'KOTAK BANK',
        branch_name TEXT DEFAULT 'VRAJBHUMI APT.',
        account_number TEXT DEFAULT '9948291051',
        ifsc_code TEXT DEFAULT 'KKBK0000883',
        invoice_prefix TEXT DEFAULT 'MTJ',
        financial_year TEXT DEFAULT '2026-27',
        starting_invoice_no INTEGER DEFAULT 145,
        round_off_mode TEXT DEFAULT 'nearest_1',
        terms_and_conditions JSONB,
        logo_type TEXT DEFAULT 'monogram',
        logo_url TEXT,
        monogram_text TEXT DEFAULT 'DTJ',
        monogram_subtext TEXT DEFAULT 'DHARMI THREAD & JARI',
        signature_type TEXT DEFAULT 'font',
        signature_url TEXT,
        signature_font TEXT DEFAULT 'Great Vibes',
        authorized_signatory_name TEXT DEFAULT 'Pravinbhai K. Sheladiya',
        signatory_firm_title TEXT DEFAULT 'FOR, DHARMI THREAD & JARI',
        signatory_label TEXT DEFAULT 'Authorised Signatory',
        show_qr_code TEXT DEFAULT 'true',
        qr_code_type TEXT DEFAULT 'auto',
        qr_code_url TEXT,
        upi_id TEXT DEFAULT '9925606480@kotak',
        active_template_id TEXT DEFAULT 'tpl_standard_gst',
        templates JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS active_template_id TEXT DEFAULT 'tpl_standard_gst';`;
    await sql`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS templates JSONB;`;


    // 2. Create customers table
    console.log("Creating table: customers");
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        contact_person TEXT,
        gstin TEXT,
        pan TEXT,
        address TEXT,
        city TEXT DEFAULT 'Surat',
        state TEXT DEFAULT 'Gujarat',
        state_code TEXT DEFAULT '24',
        pincode TEXT,
        mobile TEXT NOT NULL,
        email TEXT,
        opening_balance NUMERIC DEFAULT 0,
        current_balance NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Create products table
    console.log("Creating table: products");
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hsn TEXT NOT NULL,
        unit TEXT DEFAULT 'KG' NOT NULL,
        default_rate NUMERIC NOT NULL,
        gst_rate NUMERIC DEFAULT 5 NOT NULL,
        stock NUMERIC DEFAULT 0,
        category TEXT DEFAULT 'Jari',
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Create invoices table
    console.log("Creating table: invoices");
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_gstin TEXT,
        customer_address TEXT,
        customer_city TEXT,
        customer_state TEXT,
        customer_state_code TEXT,
        customer_mobile TEXT,
        ack_no TEXT,
        ack_date TEXT,
        irn TEXT,
        eway_bill_no TEXT,
        vehicle_no TEXT,
        transport_no TEXT,
        items JSONB NOT NULL,
        total_quantity NUMERIC NOT NULL,
        total_taxable NUMERIC NOT NULL,
        total_cgst NUMERIC DEFAULT 0,
        total_sgst NUMERIC DEFAULT 0,
        total_igst NUMERIC DEFAULT 0,
        round_off NUMERIC DEFAULT 0,
        grand_total NUMERIC NOT NULL,
        amount_in_words TEXT NOT NULL,
        payment_status TEXT DEFAULT 'unpaid' NOT NULL,
        paid_amount NUMERIC DEFAULT 0,
        remaining_amount NUMERIC DEFAULT 0,
        due_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 5. Create payments table
    console.log("Creating table: payments");
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT,
        invoice_no TEXT,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        payment_mode TEXT NOT NULL,
        reference_no TEXT,
        payment_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Create customer_rates table
    console.log("Creating table: customer_rates");
    await sql`
      CREATE TABLE IF NOT EXISTS customer_rates (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        last_rate NUMERIC NOT NULL,
        last_billed_date TEXT NOT NULL,
        invoice_no TEXT NOT NULL
      );
    `;

    console.log("All tables verified successfully.");

    // Seed default records if empty
    console.log("Checking if seeding is needed...");

    // Seed Business Settings
    const existingSettings = await sql`SELECT id FROM business_settings LIMIT 1;`;
    if (existingSettings.length === 0) {
      console.log("Seeding default business settings...");
      await sql`
        INSERT INTO business_settings (
          id, company_name, devotional_header, trade_name, address, city, state, state_code, pincode,
          gstin, pan, phone, phone_alt, email, bank_name, branch_name, account_number, ifsc_code,
          invoice_prefix, financial_year, starting_invoice_no, round_off_mode, terms_and_conditions,
          logo_type, monogram_text, monogram_subtext, signature_type, signature_font,
          authorized_signatory_name, signatory_firm_title, signatory_label, show_qr_code, qr_code_type, upi_id
        ) VALUES (
          'primary_settings',
          ${defaultBusinessSettings.companyName},
          ${defaultBusinessSettings.devotionalHeader},
          ${defaultBusinessSettings.tradeName || 'DHARMI THREAD & JARI'},
          ${defaultBusinessSettings.address},
          ${defaultBusinessSettings.city},
          ${defaultBusinessSettings.state},
          ${defaultBusinessSettings.stateCode},
          ${defaultBusinessSettings.pincode},
          ${defaultBusinessSettings.gstin},
          ${defaultBusinessSettings.pan},
          ${defaultBusinessSettings.phone},
          ${defaultBusinessSettings.phoneAlt},
          ${defaultBusinessSettings.email},
          ${defaultBusinessSettings.bankName},
          ${defaultBusinessSettings.branchName},
          ${defaultBusinessSettings.accountNumber},
          ${defaultBusinessSettings.ifscCode},
          ${defaultBusinessSettings.invoicePrefix},
          ${defaultBusinessSettings.financialYear},
          ${defaultBusinessSettings.startingInvoiceNo},
          ${defaultBusinessSettings.roundOffMode},
          ${JSON.stringify(defaultBusinessSettings.termsAndConditions)},
          ${defaultBusinessSettings.logoType || 'monogram'},
          ${defaultBusinessSettings.monogramText || 'DTJ'},
          ${defaultBusinessSettings.monogramSubtext || 'DHARMI THREAD & JARI'},
          ${defaultBusinessSettings.signatureType || 'font'},
          ${defaultBusinessSettings.signatureFont || 'Great Vibes'},
          ${defaultBusinessSettings.authorizedSignatoryName},
          ${defaultBusinessSettings.signatoryFirmTitle || 'FOR, DHARMI THREAD & JARI'},
          ${defaultBusinessSettings.signatoryLabel || 'Authorised Signatory'},
          'true',
          'auto',
          ${defaultBusinessSettings.upiId || '9925606480@kotak'}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // Seed Customers
    const existingCustomers = await sql`SELECT count(*) FROM customers;`;
    if (Number(existingCustomers[0]?.count || 0) === 0) {
      console.log(`Seeding ${defaultCustomers.length} default customers...`);
      for (const cust of defaultCustomers) {
        await sql`
          INSERT INTO customers (
            id, business_name, contact_person, gstin, pan, address, city, state, state_code,
            pincode, mobile, email, opening_balance, current_balance, notes, created_at
          ) VALUES (
            ${cust.id}, ${cust.businessName}, ${cust.contactPerson || null}, ${cust.gstin || null},
            ${cust.pan || null}, ${cust.address || null}, ${cust.city || 'Surat'}, ${cust.state || 'Gujarat'},
            ${cust.stateCode || '24'}, ${cust.pincode || null}, ${cust.mobile}, ${cust.email || null},
            ${cust.openingBalance}, ${cust.currentBalance}, ${cust.notes || null}, ${cust.createdAt}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    // Seed Products
    const existingProducts = await sql`SELECT count(*) FROM products;`;
    if (Number(existingProducts[0]?.count || 0) === 0) {
      console.log(`Seeding ${defaultProducts.length} default products...`);
      for (const prod of defaultProducts) {
        await sql`
          INSERT INTO products (
            id, name, hsn, unit, default_rate, gst_rate, stock, category, description, created_at
          ) VALUES (
            ${prod.id}, ${prod.name}, ${prod.hsn}, ${prod.unit}, ${prod.defaultRate},
            ${prod.gstRate}, ${prod.stock}, ${prod.category}, ${prod.description || null},
            ${new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    // Seed Invoices
    const existingInvoices = await sql`SELECT count(*) FROM invoices;`;
    if (Number(existingInvoices[0]?.count || 0) === 0) {
      console.log(`Seeding ${defaultInvoices.length} default invoices...`);
      for (const inv of defaultInvoices) {
        await sql`
          INSERT INTO invoices (
            id, invoice_no, date, customer_id, customer_name, customer_gstin, customer_address,
            customer_city, customer_state, customer_state_code, customer_mobile, ack_no, ack_date,
            irn, eway_bill_no, vehicle_no, transport_no, items, total_quantity, total_taxable,
            total_cgst, total_sgst, total_igst, round_off, grand_total, amount_in_words,
            payment_status, paid_amount, remaining_amount, due_date, notes, created_at
          ) VALUES (
            ${inv.id}, ${inv.invoiceNo}, ${inv.date}, ${inv.customerId}, ${inv.customerName},
            ${inv.customerGstin || null}, ${inv.customerAddress || null}, ${inv.customerCity || null},
            ${inv.customerState || null}, ${inv.customerStateCode || null}, ${inv.customerMobile || null},
            ${inv.ackNo || null}, ${inv.ackDate || null}, ${inv.irn || null}, ${inv.ewayBillNo || null},
            ${inv.vehicleNo || null}, ${inv.transportNo || null}, ${JSON.stringify(inv.items)},
            ${inv.totalQuantity}, ${inv.totalTaxable}, ${inv.totalCgst}, ${inv.totalSgst},
            ${inv.totalIgst}, ${inv.roundOff}, ${inv.grandTotal}, ${inv.amountInWords},
            ${inv.paymentStatus}, ${inv.paidAmount}, ${inv.remainingAmount}, ${inv.dueDate || null},
            ${inv.notes || null}, ${inv.createdAt}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    // Seed Customer Rates
    const existingRates = await sql`SELECT count(*) FROM customer_rates;`;
    if (Number(existingRates[0]?.count || 0) === 0) {
      console.log(`Seeding ${defaultCustomerRates.length} default customer rates...`);
      for (const rate of defaultCustomerRates) {
        await sql`
          INSERT INTO customer_rates (
            id, customer_id, product_id, last_rate, last_billed_date, invoice_no
          ) VALUES (
            ${rate.id}, ${rate.customerId}, ${rate.productId}, ${rate.lastRate},
            ${rate.lastBilledDate}, ${rate.invoiceNo}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    // Seed Payments
    const existingPayments = await sql`SELECT count(*) FROM payments;`;
    if (Number(existingPayments[0]?.count || 0) === 0) {
      console.log(`Seeding ${defaultPayments.length} default payments...`);
      for (const pay of defaultPayments) {
        await sql`
          INSERT INTO payments (
            id, invoice_id, invoice_no, customer_id, customer_name, amount, payment_mode,
            reference_no, payment_date, notes, created_at
          ) VALUES (
            ${pay.id}, ${pay.invoiceId || null}, ${pay.invoiceNo || null}, ${pay.customerId},
            ${pay.customerName}, ${pay.amount}, ${pay.paymentMode}, ${pay.referenceNo || null},
            ${pay.paymentDate}, ${pay.notes || null}, ${pay.createdAt}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    console.log("Migration and seeding completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Auto-run if executed directly
runMigration().catch(console.error);
