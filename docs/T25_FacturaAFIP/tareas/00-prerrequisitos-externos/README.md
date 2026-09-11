# Fase 0 — Prerrequisitos externos (no son código)

**Estado:** ✅ Hecha (2026-08-25)

## Objetivo (según plan.md)

Resolver, antes de escribir cualquier código, los dos puntos que dependen de algo externo al repositorio — bloquean el resto de las fases porque sin esto no hay forma de probar nada contra AFIP, ni siquiera en homologación.

## Checklist

- [x] Generar el certificado de **homologación** en Afip SDK / AFIP (con el CUIT del desarrollador — ver `overview.md`, nota sobre credenciales de prueba; el certificado de Edgar/Eliathi se gestiona aparte, más adelante, para producción).
- [x] Confirmar que, además del certificado, Afip SDK requiere un **`access_token` propio de su plataforma** (distinto del certificado de AFIP) — obtenido desde el dashboard de afipsdk.com. Define que la Fase 1 tiene que guardar **dos credenciales separadas**: el par certificado+clave (para AFIP) y el `access_token` (para la plataforma de Afip SDK).
- [x] Autorizar el servicio **WSFE** para el certificado, vía WSASS (`Autorizaciones` → `Crear autorización a servicio`) — confirmado creado: `ALIASCOMPUTADOR=fabbrichomologacion`, `CUITREPRESENTADO=20304556006`, `SERVICIO=ws://wsfe`.
- [x] Invocar `FECAESolicitar` (WSFEv1) con este certificado para confirmar de punta a punta que devuelve un CAE real — hecho en la Fase 1, Tarea 2 (`02-modulo-servicio-afip`): CAE `86360849284689` obtenido contra homologación (2026-09-03).

## Prerrequisito que no estaba previsto acá: punto de venta

Al llegar a la Fase 1 apareció un cuarto prerrequisito que este checklist no contemplaba: **AFIP exige un punto de venta de tipo "Web Services" dado de alta** (portal "Puntos de Venta y Domicilios", distinto de WSASS) antes de poder pedir cualquier CAE — el certificado y la autorización WSFE de este checklist no alcanzan solos. En este caso ya existía (punto 1, dado de alta antes por el usuario), así que no bloqueó, pero **para producción con el CUIT de Edgar este paso también va a hacer falta** y hoy no está hecho. Detalle completo en `../01-config-afip-org/02-modulo-servicio-afip/README.md`.

## Cómo se hizo

1. **Cuenta en afipsdk.com** creada (organización `fabbric`, plan Free) — de ahí se obtuvo el `access_token` de la plataforma.
2. **Habilitación del servicio WSASS** en el escritorio de ARCA: `Administrador de Relaciones de Clave Fiscal` → autorización F.3283/E auto-otorgada (`LOPEZ JULIAN MARCELO`, CUIT `20-30455600-6`) para `WSASS - Autogestión Certificados Homologación`.
3. **Clave privada + CSR** generados localmente con OpenSSL (`openssl req -new -newkey rsa:2048 -nodes`), subject `/C=AR/O=LOPEZ JULIAN MARCELO/CN=fabbrichomologacion/serialNumber=CUIT 20304556006` — el alias inicial (`fabbric-homologacion`, con guion) fue rechazado por AFIP ("el nombre simbólico del DN solo puede contener números y/o letras"); se regeneró sin guion.
4. **Certificado obtenido** en WSASS (`Crear DN y obtener certificado`), emitido por la CA de homologación de AFIP (`Computadores Test / AFIP / AR`), vigente 25/08/2026 → 24/08/2028. Verificado por `openssl` que el modulus del certificado coincide con el de la clave privada (par válido).
5. **Autorización del servicio WSFE** creada en WSASS para ese certificado y ese CUIT.

## Dónde quedaron los archivos

**Actualizado tras la Fase 1** — ya no dependen del scratchpad temporal:

- Copia de respaldo en `C:\Users\JulianLopez\afip-fabbric-homologacion\` (fuera del repo, fuera de git).
- Certificado, clave privada y `access_token` de Afip SDK cargados **cifrados** en `catalogConfigs` (org de Eliathi) — ver `../01-config-afip-org/01-migracion-config-afip/README.md`. Esta es la copia que efectivamente usa el backend.

## Definition of Done

- [x] Hay un certificado de homologación utilizable, con la clave privada que le corresponde, verificados como par válido.
- [x] Confirmado qué credenciales exactas hay que guardar en la Fase 1: certificado + clave privada (AFIP) + `access_token` (plataforma Afip SDK).
- [x] Servicio WSFE autorizado para ese certificado y ese CUIT.

## Dependencias

- **La bloquean**: ninguna.
- **Bloquea**: todas las fases siguientes (01 a 07) — sin certificado no hay nada para probar. **Desbloqueada.**
