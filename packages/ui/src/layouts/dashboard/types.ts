import type { LucideIcon } from "lucide-react";
import { DashboardCtx } from "./desktop-dashboard-layout";

export type DashboardNavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  exact?: boolean;
  group?: string;
  children?: DashboardNavItem[];
};

export type DashboardUser = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
};

export type DashboardStore = {
  name?: string | null;
  logo?: string | null;
};

export type DashboardLink = {
  label: string;
  icon: LucideIcon;
  href: string;
};

/**
 * UI-facing notification shape. Kept local to the UI package so the shared
 * layout stays free of any `@e-dukan/api-client` dependency — each app maps its
 * own feed into this type.
 */
export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  link?: string | null;
};

export type DashboardNotificationsProps = {
  notifications?: DashboardNotification[];
  notificationsUnreadCount?: number;
  notificationsLoading?: boolean;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
};

export type DashboardShellProps = {
  children: React.ReactNode;
  navItems: DashboardNavItem[];
  settingsNavigation: DashboardLink;
  storefrontNavigation?: DashboardLink;
  user?: DashboardUser | null;
  store?: DashboardStore | null;
  logoFullSrc?: string;
  logoIconSrc?: string;
  searchText?: string;
  searchPlaceholder?: string;
  notificationsTitle?: string;
  noNotificationsText?: string;
  menuTitle?: string;
  profileText?: string;
  websiteText?: string;
  logoutText?: string;
  profileHref?: string;
  onLogout?: () => Promise<void> | void;
  sidebarFooter?: (ctx: DashboardCtx) => React.ReactNode;
  mobileMenuFooter?: React.ReactNode;
} & DashboardNotificationsProps;

export type DashboardCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
};