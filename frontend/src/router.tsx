import { createBrowserRouter, Link } from "react-router-dom";
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

// Índice de DESARROLLO (T0): hub para saltar a cada portal mientras se construye.
// En producción esta raíz sería una landing de fabbric.
function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>fabbric</h1>
      <p style={{ color: "#6b7280" }}>índice de desarrollo</p>
      <ul>
        <li><Link to="/admin">Portal Admin (vendedor)</Link></li>
        <li><Link to="/store/demo">Tienda pública (slug: demo)</Link></li>
        <li>
          Portal del comprador: vive dentro de cada tienda —{" "}
          <Link to="/store/demo/portal/orders">Mis pedidos de la tienda demo</Link> (T6 tarea 8)
        </li>
      </ul>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
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
