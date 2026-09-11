import { chromium } from "playwright";

const QR_URL =
  "https://www.arca.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoiMjAyNi0wOS0xMSIsImN1aXQiOjIwMzA0NTU2MDA2LCJwdG9WdGEiOjEsInRpcG9DbXAiOjExLCJucm9DbXAiOjIzLCJpbXBvcnRlIjoyNTAwLCJtb25lZGEiOiJQRVMiLCJjdHoiOjEsInRpcG9Eb2NSZWMiOjk2LCJucm9Eb2NSZWMiOjMwMTExMjIyLCJ0aXBvQ29kQXV0IjoiRSIsImNvZEF1dCI6ODYzNzA4NzQ3NjQzNzJ9";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(QR_URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
console.log("URL final:", page.url());
const text = await page.textContent("body");
console.log("\n--- TEXTO DE LA PAGINA ---\n");
console.log(text?.replace(/\s+/g, " ").trim());
await page.screenshot({ path: "_tmp-qr-resultado.png", fullPage: true });
await browser.close();
