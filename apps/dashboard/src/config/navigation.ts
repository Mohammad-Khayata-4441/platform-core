import { Package, Settings } from 'lucide-react';
import type { DashboardLink, DashboardNavItem } from '@core/ui/layouts/dashboard';

export const navigation: DashboardNavItem[] = [
  { label: 'Items', href: '/items', icon: Package, exact: false },
];

export const settingsNavigation: DashboardLink = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
};
