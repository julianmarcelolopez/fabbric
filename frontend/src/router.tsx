import { createBrowserRouter, Link, useParams } from "react-router-dom";
import { AdminLayout } from "./features/admin/AdminLayout";
import { RequireAuth } from "./features/admin/RequireAuth";
import { AdminHomePage } from "./features/admin/pages/AdminHomePage";
import { CategoriesPage } from "./features/admin/pages/CategoriesPage";
import { CollectionsPage } from "./features/admin/pages/CollectionsPage";
import { HomeSectionsPage } from "./features/admin/pages/HomeSectionsPage";
import { LoginPage } from "./features/admin/pages/LoginPage";
import { ProductEditPage } from "./features/admin/pages/ProductEditPage";
import { ProductsPage } from "./features/admin/pages/ProductsPage";
import { StockPage } from "./features/admin/pages/StockPage";

// /store y /portal siguen siendo placeholders — se implementan en sus fases (ver docs/plan.md)

function Home() {
  return (
    <main>
      <h1>fabbric</h1>
      <ul>
        <li><Link to="/admin">Portal Admin</Link></li>
        <li><Link to="/store/demo">Tienda (slug: demo)</Link></li>
        <li><Link to="/portal">Portal Cliente</Link></li>
      </ul>
    </main>
  );
}

function StorePlaceholder() {
  const { slug } = useParams();
  return <h1>Tienda «{slug}» — placeholder (T5)</h1>;
}

function PortalPlaceholder() {
  return <h1>Portal Cliente — placeholder (T6)</h1>;
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
      { index: true, element: <AdminHomePage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:id", element: <ProductEditPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "home", element: <HomeSectionsPage /> },
    ],
  },
  { path: "/store/:slug", element: <StorePlaceholder /> },
  { path: "/portal", element: <PortalPlaceholder /> },
]);
