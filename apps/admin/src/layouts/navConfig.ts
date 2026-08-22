import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
}

export const NAV_SECTIONS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
    children: [
      { label: 'All Products', href: '/products' },
      { label: 'Add Product', href: '/products/new' },
      { label: 'Categories', href: '/categories' },
    ],
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: Boxes,
    children: [
      { label: 'Stock', href: '/inventory' },
      { label: 'Stock History', href: '/inventory/movements' },
    ],
  },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  {
    label: 'Reports',
    href: '/reports/sales',
    icon: BarChart3,
    children: [
      { label: 'Sales', href: '/reports/sales' },
      { label: 'Profit', href: '/reports/profit' },
      { label: 'Inventory', href: '/reports/inventory' },
    ],
  },
  {
    label: 'Excel',
    href: '/excel/import',
    icon: FileSpreadsheet,
    children: [
      { label: 'Import', href: '/excel/import' },
      { label: 'Export', href: '/excel/export' },
    ],
  },
  { label: 'Settings', href: '/settings', icon: Settings },
];
