import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./features/admin/AdminLayout";
import { RequireAuth } from "./features/admin/RequireAuth";
import { CustomerDetailPage } from "./features/admin/pages/CustomerDetailPage";
import { CustomersPage } from "./features/admin/pages/CustomersPage";
import { DashboardPage } from "./features/admin/pages/DashboardPage";
import { FinanzasPage } from "./features/admin/pages/FinanzasPage";
import { LoginPage } from "./features/admin/pages/LoginPage";
import { MyStorePage } from "./features/admin/pages/MyStorePage";
import { OrderAdminDetailPage } from "./features/admin/pages/OrderAdminDetailPage";
import { OrderNewPage } from "./features/admin/pages/OrderNewPage";
import { OrdersPage } from "./features/admin/pages/OrdersPage";
import { ProductEditPage } from "./features/admin/pages/ProductEditPage";
import { ProductsPage } from "./features/admin/pages/ProductsPage";
import { SettingsPage } from "./features/admin/pages/SettingsPage";
import { ShippingZonesPage } from "./features/admin/pages/ShippingZonesPage";
import { StoreLayout } from "./features/store/StoreLayout";
import { CategoryPage } from "./features/store/pages/CategoryPage";
import { CatalogHomePage } from "./features/store/pages/CatalogHomePage";
import { CheckoutPage } from "./features/store/pages/CheckoutPage";
import { CheckoutResultPage } from "./features/store/pages/CheckoutResultPage";
import { MyOrdersPage } from "./features/store/pages/MyOrdersPage";
import { OrderDetailPage } from "./features/store/pages/OrderDetailPage";
import { StoreProductPage } from "./features/store/pages/StoreProductPage";

// El portal del comprador vive dentro de cada tienda (/store/:slug/portal/*) — T6 tarea 8

export const router = createBrowserRouter([
  // Redirect relativo (no hardcodea dominio): funciona igual en local y en cualquier
  // deploy. Para la demo de Eliathi Modas, la raíz cae directo en su tienda.
  { path: "/", element: <Navigate to="/store/eliathi-modas" replace /> },
  { path: "/admin/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      // Redirects (T19/02): Categorías, Colecciones y Stock ahora son tabs de Productos —
      // estas rutas quedan solo para no romper links/favoritos ya guardados.
      { path: "categories", element: <Navigate to="/admin/products?tab=categorias" replace /> },
      { path: "collections", element: <Navigate to="/admin/products?tab=colecciones" replace /> },
      { path: "stock", element: <Navigate to="/admin/products?tab=stock" replace /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:id", element: <ProductEditPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/new", element: <OrderNewPage /> },
      { path: "orders/:id", element: <OrderAdminDetailPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomerDetailPage /> },
      { path: "finance", element: <FinanzasPage /> },
      // Redirects (T19/07): Home y Configuración de tienda se unificaron en "Mi tienda".
      { path: "home", element: <Navigate to="/admin/store" replace /> },
      { path: "config", element: <Navigate to="/admin/store" replace /> },
      { path: "shipping", element: <ShippingZonesPage /> },
      { path: "store", element: <MyStorePage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/store/:slug",
    element: <StoreLayout />,
    children: [
      { index: true, element: <CatalogHomePage /> },
      { path: "c/:categorySlug", element: <CategoryPage /> },
      { path: "p/:productId", element: <StoreProductPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "checkout/result", element: <CheckoutResultPage /> },
      { path: "portal/orders", element: <MyOrdersPage /> },
      { path: "portal/orders/:orderId", element: <OrderDetailPage /> },
    ],
  },
]);
