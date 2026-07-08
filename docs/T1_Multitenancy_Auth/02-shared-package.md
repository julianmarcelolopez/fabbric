# Tarea 2 — Bootstrap de `packages/shared` (schemas Zod)

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** —

## Objetivo

Estrenar el workspace `packages/shared` con los schemas Zod de esta fase (`organization`, `adminUser`) y dejarlo importable desde backend y frontend como `@fabbric/shared`. Es el primer caso real del motivo por el que el repo es un monorepo: una sola definición de tipos/validación para ambos lados.

## Pasos

- [x] `packages/shared/package.json`: name `@fabbric/shared`, `"type": "module"`, `zod` como dependencia, y `exports` apuntando al código fuente TS (`./src/index.ts`) — sin build step: `tsx` (backend) y Vite (frontend) consumen TS directo. **Resultado: funcionó sin fricción** — el typecheck NodeNext del backend y el bundler del frontend resuelven el export TS-source sin config extra.
- [x] `packages/shared/tsconfig.json` (strict, ESM, `moduleResolution: bundler`)
- [x] `packages/shared/src/schemas/organization.ts` — schema Zod alineado a `organizations` + `createOrganizationSchema` (name, slug con regex de slug)
- [x] `packages/shared/src/schemas/adminUser.ts` — alineado a `admin_users` + `createAdminUserSchema` (email, password min 8, role owner/staff — super_admin solo por seed)
- [x] `packages/shared/src/index.ts` — re-exporta todo
- [x] Borrar `packages/shared/.gitkeep`
- [x] `npm install` en la raíz para linkear el workspace (+ `@fabbric/shared` declarado como dependencia en backend y frontend)
- [x] Smoke test con archivos temporales (borrados después): backend ejecutó un `parse` real vía tsx, frontend typecheckeó el import

## Definition of Done

- [x] `import { createOrganizationSchema } from "@fabbric/shared"` compila y corre en el backend (`tsx` → `smoke OK`)
- [x] El mismo import compila en el frontend (`tsc --noEmit` OK)
- [x] `tsc --noEmit` limpio en `packages/shared`

## Notas de ejecución (2026-07-07)

- Los imports internos de `shared` usan extensión `.js` (estilo NodeNext) para que el paquete typechequee igual de bien bajo el `moduleResolution` de cualquiera de sus consumidores.
- Si algún día hace falta consumir `@fabbric/shared` desde Node sin tsx (ej. build de producción del backend con `tsc`), ahí se decide el build step (`dist/` + `exports` condicionales). No antes.

## Notas

- Los tipos TS se derivan de los schemas con `z.infer<>` — no duplicar interfaces a mano.
- Acá solo van los schemas de T1; los de catálogo/pedidos/etc. se agregan en sus fases (la estructura de archivos prevista está en `docs/plan.md` § Estructura de carpetas).
