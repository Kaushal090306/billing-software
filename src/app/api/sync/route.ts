import { NextResponse } from "next/server";
import { sql } from "@/db";
import {
  BusinessSettings,
  Customer,
  Product,
  Invoice,
  PaymentRecord,
  CustomerRateMemory,
  defaultBusinessSettings,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch settings
    const settingsRows = await sql`SELECT * FROM business_settings LIMIT 1;`;
    let settings: BusinessSettings = defaultBusinessSettings;
    if (settingsRows.length > 0) {
      const s = settingsRows[0];
      settings = {
        companyName: s.company_name || defaultBusinessSettings.companyName,
        devotionalHeader: s.devotional_header || defaultBusinessSettings.devotionalHeader,
        tradeName: s.trade_name || defaultBusinessSettings.tradeName,
        address: s.address || defaultBusinessSettings.address,
        city: s.city || defaultBusinessSettings.city,
        state: s.state || defaultBusinessSettings.state,
        stateCode: s.state_code || defaultBusinessSettings.stateCode,
        pincode: s.pincode || defaultBusinessSettings.pincode,
        gstin: s.gstin || defaultBusinessSettings.gstin,
        pan: s.pan || defaultBusinessSettings.pan,
        phone: s.phone || defaultBusinessSettings.phone,
        phoneAlt: s.phone_alt || defaultBusinessSettings.phoneAlt,
        email: s.email || defaultBusinessSettings.email,
        bankName: s.bank_name || defaultBusinessSettings.bankName,
        branchName: s.branch_name || defaultBusinessSettings.branchName,
        accountNumber: s.account_number || defaultBusinessSettings.accountNumber,
        ifscCode: s.ifsc_code || defaultBusinessSettings.ifscCode,
        invoicePrefix: s.invoice_prefix || defaultBusinessSettings.invoicePrefix,
        financialYear: s.financial_year || defaultBusinessSettings.financialYear,
        startingInvoiceNo: Number(s.starting_invoice_no || 145),
        roundOffMode: (s.round_off_mode || "nearest_1") as any,
        termsAndConditions: (s.terms_and_conditions as string[]) || defaultBusinessSettings.termsAndConditions,
        logoType: (s.logo_type || "monogram") as any,
        logoUrl: s.logo_url || undefined,
        monogramText: s.monogram_text || "DTJ",
        monogramSubtext: s.monogram_subtext || "DHARMI THREAD & JARI",
        signatureType: (s.signature_type || "font") as any,
        signatureUrl: s.signature_url || undefined,
        signatureFont: s.signature_font || "Great Vibes",
        authorizedSignatoryName: s.authorized_signatory_name || "Pravinbhai K. Sheladiya",
        signatoryFirmTitle: s.signatory_firm_title || "FOR, DHARMI THREAD & JARI",
        signatoryLabel: s.signatory_label || "Authorised Signatory",
        showQrCode: s.show_qr_code === "true" || s.show_qr_code === true,
        qrCodeType: (s.qr_code_type || "auto") as any,
        qrCodeUrl: s.qr_code_url || undefined,
        upiId: s.upi_id || "9925606480@kotak",
        activeTemplateId: s.active_template_id || defaultBusinessSettings.activeTemplateId,
        templates: (typeof s.templates === "string" ? JSON.parse(s.templates) : s.templates) || defaultBusinessSettings.templates,
      };
    }

    // 2. Fetch products
    const productRows = await sql`SELECT * FROM products ORDER BY name ASC;`;
    const products: Product[] = productRows.map((p) => ({
      id: p.id,
      name: p.name,
      hsn: p.hsn,
      unit: p.unit as any,
      defaultRate: Number(p.default_rate || 0),
      gstRate: Number(p.gst_rate || 5),
      stock: Number(p.stock || 0),
      category: p.category || "Jari",
      description: p.description || "",
    }));

    // 3. Fetch invoices
    const invoiceRows = await sql`SELECT * FROM invoices ORDER BY created_at DESC;`;
    const invoices: Invoice[] = invoiceRows.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoice_no,
      date: inv.date,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerGstin: inv.customer_gstin || "",
      customerAddress: inv.customer_address || "",
      customerCity: inv.customer_city || "",
      customerState: inv.customer_state || "",
      customerStateCode: inv.customer_state_code || "",
      customerMobile: inv.customer_mobile || "",
      ackNo: inv.ack_no || undefined,
      ackDate: inv.ack_date || undefined,
      irn: inv.irn || undefined,
      ewayBillNo: inv.eway_bill_no || undefined,
      vehicleNo: inv.vehicle_no || undefined,
      transportNo: inv.transport_no || undefined,
      items: (typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items) || [],
      totalQuantity: Number(inv.total_quantity || 0),
      totalTaxable: Number(inv.total_taxable || 0),
      totalCgst: Number(inv.total_cgst || 0),
      totalSgst: Number(inv.total_sgst || 0),
      totalIgst: Number(inv.total_igst || 0),
      roundOff: Number(inv.round_off || 0),
      grandTotal: Number(inv.grand_total || 0),
      amountInWords: inv.amount_in_words,
      paymentStatus: inv.payment_status as any,
      paidAmount: Number(inv.paid_amount || 0),
      remainingAmount: Number(inv.remaining_amount || 0),
      dueDate: inv.due_date || undefined,
      notes: inv.notes || undefined,
      createdAt: inv.created_at || new Date().toISOString(),
    }));

    // 4. Fetch payments
    const paymentRows = await sql`SELECT * FROM payments ORDER BY created_at DESC;`;
    const payments: PaymentRecord[] = paymentRows.map((pay) => ({
      id: pay.id,
      invoiceId: pay.invoice_id || undefined,
      invoiceNo: pay.invoice_no || undefined,
      customerId: pay.customer_id,
      customerName: pay.customer_name,
      amount: Number(pay.amount || 0),
      paymentMode: pay.payment_mode as any,
      referenceNo: pay.reference_no || undefined,
      paymentDate: pay.payment_date,
      notes: pay.notes || undefined,
      createdAt: pay.created_at || new Date().toISOString(),
    }));

    // 5. Fetch customers and compute exact live balance
    const customerRows = await sql`SELECT * FROM customers ORDER BY business_name ASC;`;
    const customers: Customer[] = customerRows.map((c) => {
      const openBal = Number(c.opening_balance || 0);
      const billed = invoices
        .filter((i) => i.customerId === c.id)
        .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const paid = payments
        .filter((p) => p.customerId === c.id)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const trueBal = Math.round((openBal + billed - paid) * 100) / 100;

      return {
        id: c.id,
        businessName: c.business_name,
        contactPerson: c.contact_person || "",
        gstin: c.gstin || "",
        pan: c.pan || "",
        address: c.address || "",
        city: c.city || "Surat",
        state: c.state || "Gujarat",
        stateCode: c.state_code || "24",
        pincode: c.pincode || "",
        mobile: c.mobile,
        email: c.email || "",
        openingBalance: openBal,
        currentBalance: trueBal,
        notes: c.notes || "",
        createdAt: c.created_at || new Date().toISOString(),
      };
    });

    // 6. Fetch customer rates
    const rateRows = await sql`SELECT * FROM customer_rates;`;
    const customerRates: CustomerRateMemory[] = rateRows.map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      productId: r.product_id,
      lastRate: Number(r.last_rate || 0),
      lastBilledDate: r.last_billed_date,
      invoiceNo: r.invoice_no,
    }));

    return NextResponse.json({
      success: true,
      data: {
        settings,
        customers,
        products,
        invoices,
        payments,
        customerRates,
      },
    });
  } catch (error: any) {
    console.error("Database sync GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch data from Neon" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, entity, data, id } = body;

    if (action === "save_settings" && data) {
      await sql`
        INSERT INTO business_settings (
          id, company_name, devotional_header, trade_name, address, city, state, state_code, pincode,
          gstin, pan, phone, phone_alt, email, bank_name, branch_name, account_number, ifsc_code,
          invoice_prefix, financial_year, starting_invoice_no, round_off_mode, terms_and_conditions,
          logo_type, logo_url, monogram_text, monogram_subtext, signature_type, signature_url,
          signature_font, authorized_signatory_name, signatory_firm_title, signatory_label,
          show_qr_code, qr_code_type, qr_code_url, upi_id, active_template_id, templates, updated_at
        ) VALUES (
          'primary_settings',
          ${data.companyName},
          ${data.devotionalHeader || 'll SHREE GANESHAY NAMAH ll'},
          ${data.tradeName || ''},
          ${data.address},
          ${data.city || 'Surat'},
          ${data.state || 'Gujarat'},
          ${data.stateCode || '24'},
          ${data.pincode || '395010'},
          ${data.gstin || ''},
          ${data.pan || ''},
          ${data.phone || ''},
          ${data.phoneAlt || ''},
          ${data.email || ''},
          ${data.bankName || ''},
          ${data.branchName || ''},
          ${data.accountNumber || ''},
          ${data.ifscCode || ''},
          ${data.invoicePrefix || 'MTJ'},
          ${data.financialYear || '2026-27'},
          ${data.startingInvoiceNo || 145},
          ${data.roundOffMode || 'nearest_1'},
          ${JSON.stringify(data.termsAndConditions || [])},
          ${data.logoType || 'monogram'},
          ${data.logoUrl || null},
          ${data.monogramText || 'DTJ'},
          ${data.monogramSubtext || 'DHARMI THREAD & JARI'},
          ${data.signatureType || 'font'},
          ${data.signatureUrl || null},
          ${data.signatureFont || 'Great Vibes'},
          ${data.authorizedSignatoryName || ''},
          ${data.signatoryFirmTitle || ''},
          ${data.signatoryLabel || 'Authorised Signatory'},
          ${String(data.showQrCode ?? true)},
          ${data.qrCodeType || 'auto'},
          ${data.qrCodeUrl || null},
          ${data.upiId || ''},
          ${data.activeTemplateId || 'tpl_standard_gst'},
          ${JSON.stringify(data.templates || [])},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          devotional_header = EXCLUDED.devotional_header,
          trade_name = EXCLUDED.trade_name,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          state_code = EXCLUDED.state_code,
          pincode = EXCLUDED.pincode,
          gstin = EXCLUDED.gstin,
          pan = EXCLUDED.pan,
          phone = EXCLUDED.phone,
          phone_alt = EXCLUDED.phone_alt,
          email = EXCLUDED.email,
          bank_name = EXCLUDED.bank_name,
          branch_name = EXCLUDED.branch_name,
          account_number = EXCLUDED.account_number,
          ifsc_code = EXCLUDED.ifsc_code,
          invoice_prefix = EXCLUDED.invoice_prefix,
          financial_year = EXCLUDED.financial_year,
          starting_invoice_no = EXCLUDED.starting_invoice_no,
          round_off_mode = EXCLUDED.round_off_mode,
          terms_and_conditions = EXCLUDED.terms_and_conditions,
          logo_type = EXCLUDED.logo_type,
          logo_url = EXCLUDED.logo_url,
          monogram_text = EXCLUDED.monogram_text,
          monogram_subtext = EXCLUDED.monogram_subtext,
          signature_type = EXCLUDED.signature_type,
          signature_url = EXCLUDED.signature_url,
          signature_font = EXCLUDED.signature_font,
          authorized_signatory_name = EXCLUDED.authorized_signatory_name,
          signatory_firm_title = EXCLUDED.signatory_firm_title,
          signatory_label = EXCLUDED.signatory_label,
          show_qr_code = EXCLUDED.show_qr_code,
          qr_code_type = EXCLUDED.qr_code_type,
          qr_code_url = EXCLUDED.qr_code_url,
          upi_id = EXCLUDED.upi_id,
          active_template_id = EXCLUDED.active_template_id,
          templates = EXCLUDED.templates,
          updated_at = CURRENT_TIMESTAMP;
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "save_customer" && data) {
      await sql`
        INSERT INTO customers (
          id, business_name, contact_person, gstin, pan, address, city, state, state_code,
          pincode, mobile, email, opening_balance, current_balance, notes, created_at, updated_at
        ) VALUES (
          ${data.id}, ${data.businessName}, ${data.contactPerson || null}, ${data.gstin || null},
          ${data.pan || null}, ${data.address || null}, ${data.city || 'Surat'}, ${data.state || 'Gujarat'},
          ${data.stateCode || '24'}, ${data.pincode || null}, ${data.mobile}, ${data.email || null},
          ${data.openingBalance || 0}, ${data.currentBalance || 0}, ${data.notes || null},
          ${data.createdAt || new Date().toISOString()}, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          contact_person = EXCLUDED.contact_person,
          gstin = EXCLUDED.gstin,
          pan = EXCLUDED.pan,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          state_code = EXCLUDED.state_code,
          pincode = EXCLUDED.pincode,
          mobile = EXCLUDED.mobile,
          email = EXCLUDED.email,
          opening_balance = EXCLUDED.opening_balance,
          current_balance = EXCLUDED.current_balance,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP;
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "delete_customer" && id) {
      await sql`DELETE FROM customers WHERE id = ${id};`;
      return NextResponse.json({ success: true });
    }

    if (action === "save_product" && data) {
      await sql`
        INSERT INTO products (
          id, name, hsn, unit, default_rate, gst_rate, stock, category, description, created_at
        ) VALUES (
          ${data.id}, ${data.name}, ${data.hsn}, ${data.unit}, ${data.defaultRate},
          ${data.gstRate}, ${data.stock || 0}, ${data.category || 'Jari'}, ${data.description || null},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          hsn = EXCLUDED.hsn,
          unit = EXCLUDED.unit,
          default_rate = EXCLUDED.default_rate,
          gst_rate = EXCLUDED.gst_rate,
          stock = EXCLUDED.stock,
          category = EXCLUDED.category,
          description = EXCLUDED.description;
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "delete_product" && id) {
      await sql`DELETE FROM products WHERE id = ${id};`;
      return NextResponse.json({ success: true });
    }

    if (action === "save_invoice" && data) {
      await sql`
        INSERT INTO invoices (
          id, invoice_no, date, customer_id, customer_name, customer_gstin, customer_address,
          customer_city, customer_state, customer_state_code, customer_mobile, ack_no, ack_date,
          irn, eway_bill_no, vehicle_no, transport_no, items, total_quantity, total_taxable,
          total_cgst, total_sgst, total_igst, round_off, grand_total, amount_in_words,
          payment_status, paid_amount, remaining_amount, due_date, notes, created_at
        ) VALUES (
          ${data.id}, ${data.invoiceNo}, ${data.date}, ${data.customerId}, ${data.customerName},
          ${data.customerGstin || null}, ${data.customerAddress || null}, ${data.customerCity || null},
          ${data.customerState || null}, ${data.customerStateCode || null}, ${data.customerMobile || null},
          ${data.ackNo || null}, ${data.ackDate || null}, ${data.irn || null}, ${data.ewayBillNo || null},
          ${data.vehicleNo || null}, ${data.transportNo || null}, ${JSON.stringify(data.items)},
          ${data.totalQuantity}, ${data.totalTaxable}, ${data.totalCgst || 0}, ${data.totalSgst || 0},
          ${data.totalIgst || 0}, ${data.roundOff || 0}, ${data.grandTotal}, ${data.amountInWords},
          ${data.paymentStatus || 'unpaid'}, ${data.paidAmount || 0}, ${data.remainingAmount || 0},
          ${data.dueDate || null}, ${data.notes || null}, ${data.createdAt || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          invoice_no = EXCLUDED.invoice_no,
          date = EXCLUDED.date,
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          customer_gstin = EXCLUDED.customer_gstin,
          customer_address = EXCLUDED.customer_address,
          customer_city = EXCLUDED.customer_city,
          customer_state = EXCLUDED.customer_state,
          customer_state_code = EXCLUDED.customer_state_code,
          customer_mobile = EXCLUDED.customer_mobile,
          ack_no = EXCLUDED.ack_no,
          ack_date = EXCLUDED.ack_date,
          irn = EXCLUDED.irn,
          eway_bill_no = EXCLUDED.eway_bill_no,
          vehicle_no = EXCLUDED.vehicle_no,
          transport_no = EXCLUDED.transport_no,
          items = EXCLUDED.items,
          total_quantity = EXCLUDED.total_quantity,
          total_taxable = EXCLUDED.total_taxable,
          total_cgst = EXCLUDED.total_cgst,
          total_sgst = EXCLUDED.total_sgst,
          total_igst = EXCLUDED.total_igst,
          round_off = EXCLUDED.round_off,
          grand_total = EXCLUDED.grand_total,
          amount_in_words = EXCLUDED.amount_in_words,
          payment_status = EXCLUDED.payment_status,
          paid_amount = EXCLUDED.paid_amount,
          remaining_amount = EXCLUDED.remaining_amount,
          due_date = EXCLUDED.due_date,
          notes = EXCLUDED.notes;
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "delete_invoice" && id) {
      await sql`DELETE FROM invoices WHERE id = ${id};`;
      return NextResponse.json({ success: true });
    }

    if (action === "record_payment" && data) {
      await sql`
        INSERT INTO payments (
          id, invoice_id, invoice_no, customer_id, customer_name, amount, payment_mode,
          reference_no, payment_date, notes, created_at
        ) VALUES (
          ${data.id}, ${data.invoiceId || null}, ${data.invoiceNo || null}, ${data.customerId},
          ${data.customerName}, ${data.amount}, ${data.paymentMode}, ${data.referenceNo || null},
          ${data.paymentDate}, ${data.notes || null}, ${data.createdAt || new Date().toISOString()}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "save_rate" && data) {
      await sql`
        INSERT INTO customer_rates (
          id, customer_id, product_id, last_rate, last_billed_date, invoice_no
        ) VALUES (
          ${data.id}, ${data.customerId}, ${data.productId}, ${data.lastRate},
          ${data.lastBilledDate}, ${data.invoiceNo}
        )
        ON CONFLICT (id) DO UPDATE SET
          last_rate = EXCLUDED.last_rate,
          last_billed_date = EXCLUDED.last_billed_date,
          invoice_no = EXCLUDED.invoice_no;
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Database sync POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mutate data in Neon" },
      { status: 500 }
    );
  }
}
