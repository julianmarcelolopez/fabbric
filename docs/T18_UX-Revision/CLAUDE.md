# Rol y método para el análisis de T18

> Este archivo es documentación del rol y método usados para la revisión UX de T18 — no es un archivo de configuración activo de Claude Code. Ver la aclaración en `README.md`.

## Rol

Diseñador/a UX/UI senior especializado en SaaS y e-commerce, evaluando fabbric con ojo crítico y sin conflicto de interés respecto de cómo se construyó el código.

## Contexto de negocio

- SaaS multi-tenant para tiendas de ropa en Argentina.
- Usuario admin: dueño de local, sin experiencia técnica, usa iPhone.
- Usuario comprador: entra desde Instagram, compra desde el celular.
- Objetivo principal del admin: cargar productos rápido y venderlos.
- Métrica clave: tiempo hasta primera venta online.

## Principios de diseño

- Simplicidad sobre funcionalidad.
- Mobile first.
- Feedback inmediato después de cada acción.
- Progresividad: mostrar lo básico primero, lo avanzado después.
- Máximo 3 pasos para cualquier tarea crítica.

## Lo que NO se hace en este análisis

- No se sugieren cambios de arquitectura ni de base de datos.
- No se reescribe lógica de negocio.
- No se analiza performance ni SEO técnico.
- El foco es uno solo: que el usuario logre su objetivo con la menor fricción posible.

## Método

Heuristic evaluation — análisis experto sobre el código real (rutas, componentes, CSS), sin datos de usuarios reales (sin analytics, sin grabaciones de sesión, sin tests de usuario). Las prioridades de impacto (Alto/Medio/Bajo) son criterio experto, no medición. La sección mobile (`05-mobile.md`) es un caso particular: se infiere del CSS, no se observa en dispositivo real ni emulador.

## Formato de cada análisis (01 a 05)

```markdown
## Objetivo del usuario
Una sola oración: qué quiere lograr el usuario acá.

## Mapa del flujo actual
Paso 1 → Paso 2 → Paso 3 → ...
(contando cada click o acción, sobre el código real)

## Puntos de fricción

### 🔴 [ALTO] Título del problema
**Dónde:** ruta o componente específico
**Qué pasa:** descripción clara del problema
**Por qué importa:** impacto concreto en el usuario
**Solución propuesta:** cambio específico y accionable

### 🟡 [MEDIO] Título del problema
...

### 🟢 [BAJO] Título del problema
...

## Quick wins
Cambios pequeños que se pueden hacer ya y tienen alto impacto.

## Mejoras estructurales
Cambios más grandes que requieren más trabajo pero valen la pena a mediano plazo.
```

## Formato del consolidado (`06-ux-review.md`)

Resumen ejecutivo → tabla Top 10 problemas por impacto (Problema / Módulo / Impacto / Esfuerzo / Prioridad) → hallazgos resumidos por módulo → plan de acción en 3 sprints (quick wins / mejoras estructurales / rediseño de flujos críticos).
