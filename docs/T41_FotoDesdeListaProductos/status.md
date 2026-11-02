# Status — T41 Clic en foto vacía → paso "Fotos"

Ver especificación en
[`specs/T41_FotoDesdeListaProductos.md`](specs/T41_FotoDesdeListaProductos.md).
Este archivo es solo el estado.

## Estado general: 🔶 Implementado (2026-11-02), falta verificación visual

| Paso | Estado |
|---|---|
| Spec | ✅ Hecho |
| Decisiones (sin restringir por variantes; miniatura con foto también linkea) | ✅ Hecho |
| `ProductsPage.tsx`: miniatura como `<Link ...?step=3>` | ✅ Hecho |
| `ProductEditPage.tsx`: leer `?step=` como paso inicial | ✅ Hecho |
| Verificación en navegador | ⬜ Pendiente |
