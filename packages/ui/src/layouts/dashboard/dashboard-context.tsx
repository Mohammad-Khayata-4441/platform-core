"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type {
  DashboardNavItem,
  DashboardLink,
  DashboardUser,
  DashboardStore,
  DashboardNotification,
  DashboardNotificationsProps,
} from "./types";

// ─── Context Shape ────────────────────────────────────────────────────────────

export type DashboardContextValue = {
  // Navigation / data
  navItems: DashboardNavItem[];
  settingsNavigation: DashboardLink;
  storefrontNavigation?: DashboardLink;
  user?: DashboardUser | null;
  store?: DashboardStore | null;
  onLogout?: () => Promise<void> | void;

  // Sidebar (desktop)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Search sheet
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  // Notifications sheet
  notificationOpen: boolean;
  setNotificationOpen: (open: boolean) => void;
  toggleNotification: () => void;

  // Notifications feed (injected per-app; UI package stays api-client-free)
  notifications: DashboardNotification[];
  notificationsUnreadCount: number;
  notificationsLoading: boolean;
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;

  // User menu (desktop popover / mobile sheet)
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  toggleUserMenu: () => void;

  // "More" drawer (mobile bottom nav)
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export type DashboardProviderProps = {
  children: ReactNode;
  navItems: DashboardNavItem[];
  settingsNavigation: DashboardLink;
  storefrontNavigation?: DashboardLink;
  user?: DashboardUser | null;
  store?: DashboardStore | null;
  onLogout?: () => Promise<void> | void;
} & DashboardNotificationsProps;

export function DashboardProvider({
  children,
  navItems,
  settingsNavigation,
  storefrontNavigation,
  user,
  store,
  onLogout,
  notifications,
  notificationsUnreadCount,
  notificationsLoading,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: DashboardProviderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const value: DashboardContextValue = {
    navItems,
    settingsNavigation,
    storefrontNavigation,
    user,
    store,
    onLogout,

    sidebarOpen,
    setSidebarOpen,
    toggleSidebar: () => setSidebarOpen((v) => !v),

    searchOpen,
    setSearchOpen,
    toggleSearch: () => setSearchOpen((v) => !v),

    notificationOpen,
    setNotificationOpen,
    toggleNotification: () => setNotificationOpen((v) => !v),

    notifications: notifications ?? [],
    notificationsUnreadCount: notificationsUnreadCount ?? 0,
    notificationsLoading: notificationsLoading ?? false,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,

    userMenuOpen,
    setUserMenuOpen,
    toggleUserMenu: () => setUserMenuOpen((v) => !v),

    menuOpen,
    setMenuOpen,
    toggleMenu: () => setMenuOpen((v) => !v),
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  }
  return ctx;
}
