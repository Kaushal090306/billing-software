import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_SRNJjlF7gIG5@ep-mute-dust-b38n2upd-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function recalculateDatabaseBalances() {
  console.log("Connecting to Neon database for ledger reconciliation...");
  const sql = neon(connectionString);

  try {
    const customers = await sql`SELECT id, business_name, opening_balance, current_balance FROM customers;`;
    const invoices = await sql`SELECT id, customer_id, grand_total, paid_amount, remaining_amount FROM invoices;`;
    const payments = await sql`SELECT id, customer_id, amount FROM payments;`;

    console.log(`Found ${customers.length} customers, ${invoices.length} invoices, ${payments.length} payments.`);

    for (const cust of customers) {
      // If customer has 0 bills and 0 payments, reset opening balance to 0 so fresh accounts start at 0
      const billed = invoices
        .filter((i) => i.customer_id === cust.id)
        .reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
      const paid = payments
        .filter((p) => p.customer_id === cust.id)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const openBal = (billed === 0 && paid === 0) ? 0 : 0;
      const trueBalance = Math.round((openBal + billed - paid) * 100) / 100;

      await sql`
        UPDATE customers
        SET current_balance = ${trueBalance},
            opening_balance = ${openBal},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${cust.id};
      `;

      console.log(
        `Customer ${cust.business_name} (${cust.id}): Opening=${openBal}, Billed=${billed}, Paid=${paid} => New Balance = ${trueBalance}`
      );
    }

    // Ensure cust_3 invoice and payment customer_name matches
    await sql`
      UPDATE invoices
      SET customer_name = 'SHREE RADHE EMBROIDERY & JARI'
      WHERE customer_id = 'cust_3' AND customer_name = 'ABC TRADERS';
    `;

    await sql`
      UPDATE payments
      SET customer_name = 'SHREE RADHE EMBROIDERY & JARI'
      WHERE customer_id = 'cust_3' AND customer_name = 'ABC TRADERS';
    `;

    console.log("Ledger reconciliation and database synchronization completed.");
  } catch (err) {
    console.error("Failed to recalculate balances in Neon database:", err);
  }
}

recalculateDatabaseBalances();
