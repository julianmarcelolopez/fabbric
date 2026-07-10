import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import { centsToPesosInput, formatPrice, pesosToCents } from "../../../lib/money";
import type { AdminCustomerRow, ProductDetail, ProductListItem, ShippingZoneRow, Variant } from "../types";

type DraftItem =
  | {
      kind: "catalog";
      variantId: string;
      label: string;
      qty: number;
      channel: "online" | "local";
      unitPrice: number;
    }
  | {
      kind: "bespoke";
      name: string;
      qty: number;
      unitPrice: number;
      unitCost: number | null;
      referenceImageUrl: string | null;
    };

export function OrderNewPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [zones, setZones] = useState<ShippingZoneRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  // Ítem de catálogo en armado
  const [productId, setProductId] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [catQty, setCatQty] = useState("1");
  const [channel, setChannel] = useState<"online" | "local">("local");

  // Ítem bespoke en armado
  const [bName, setBName] = useState("");
  const [bQty, setBQty] = useState("1");
  const [bPrice, setBPrice] = useState("");
  const [bCost, setBCost] = useState("");
  const [bImageUrl, setBImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiJson<AdminCustomerRow[]>("/admin/customers"),
      apiJson<ProductListItem[]>("/admin/products"),
      apiJson<ShippingZoneRow[]>("/admin/shipping-zones"),
    ])
      .then(([c, p, z]) => {
        setCustomers(c);
        setProducts(p);
        setZones(z.filter((zone) => zone.active));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  useEffect(() => {
    setVariants([]);
    setVariantId("");
    if (!productId) return;
    apiJson<ProductDetail>(`/admin/products/${productId}`)
      .then((d) => setVariants(d.variants))
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [productId]);

  function addCatalogItem() {
    const product = products.find((p) => p.id === productId);
    const variant = variants.find((v) => v.id === variantId);
    const qty = Number(catQty);
    if (!product || !variant || !Number.isInteger(qty) || qty < 1) {
      setError("Elegí producto, variante y cantidad válida");
      return;
    }
    const available = channel === "online" ? variant.stockOnline : variant.stockLocal;
    if (available < qty) {
      setError(`Stock ${channel} insuficiente (hay ${available})`);
      return;
    }
    setError(null);
    setItems([
      ...items,
      {
        kind: "catalog",
        variantId: variant.id,
        label: `${product.name} (${variant.talle}/${variant.color})`,
        qty,
        channel,
        unitPrice: variant.priceOverride ?? product.price,
      },
    ]);
    setProductId("");
    setCatQty("1");
  }

  function addBespokeItem() {
    const qty = Number(bQty);
    const price = pesosToCents(bPrice);
    const cost = bCost.trim() === "" ? null : pesosToCents(bCost);
    if (!bName.trim() || price === null || !Number.isInteger(qty) || qty < 1) {
      setError("Completá nombre, precio y cantidad del ítem personalizado");
      return;
    }
    if (bCost.trim() !== "" && cost === null) {
      setError("Costo inválido");
      return;
    }
    setError(null);
    setItems([
      ...items,
      { kind: "bespoke", name: bName.trim(), qty, unitPrice: price, unitCost: cost, referenceImageUrl: bImageUrl },
    ]);
    setBName("");
    setBQty("1");
    setBPrice("");
    setBCost("");
    setBImageUrl(null);
  }

  async function uploadReference(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url } = await apiUpload<{ url: string }>("/admin/orders/reference-image", file);
      setBImageUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);
  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const shipping =
    zone === null ? 0 : zone.freeShippingFrom !== null && subtotal >= zone.freeShippingFrom ? 0 : zone.cost;

  async function create() {
    if (items.length === 0) {
      setError("Agregá al menos un ítem");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        customerId: customerId || null,
        shippingZoneId: zoneId || null,
        note: note.trim() || null,
        items: items.map((i) =>
          i.kind === "catalog"
            ? { variantId: i.variantId, qty: i.qty, channel: i.channel }
            : { name: i.name, qty: i.qty, unitPrice: i.unitPrice, unitCost: i.unitCost, referenceImageUrl: i.referenceImageUrl }
        ),
      };
      const order = await apiJson<{ id: string }>("/admin/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      navigate(`/admin/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <p><Link to="/admin/orders">← Pedidos</Link></p>
      <h1>Nuevo pedido manual</h1>
      <p className="muted">Venta telefónica, presencial o a medida. Nace pendiente; el stock se descuenta al marcarlo cobrado.</p>

      <div className="card">
        <div className="row">
          <label className="field" style={{ minWidth: 220 }}>
            Cliente
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Sin cliente registrado</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 220 }}>
            Envío
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">Retiro / sin envío</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} — {formatPrice(z.cost)}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            Nota
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Agregar ítem de catálogo</h2>
        <div className="row">
          <label className="field" style={{ minWidth: 200 }}>
            Producto
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Elegir…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Variante
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!variants.length}>
              <option value="">—</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.talle}/{v.color} (online {v.stockOnline} · local {v.stockLocal})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Canal
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
              <option value="local">Local</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label className="field">
            Cant.
            <input style={{ width: 60 }} value={catQty} onChange={(e) => setCatQty(e.target.value)} inputMode="numeric" />
          </label>
          <button className="btn" onClick={addCatalogItem}>Agregar</button>
        </div>
      </div>

      <div className="card">
        <h2>Agregar ítem personalizado (bespoke)</h2>
        <div className="row">
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            Descripción
            <input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Bordado personalizado…" />
          </label>
          <label className="field">
            Precio ($)
            <input style={{ width: 100 }} value={bPrice} onChange={(e) => setBPrice(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            Costo ($)
            <input style={{ width: 100 }} value={bCost} onChange={(e) => setBCost(e.target.value)} inputMode="decimal" placeholder="—" />
          </label>
          <label className="field">
            Cant.
            <input style={{ width: 60 }} value={bQty} onChange={(e) => setBQty(e.target.value)} inputMode="numeric" />
          </label>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Subiendo…" : bImageUrl ? "Imagen ✓" : "Imagen ref."}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadReference(f);
              e.target.value = "";
            }}
          />
          <button className="btn" onClick={addBespokeItem}>Agregar</button>
        </div>
        {bImageUrl && (
          <p className="muted" style={{ marginTop: 8 }}>
            <img src={bImageUrl} alt="referencia" className="thumb" style={{ verticalAlign: "middle", marginRight: 6 }} />
            Imagen lista — se adjunta al próximo ítem que agregues.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Ítems del pedido</h2>
        {items.length === 0 ? (
          <p className="muted">Todavía no agregaste ítems.</p>
        ) : (
          <table className="grid">
            <thead>
              <tr><th>Ítem</th><th>Cant.</th><th>Precio</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    {item.kind === "catalog" ? (
                      <>{item.label} <span className="muted">· {item.channel}</span></>
                    ) : (
                      <>{item.name} <span className="badge">bespoke</span></>
                    )}
                  </td>
                  <td>{item.qty}</td>
                  <td>{formatPrice(item.unitPrice)}</td>
                  <td>{formatPrice(item.unitPrice * item.qty)}</td>
                  <td>
                    <button className="btn small danger" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ textAlign: "right", margin: "10px 0 0" }}>
          Envío: {shipping === 0 ? "—" : formatPrice(shipping)} · <strong>Total: {formatPrice(subtotal + shipping)}</strong>
        </p>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" onClick={() => void create()} disabled={busy || items.length === 0}>
          {busy ? "Creando…" : "Crear pedido"}
        </button>
      </div>
    </>
  );
}
