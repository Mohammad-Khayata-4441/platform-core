"use client";

import { useEffect, useState } from "react";

import { DashboardProvider } from "./dashboard-context";
import DesktopDashboardLayout from "./desktop-dashboard-layout";
import MobileDashboardLayout from "./mobile-dashboard-layout";
import type { DashboardShellProps } from "./types";

export default function ResponsiveDashboardLayout({
  children,
  navItems,
  settingsNavigation,
  storefrontNavigation,
  user,
  store,
  onLogout,
  logoFullSrc,
  logoIconSrc,
  menuTitle,
  sidebarFooter,
  mobileMenuFooter,
  notifications,
  notificationsUnreadCount,
  notificationsLoading,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: DashboardShellProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  return (
    <DashboardProvider
      navItems={navItems}
      settingsNavigation={settingsNavigation}
      storefrontNavigation={storefrontNavigation}
      user={user}
      store={store}
      onLogout={onLogout}
      notifications={notifications}
      notificationsUnreadCount={notificationsUnreadCount}
      notificationsLoading={notificationsLoading}
      onMarkNotificationRead={onMarkNotificationRead}
      onMarkAllNotificationsRead={onMarkAllNotificationsRead}
    >
      {isDesktop === null ? (
        <div className="lg:hidden">
          <MobileDashboardLayout menuTitle={menuTitle} mobileMenuFooter={mobileMenuFooter}>{children}</MobileDashboardLayout>
        </div>
      ) : isDesktop ? (
        <DesktopDashboardLayout footer={sidebarFooter} logoFullSrc={logoFullSrc}>{children}</DesktopDashboardLayout>
      ) : (
        <MobileDashboardLayout menuTitle={menuTitle} mobileMenuFooter={mobileMenuFooter}>{children}</MobileDashboardLayout>
      )}
    </DashboardProvider>
  );
}
