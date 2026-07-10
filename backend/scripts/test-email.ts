/**
 * Prueba one-off del módulo de email (T7 tarea 1).
 *   npx tsx scripts/test-email.ts <destinatario>
 * Sin RESEND_API_KEY → modo degradado (loguea). Con key → envía de verdad.
 */
import { orderStatusEmail, sendEmail } from "../src/lib/email.js";

const to = process.argv[2] ?? "test@example.com";
const { subject, html } = orderStatusEmail({
  storeName: "Tienda Demo",
  orderNumber: 99,
  status: "shipped",
  totalCents: 2500000,
  trackingNumber: "AR-TEST-123",
});

await sendEmail({ to, subject, html }, { info: console.log, warn: console.warn });
console.log("— fin del test de email —");
process.exit(0);
