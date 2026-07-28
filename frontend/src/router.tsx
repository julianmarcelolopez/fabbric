import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./features/admin/AdminLayout";
import { RequireAuth } from "./features/admin/RequireAuth";
import { CatalogConfigPage } from "./features/admin/pages/CatalogConfigPage";
import { CategoriesPage } from "./features/admin/pages/CategoriesPage";
import { CollectionsPage } from "./features/admin/pages/CollectionsPage";
import { CustomerDetailPage } from "./features/admin/pages/CustomerDetailPage";
import { CustomersPage } from "./features/admin/pages/CustomersPage";
import { DashboardPage } from "./features/admin/pages/DashboardPage";
import { FinanzasPage } from "./features/admin/pages/FinanzasPage";
import { HomeSectionsPage } from "./features/admin/pages/HomeSectionsPage";
import { LoginPage } from "./features/admin/pages/LoginPage";
import { OrderAdminDetailPage } from "./features/admin/pages/OrderAdminDetailPage";
import { OrderNewPage } from "./features/admin/pages/OrderNewPage";
import { OrdersPage } from "./features/admin/pages/OrdersPage";
import { ProductEditPage } from "./features/admin/pages/ProductEditPage";
import { ProductsPage } from "./features/admin/pages/ProductsPage";
import { SettingsPage } from "./features/admin/pages/SettingsPage";
import { ShippingZonesPage } from "./features/admin/pages/ShippingZonesPage";
import { StockPage } from "./features/admin/pages/StockPage";
import { StoreLayout } from "./features/store/StoreLayout";
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
      { path: "categories", element: <CategoriesPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:id", element: <ProductEditPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/new", element: <OrderNewPage /> },
      { path: "orders/:id", element: <OrderAdminDetailPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:id", element: <CustomerDetailPage /> },
      { path: "finance", element: <FinanzasPage /> },
      { path: "home", element: <HomeSectionsPage /> },
      { path: "shipping", element: <ShippingZonesPage /> },
      { path: "config", element: <CatalogConfigPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/store/:slug",
    element: <StoreLayout />,
    children: [
      { index: true, element: <CatalogHomePage /> },
      { path: "p/:productId", element: <StoreProductPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "checkout/result", element: <CheckoutResultPage /> },
      { path: "portal/orders", element: <MyOrdersPage /> },
      { path: "portal/orders/:orderId", element: <OrderDetailPage /> },
    ],
  },
]);
