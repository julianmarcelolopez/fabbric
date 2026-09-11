import { writeFileSync } from "node:fs";
import QRCode from "qrcode";
import { buildQrText } from "./src/modules/invoices/pdf.js";

const qrText = buildQrText({
  fecha: "2026-09-11",
  cuit: "20304556006",
  ptoVta: 1,
  numero: 24,
  importeCents: 180000,
  cae: "86370874789064",
  dniComprador: "30455600",
});
console.log("QR text:", qrText);

const png = await QRCode.toBuffer(qrText, { width: 480, margin: 2 });
writeFileSync(
  "C:/Users/JULIAN~1/AppData/Local/Temp/claude/c--projects-fabbric/4050fb60-013f-42eb-baaf-0229210dce3a/scratchpad/factura-qr.png",
  png
);
console.log("QR PNG guardado");
