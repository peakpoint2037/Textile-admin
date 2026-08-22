import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductListPage } from '@/pages/products/ProductListPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { StockHistoryPage } from '@/pages/inventory/StockHistoryPage';
import { OrderListPage } from '@/pages/orders/OrderListPage';
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage';
import { CustomerListPage } from '@/pages/customers/CustomerListPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { SalesReportPage } from '@/pages/reports/SalesReportPage';
import { ProfitReportPage } from '@/pages/reports/ProfitReportPage';
import { InventoryReportPage } from '@/pages/reports/InventoryReportPage';
import { ExcelImportPage } from '@/pages/excel/ExcelImportPage';
import { ExcelExportPage } from '@/pages/excel/ExcelExportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />

          <Route path="/categories" element={<CategoriesPage />} />

          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/movements" element={<StockHistoryPage />} />

          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />

          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />

          <Route path="/expenses" element={<ExpensesPage />} />

          <Route path="/reports/sales" element={<SalesReportPage />} />
          <Route path="/reports/profit" element={<ProfitReportPage />} />
          <Route path="/reports/inventory" element={<InventoryReportPage />} />

          <Route path="/excel/import" element={<ExcelImportPage />} />
          <Route path="/excel/export" element={<ExcelExportPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
