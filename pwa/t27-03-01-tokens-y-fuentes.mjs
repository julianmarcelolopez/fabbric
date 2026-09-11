// T27/Fase 3, Tarea 1 — verifica que las 3 fuentes de Google Fonts (Cormorant
// Garamond, DM Sans, Alex Brush) realmente descargan, no solo que el <link>
// está en el HTML, y que el body ya usa DM Sans como base. No requiere login
// ni datos de prueba: el <link> y el CSS global se aplican antes del login.
import { chromium } from "playwright";

const PWA_URL = "http://localhost:5174";

let pass = 0,
  fail = 0;
function check(name, ok, extra = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function main() {
  console.log("T27/Fase 3, Tarea 1 — Playwright: tokens y fuentes\n");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(PWA_URL);

  // document.fonts.load() fuerza la descarga real de un @font-face, sin
  // depender de que algún texto visible ya lo esté usando (todavía no migró
  // ninguna pantalla — eso es trabajo de las Tareas 2 a 4).
  const results = await page.evaluate(async () => {
    const families = ['"DM Sans"', '"Cormorant Garamond"', '"Alex Brush"'];
    const out = {};
    for (const f of families) {
      try {
        const loaded = await document.fonts.load(`16px ${f}`);
        out[f] = loaded.length > 0;
      } catch {
        out[f] = false;
      }
    }
    return out;
  });

  check("DM Sans descarga correctamente", results['"DM Sans"'] === true);
  check("Cormorant Garamond descarga correctamente", results['"Cormorant Garamond"'] === true);
  check("Alex Brush descarga correctamente", results['"Alex Brush"'] === true);

  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check("el body usa DM Sans como fuente base (no el default del navegador)", bodyFont.includes("DM Sans"), bodyFont);

  await browser.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
