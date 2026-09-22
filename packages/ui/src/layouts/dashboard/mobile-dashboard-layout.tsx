"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../shadcn/sheet";
import { cn } from "../../lib/cn";
import { useDashboard } from "./dashboard-context";
import type { DashboardNavItem } from "./types";

function mobileItemActive(pathname: string, item: DashboardNavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

export type MobileDashboardLayoutProps = {
  children: React.ReactNode;
  menuTitle?: string;
  mobileMenuFooter?: React.ReactNode;
};

export default function MobileDashboardLayout({
  children,
  menuTitle = "القائمة",
  mobileMenuFooter,
}: MobileDashboardLayoutProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '') || '/';
  const { navItems, storefrontNavigation, menuOpen, setMenuOpen } = useDashboard();

  const bottomNavItems = navItems.slice(0, 4);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 overflow-y-auto pb-24 px-2">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-2 safe-area-pb z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {bottomNavItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-16",
                    isActive
                      ? "text-primary"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Icon className={cn("h-6 w-6", isActive && "fill-current")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              </motion.div>
            );
          })}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-16 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <Menu className="h-6 w-6" />
                <span className="text-xs font-medium">المزيد</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[20px]">
              <SheetHeader className="mb-6 text-right">
                <SheetTitle>{menuTitle}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-4 gap-4">
                {navItems.map((item) => (
                  <MobileNavTile
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setMenuOpen(false)}
                  />
                ))}
              </div>
              {storefrontNavigation && (
                <Link
                  target="_blank"
                  href={storefrontNavigation.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-4 mt-4 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                >
                  <storefrontNavigation.icon className="h-5 w-5" />
                  <span>{storefrontNavigation.label}</span>
                </Link>
              )}
              {mobileMenuFooter}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

type MobileNavTileProps = {
  item: DashboardNavItem;
  pathname: string;
  onNavigate: () => void;
};

function MobileNavTile({ item, pathname, onNavigate }: MobileNavTileProps) {
  const children = item.children ?? [];
  const childActive = children.some((child) => mobileItemActive(pathname, child));
  const [open, setOpen] = useState(childActive);
  // Don't fill the group tile solid just because a child (which may share its
  // href, e.g. the settings landing page) is active — that belongs to the child tile.
  const active = mobileItemActive(pathname, item) && !childActive;
  const Icon = item.icon;

  const tileClasses = (isActive: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all",
      isActive
        ? "bg-primary/10 text-primary"
        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
    );

  const iconWrap = (ItemIcon: LucideIcon, isActive: boolean) => (
    <div className={cn("p-3 rounded-full", isActive ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800")}>
      <ItemIcon className={cn("h-6 w-6", isActive && "fill-current")} />
    </div>
  );

  if (children.length > 0) {
    return (
      <>
        <button type="button" onClick={() => setOpen((value) => !value)} className={tileClasses(active)} aria-expanded={open}>
          {iconWrap(Icon, active)}
          <span className="text-xs font-medium text-center">{item.label}</span>
        </button>
        {open &&
          children.map((child) => {
            const ChildIcon = child.icon;
            const childIsActive = mobileItemActive(pathname, child);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={tileClasses(childIsActive)}
              >
                {iconWrap(ChildIcon, childIsActive)}
                <span className="text-xs font-medium text-center">{child.label}</span>
              </Link>
            );
          })}
      </>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={tileClasses(active)}>
      {iconWrap(Icon, active)}
      <span className="text-xs font-medium text-center">{item.label}</span>
    </Link>
  );
}

