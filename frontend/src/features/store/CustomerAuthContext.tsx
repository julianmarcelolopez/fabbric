import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, apiJson } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";

export type CustomerMe = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type State = {
  /** null = no logueado en esta tienda */
  me: CustomerMe | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State>({
  me: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function CustomerAuthProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [me, setMe] = useState<CustomerMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      // Primer uso en esta tienda → el backend crea el customer (upsert)
      setMe(await apiJson<CustomerMe>(`/portal/${slug}/me`));
    } catch (err) {
      // 404 = tienda inexistente; otros errores → tratamos como no logueado
      if (!(err instanceof ApiError)) console.error(err);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/store/${slug}` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMe(null);
  }

  return (
    <Ctx.Provider value={{ me, loading, signInWithGoogle, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(Ctx);
}
