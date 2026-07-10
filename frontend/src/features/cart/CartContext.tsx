import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Carrito CLIENT-SIDE por tienda (localStorage con key por slug — los carritos
// de dos tiendas no se mezclan). Los precios acá son informativos: el checkout
// (tarea 6) relee precios y stock de la DB; jamás se confía en el cliente.

export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  talle: string;
  color: string;
  /** centavos — informativo, el server recalcula */
  unitPrice: number;
  qty: number;
  imageUrl: string | null;
  /** stock online conocido al agregar — capea la cantidad en la UI */
  stockOnline: number;
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartState | null>(null);

const storageKey = (slug: string) => `fabbric-cart:${slug}`;

function load(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => load(slug));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(load(slug));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(storageKey(slug), JSON.stringify(items));
  }, [slug, items]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const next = Math.min(existing.qty + qty, item.stockOnline);
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, ...item, qty: next } : i));
      }
      return [...prev, { ...item, qty: Math.min(qty, item.stockOnline) }];
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, i.stockOnline)) } : i
        )
        .filter((i) => i.qty > 0)
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((acc, i) => acc + i.qty, 0);
    const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);
    return {
      items,
      count,
      subtotal,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, isOpen, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
