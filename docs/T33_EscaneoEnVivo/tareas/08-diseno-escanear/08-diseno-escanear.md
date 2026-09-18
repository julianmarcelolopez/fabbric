# Tarea 8 — Diseño de la pantalla Escanear: orden, colores, tamaño de cámara

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 7 (escaneo en vivo funcionando de punta a punta,
incluido el caso ITF).

## Origen

Con el escaneo en vivo ya funcionando, quedaba resolver el Fase 3 del plan
("Decidir fallback de foto") más una observación directa del usuario sobre
una captura real: la cámara se veía más grande de lo necesario.

## Decisión (acordada con el usuario antes de tocar código)

**Fase 3 del plan queda resuelta así**: no se saca "Sacar foto" — se
mantiene como respaldo, pero pasa a ser la opción **secundaria**. Orden
final acordado: 1) escaneo en vivo, 2) foto, 3) ingreso manual.

## Alcance implementado

En `pwa/src/screens/EscanearScreen.tsx`:
- **Reorden**: el bloque de escaneo en vivo pasa a estar primero (antes iba
  después de la foto), foto segunda, manual tercera — sin cambios de lógica,
  solo de orden en el JSX. Separadores "o sacá una foto" / "o escribilo a
  mano" entre cada bloque, mismo patrón que ya existía.
- **Swap de colores**: el botón de escaneo en vivo pasa a `colors.accent`
  (naranja, el color reservado para la acción principal en toda la app);
  "Sacar foto" pasa a `border: 1px solid colors.navy` + fondo blanco (el
  mismo tratamiento secundario que ya usa "Buscar" en el ingreso manual) —
  antes era al revés. No se inventó un estilo nuevo, se intercambiaron los
  dos que ya existían.
- **Tamaño de cámara**: el `<video>` no tenía ninguna restricción de alto
  (`width:100%` sin más) — el tamaño lo determinaba la resolución nativa de
  la cámara de cada dispositivo, variable e imprevisible. Se agregó
  `aspectRatio: "3 / 2"` + `objectFit: "cover"` al contenedor — tamaño
  consistente en cualquier dispositivo, recorta en vez de estirar. El
  marco naranja del viewfinder (posicionado en porcentajes) se adapta solo
  al nuevo tamaño, sin cambios.

## Cómo se verificó

`npx tsc --noEmit` y `npx vite build --mode production` limpios dentro del
contenedor Docker. Verificación visual pendiente de confirmación explícita
del usuario (implícita en que pasó al siguiente tema sin objeciones).

## Dependencias

- **La bloquean:** Tarea 7.
- **Bloquea:** nada formalmente — mejora de diseño encontrada en el camino,
  no una fase planeada desde el inicio del plan original.
