# Fase 5 — PWA: descarga y estado en la confirmación

**Estado:** ✅ Hecha (2026-09-06) — 10/10 PASS (Playwright, con descarga de PDF real interceptada)

## Objetivo (según plan.md)

Que el vendedor vea, en la misma pantalla donde hoy se confirma una venta, si la factura se emitió y pueda descargarla — o entienda con claridad que quedó pendiente sin que la venta se haya visto afectada.

## Checklist

- [x] `pwa/src/screens/ConfirmarScreen.tsx`: recibe `factura: InvoiceStatus | null` (ya transportado desde la Fase 4) y muestra según `estado`.
- [x] Si `emitida`: botón "Descargar factura (PDF)" contra `GET /admin/invoices/:id/pdf`.
- [x] Si `pendiente`/`error`: mensaje tranquilo ("no hace falta que hagas nada") — sin sugerir acción del vendedor.
- [x] Sin `factura` (toggle apagado, `null`): pantalla idéntica a T23 — confirmado, ninguna de las dos secciones nuevas se renderiza.

## Cómo se implementó

- **`pwa/src/lib/api.ts`**: función nueva `apiDownload(path, fallbackFilename)` — hace el `fetch` con el Bearer de la sesión (igual que `apiJson`), arma un blob y dispara la descarga con un `<a download>` temporal (patrón estándar de browser, no hay API nativa más directa para descargar con headers de auth). Reusa el nombre de archivo que ya arma el backend (`Content-Disposition`) si está disponible, si no cae a un nombre por default.
- **Hallazgo real, no previsto**: el nombre del `Content-Disposition` no llegaba al cliente (`res.headers.get("content-disposition")` daba `null`) — **CORS**: ese header no está en la lista que el navegador expone a JS por default en un fetch cross-origin (la PWA y el backend son orígenes distintos en dev). Se agregó `exposedHeaders: ["Content-Disposition"]` a la config de `@fastify/cors` en `backend/src/index.ts` — con eso el nombre formateado (`factura-0001-00000015.pdf`) llega correcto.
- `ConfirmarScreen` no cambia nada si `factura` es `null` — las dos secciones nuevas (botón/mensaje) están condicionadas exclusivamente a que `factura` exista.

## Definition of Done

- [x] El botón de descarga solo aparece cuando la factura está `emitida`, y descarga un PDF real (verificado: magic bytes `%PDF`, no solo que el botón exista).
- [x] El mensaje de "pendiente"/"error" no bloquea nada — el botón "Volver a escanear" sigue disponible igual.
- [x] Sin factura: cero cambios respecto de T23 (verificado explícitamente, no asumido).

## Cómo se verificó

**Playwright** (`pwa/t25-05-confirmar-descarga.mjs`, viewport 390×844) — 10/10 PASS:
- Sin factura: pantalla igual a T23, ninguna sección nueva.
- Con factura y AFIP OK: botón visible, descarga interceptada y verificada como PDF real, nombre de archivo con el formato correcto.
- Con factura y AFIP en error (org sin config): "Venta registrada" sigue mostrándose (la venta no se ve afectada) + mensaje tranquilo, sin botón de descarga.

**Manual, por el usuario** — venta real contra la organización real de Eliathi: botón "Descargar factura (PDF)" visible, PDF descargado y abierto correctamente — Factura C N° `0001-00000018`, cliente, ítem, total, CAE real `86360853860088`, vencimiento, QR. El email de esa misma venta no llegó, por el mismo límite de Resend ya documentado en la Fase 3 (no es un defecto de esta fase).

## Dependencias

- **La bloquean**: Fase 3 — ya resuelta, Fase 4 — ya resuelta.
- **Bloquea**: nada directamente.
