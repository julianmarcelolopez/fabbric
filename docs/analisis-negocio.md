# Análisis — Sistema Eliathi Modas
**Fuentes:** capturas del catálogo de WhatsApp Business de Edgar Silguero + acta de reunión (junio 2026)
**Objetivo del documento:** separar lo que es capa visual/UX (ya validado porque hoy funciona en WhatsApp) de lo que es lógica de negocio/comportamiento del sistema, para chequear contra lo que ya está armado en el código.

---

## 1. Lo que ya existe hoy (punto de partida real)

Edgar no arranca de cero: ya opera un mini-sistema de ventas dentro de WhatsApp Business (Catálogo + Carrito + Solicitud de pedido). Esto es importante porque **valida un flujo de UX que la gente ya usa y entiende**. No hay que reinventarlo, hay que mejorarlo.

Flujo actual observado:
1. Banner/perfil de marca → 2. Catálogo (grid de productos) → 3. Selección + carrito → 4. "Solicitud de pedido" (no es checkout real, es una intención de compra) → 5. Confirmación manual por chat con Edgar/Elisa.

---

## 2. Capa UX / Visual (qué se ve, qué patrones replicar)

| Elemento | Observado en las capturas | Nota de diseño |
|---|---|---|
| Identidad de marca | Banner con logo "Eliathi modas" + logos de terceros (Taverniti, Pampero, Adidas, Puma, Fila, Umbro) | Edgar **no tiene logo propio**, usa el banner como collage de marcas que revende. Hay que resolverlo (diseñar logo propio). |
| Paleta | Fondo oscuro, azul/violeta degradado | Mantener esta esencia, pero mejorar la ejecución (ver P18). |
| Card de producto | Imagen + nombre + marca/modelo + precio tachado + precio final + botón "+" | Patrón de e-commerce estándar, fácil de portar a un catálogo web/app. |
| Carrito / solicitud | Cantidad editable, cálculo de "Ahorras $X", total estimado, disclaimer de que se comparte nombre/teléfono con la empresa | **No es un checkout transaccional** — es una solicitud que después se confirma a mano. Esto define mucho el backend (ver sección 3). |
| Perfil de tienda | Nombre, rubro ("Compras y ventas minoristas"), estado abierto/cerrado, horario, dirección con mapa, botones Catálogo/Compartir, contacto (mail + wa.me) | Info de ficha institucional — replicable como página "Sobre la tienda" o footer. |

---

## 3. Comportamiento del sistema (lógica, no visual)

### Catálogo
- Categorías: ropa (hombre/mujer/niño), calzado, camperas, buzos, joggings, **lencería**.
- Multi-marca: productos de reventa (Taverniti, Bross, Adidas, Puma) + marca propia "Eliathi modas" (sin logo aún).
- Precios con descuento: el sistema necesita manejar precio original + precio con descuento (tachado), no solo un precio único.
- No hace falta lógica de combos ni "productos relacionados" — mantenerlo simple.
- No hace falta optimizar para catálogos enormes (volumen de productos no es un dato crítico).
- Carga de catálogo: Edgar y su equipo sacan fotos y cargan características ellos mismos, probablemente ayudándose con una planilla Excel. Sería valioso poder importar productos desde Excel/CSV además del alta manual.

### Pedido / carrito
- El "carrito" **no cobra en el momento** en WhatsApp — genera una solicitud que se confirma manualmente (precio final, impuestos y cargos se confirman después).
- Decisión tomada para el sistema nuevo: ver sección 6 (modelo de pago).

### Envíos
- Zonas: Almirante Brown, Quilmes, Varela, Lanús — **deben ser configurables**, no hardcodeadas.
- Entrega en el día.
- Reparto: tienen movilidad propia + a veces moto-mensajería/Uber. No está confirmado si requiere integración real con API de delivery; asumir coordinación manual salvo que el código ya tenga algo más.

### Pagos
- Métodos: transferencia, tarjeta de crédito, Mercado Pago.
- Una sola cuenta de Mercado Pago → el sistema no necesita multi-cuenta de cobro por ahora.

### Accesos / usuarios
- Por ahora **un solo acceso/admin**. No hace falta sistema de roles/permisos en esta etapa, pero el diseño no debería hacer imposible agregarlo después.

---

## 4. Definiciones de negocio (cerradas con el cliente)

| # | Definición | Impacto en el sistema |
|---|---|---|
| Volumen de catálogo | No es un dato relevante | No hace falta paginación/búsqueda compleja desde el día 1. |
| Posicionamiento | Local **popular**, no premium/alta costura | Precios visibles, foco en oferta/descuento, UI simple y directa — nada de estética "boutique". |
| Compra múltiple | No entrar en esa complejidad | Sin combos ni motor de recomendación. Carrito simple. |
| Carga de fotos/datos | Los carga el propio Edgar, posible Excel | Priorizar importador de catálogo vía Excel/CSV además del alta manual. |
| Accesos | Un solo usuario admin por ahora | Sin sistema de roles todavía. |
| Identidad visual | Piden ayuda: algo "similar pero más elegante y simple" | Rediseño de marca: paleta + tipografía + logo propio, mejorando la ejecución actual (collage de logos de terceros). |
| Nombre online | Similar a "Eliathi Modas" | Confirmar dominio tipo eliathimodas.com / .com.ar. |
| Urgencia | Ninguna — es un trabajo sin costo para el cliente | Prioridad: calidad por sobre velocidad. |

**Pendiente abierto:** en la reunión Edgar solo confirmó explícitamente **Facebook** (*"¿Tienen Instagram o Facebook del local?"* → *"si, facebook"*) y venta por **Marketplace**. Instagram **no está confirmado por Edgar** — lo único que lo sugiere es el handle *@eliathi_modas* con ícono de Instagram en el banner de WhatsApp, pero es una inferencia visual, no una respuesta del acta. Falta confirmar con Edgar si esa cuenta existe, está activa, y si la usa para vender.

Sea cual sea la respuesta, falta definir si el sistema nuevo reemplaza esos canales, convive con ellos (republicando el mismo catálogo), o los ignora.

---

## 5. Checklist para comparar contra el código

1. **Modelo de producto** — ¿tiene precio original + precio con descuento? ¿campo de marca/categoría?
2. **Carga de catálogo** — ¿existe importación vía Excel/CSV, o solo alta manual?
3. **Carrito/pedido** — ¿es "solicitud → confirmación manual" o ya cobra automático? ¿con qué pasarela?
4. **Envíos** — ¿zonas de cobertura configurables o hardcodeadas?
5. **Usuarios** — ¿auth/roles ya implementado, o de un solo admin?
6. **Identidad visual** — ¿logo propio ya definido, o sigue el collage de marcas?
7. **Canales externos** — ¿algo pensado para Instagram/Facebook, o standalone?

---

## 6. Comparación real contra el código (resultado de Claude Code)

| Requerimiento | Estado | Notas |
|---|---|---|
| Categorías (rubro) | ✅ Hecho | `categoryId` por producto, CRUD admin ya existe. |
| Marca (Taverniti, Bross, Adidas, Puma, Eliathi) | ❌ Falta | No existe campo `brand` en products. Se puede agregar como columna simple. |
| Precio original + precio con descuento (tachado) | ❌ Falta | `products.price` es un único valor. Sin `compareAtPrice`. Front (`ProductCard.tsx`, `ProductDetailView.tsx`) solo renderiza un precio. |
| Importación de catálogo vía Excel/CSV | ❌ Falta | CRUD estándar, sin bulk import. Alta es 100% manual. |
| Carrito/pedido: "solicitud → confirmación manual" | ❌ No — hoy es cobro automático | El checkout público crea la orden y la preferencia de MP en el mismo request; el cliente va directo a pagar. El modelo de "solicitud sin cobro" solo existe del lado admin para altas manuales, el cliente nunca lo dispara. |
| Pasarela de pago | Mercado Pago Checkout Pro | Corre con **una sola cuenta de MP a nivel plataforma** (token global), no por tenant. |
| Zonas de envío configurables | ✅ Hecho | `shipping_zones` con CRUD admin, nada hardcodeado. |
| Usuarios / accesos | ✅ Hecho (y de sobra) | Sistema multi-rol ya armado; para Edgar alcanza con un solo owner. |
| Identidad visual | 🟡 Parcial | Mecanismo básico existe (`catalog_configs`: logo, 1 color de acento, tema), pero es angosto — sin tipografía elegible, sin assets de Eliathi cargados. |
| Canales externos (IG/FB) | N/A | Fuera de alcance por decisión de negocio (Nivel 1). |

### Decisión tomada: modelo de pago
- **WhatsApp Business (Catálogo/carrito nativo):** se mantiene tal cual está — Nivel 1, sin integración técnica con el sistema. Es un canal aparte, Edgar sigue confirmando pedidos a mano ahí.
- **Sitio web del sistema:** va con **cobro automático vía Mercado Pago**, pero migrando del token global de plataforma a una **integración OAuth de Marketplace** — Edgar conecta su propia cuenta de MP (la de Elisa) y el dinero le entra directo a él, no a la cuenta de la plataforma. Esto requiere:
  - Tabla/campo para guardar `access_token` + `refresh_token` por organización (los tokens de vendedor vencen y se renuevan).
  - **Pantalla de conexión "Conectar mi cuenta de Mercado Pago"** — hoy el sistema no tiene ningún panel de configuración de tenant donde meter esto, hay que crearlo desde cero.
  - Checkout modificado para usar el token del vendedor correspondiente en vez del global.

### Prioridad actualizada (impacto real de uso para Edgar, no complejidad técnica)

1. **Panel de configuración de tenant** — hoy no existe ningún lugar en el admin para que Edgar (o quien administre) configure cosas propias de su cuenta. Es prerrequisito técnico para el punto 2 y también para identidad visual (punto 6).
2. **Migrar a OAuth Marketplace de MP** — que el dinero entre a la cuenta de Edgar, no a la de la plataforma. Bloqueante para producción.
3. **Precio con descuento (tachado)** — central en cómo Edgar vende hoy ("Ahorrás $X") y en el posicionamiento "popular, con ofertas" que pidió.
4. **Campo de marca** — la reventa multi-marca es parte de la identidad del catálogo.
5. **Importación Excel/CSV** — ahorra tiempo en la carga inicial que va a hacer el propio Edgar.
6. **Identidad visual real** (logo + paleta + tipografía de Eliathi) — mayormente trabajo de diseño, pero el sistema de theming actual es angosto (un solo color) si se quiere algo prolijo.
7. **Configurar las 4 zonas de envío + usuario admin de Edgar** — cero desarrollo, es carga de datos sobre lo que ya existe.