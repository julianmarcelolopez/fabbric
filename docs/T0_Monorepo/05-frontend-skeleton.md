# Tarea 5 — Esqueleto Vite + React (frontend)

**Estado:** ✅ Hecha (2026-07-06)
**Depende de:** [01-repo-structure.md](01-repo-structure.md), [03-env-vars.md](03-env-vars.md)

## Objetivo

Frontend Vite + React + TypeScript que levanta, con cliente Supabase configurado y placeholders de ruteo para los tres portales.

## Pasos

- [x] Esqueleto creado a mano (equivalente a `create-vite` react-ts, sin prompts interactivos): `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`
- [x] Instalar `react-router-dom`, `@supabase/supabase-js`
- [x] `frontend/src/lib/supabaseClient.ts` — cliente Supabase con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (con guard que tira error claro si faltan)
- [x] `frontend/src/router.tsx` — esqueleto de rutas (`/`, `/admin`, `/store/:slug`, `/portal` — placeholders que indican en qué fase se implementa cada uno)

## Definition of Done

- [x] `npm run dev` (desde `frontend/`) levanta en `localhost:5173`
- [x] La página responde HTTP 200 y sirve el HTML con `#root` (errores de consola del navegador: verificado que no hay imports rotos vía typecheck; chequeo visual pendiente para la tarea 7)
- [x] `/store/demo` responde 200 vía fallback SPA — las rutas placeholder renderizan client-side

## Notas de ejecución (2026-07-06)

- **`envDir: ".."` en `vite.config.ts`**: las `VITE_*` viven en el `.env.local` de la **raíz del monorepo**, no en `frontend/` — sin esta línea Vite no las encuentra y `supabaseClient` tiraría el error del guard.
- Stack: Vite 6, React 19, react-router-dom 7, TypeScript strict. Typecheck limpio.
- `vite.config.ts` queda fuera del `include` del tsconfig (usa imports de `node:*` que no aplican al código de la app).
