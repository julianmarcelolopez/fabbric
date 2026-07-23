import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { financialMovements, orderItems, wallets } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";

// Los helpers de cobro corren dentro de la transacción del caller
// (mark-paid / webhook): reciben el tx, no usan `db` directo.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Fecha CONTABLE: hoy en Argentina (en-CA => YYYY-MM-DD), patrón bordart.
// El servidor corre en UTC: a la noche AR ya es "mañana" en UTC y el reporte
// mensual cruzaría de mes si usáramos new Date() directo.
export function todayAr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

/** Rango [desde, hasta) de un mes calendario para filtrar la columna `date` */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01`;
  const to = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  return { from, to };
}

/** Año/mes actuales en fecha contable AR (defaults de movimientos y resumen) */
export function currentArYearMonth(): { year: number; month: number } {
  const [year, month] = todayAr().split("-").map(Number);
  return { year, month };
}

/** La cartera debe existir en la org y estar activa para recibir movimientos */
export async function requireActiveWallet(orgId: string, walletId: string) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.orgId, orgId)));
  if (!wallet) throw new AppError(400, "invalid_wallet", "La cartera no existe en esta organización");
  if (!wallet.active) throw new AppError(400, "inactive_wallet", "La cartera está inactiva");
  return wallet;
}

/**
 * Resumen financiero de un rango [from, to): la ÚNICA fuente de estos números
 * (la usan el summary de finanzas y el overview del dashboard — si divergen
 * alguna vez, es un bug acá, no en dos queries distintas).
 * Ganancia bruta: ítems de los pedidos COBRADOS en el rango (fecha del
 * movimiento de cobro vinculado); ítem sin costo => costo 0. Neta = bruta − egresos.
 */
export async function monthSummary(orgId: string, from: string, to: string) {
  const inMonth = [
    eq(financialMovements.orgId, orgId),
    gte(financialMovements.date, from),
    lt(financialMovements.date, to),
  ];

  const [totals] = await db
    .select({
      ingresos: sql<number>`coalesce(sum(${financialMovements.amount})
        filter (where ${financialMovements.type} = 'income'), 0)::int`,
      egresos: sql<number>`coalesce(sum(${financialMovements.amount})
        filter (where ${financialMovements.type} = 'expense'), 0)::int`,
    })
    .from(financialMovements)
    .where(and(...inMonth));

  const [profit] = await db
    .select({
      gananciaBruta: sql<number>`coalesce(sum(
        (${orderItems.unitPrice} - coalesce(${orderItems.unitCostSnapshot}, 0)) * ${orderItems.qty}
      ), 0)::int`,
    })
    .from(orderItems)
    .where(
      sql`${orderItems.orderId} in (
        select distinct ${financialMovements.orderId} from ${financialMovements}
        where ${and(...inMonth, isNotNull(financialMovements.orderId), eq(financialMovements.type, "income"))}
      )`
    );

  return {
    ingresos: totals.ingresos,
    egresos: totals.egresos,
    balance: totals.ingresos - totals.egresos,
    gananciaBruta: profit.gananciaBruta,
    gananciaNeta: profit.gananciaBruta - totals.egresos,
  };
}

export const MP_WALLET_NAME = "Mercado Pago";

/**
 * Cartera "Mercado Pago" de la org — lazy, patrón `ensureConfig`. La usa el
 * webhook para registrar los cobros online. Se usa aunque esté inactiva:
 * la plata entró a MP igual, desactivarla no detiene las ventas.
 */
export async function ensureMpWallet(tx: Tx, orgId: string) {
  const [existing] = await tx
    .select()
    .from(wallets)
    .where(and(eq(wallets.orgId, orgId), eq(wallets.name, MP_WALLET_NAME)));
  if (existing) return existing;
  const [created] = await tx
    .insert(wallets)
    .values({ orgId, name: MP_WALLET_NAME, icon: "mercadopago", color: "#00b1ea" })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Carrera con otro insert concurrente: la unique (orgId, name) ganó — releer
  const [row] = await tx
    .select()
    .from(wallets)
    .where(and(eq(wallets.orgId, orgId), eq(wallets.name, MP_WALLET_NAME)));
  return row;
}

/**
 * Movimiento de cobro vinculado al pedido — IDEMPOTENTE por pedido: si ya hay
 * un ingreso vinculado (replay de webhook, doble click), no duplica.
 */
export async function recordOrderCharge(
  tx: Tx,
  params: {
    orgId: string;
    walletId: string;
    orderId: string;
    orderNumber: number;
    amount: number;
    viaMp?: boolean;
  }
) {
  const [existing] = await tx
    .select({ id: financialMovements.id })
    .from(financialMovements)
    .where(
      and(
        eq(financialMovements.orderId, params.orderId),
        eq(financialMovements.type, "income")
      )
    );
  if (existing) return;
  await tx.insert(financialMovements).values({
    orgId: params.orgId,
    walletId: params.walletId,
    type: "income",
    amount: params.amount,
    category: "Venta",
    description: `Cobro pedido #${params.orderNumber}${params.viaMp ? " (Mercado Pago)" : ""}`,
    date: todayAr(),
    orderId: params.orderId,
  });
}
