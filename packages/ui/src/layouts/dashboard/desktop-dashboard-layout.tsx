"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, MenuIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "../../shadcn/avatar";
import { Button } from "../../shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shadcn/tooltip";
import { cn } from "../../lib/cn";
import { useDashboard } from "./dashboard-context";
import type { DashboardNavItem } from "./types";

function isItemActive(pathname: string, item: DashboardNavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}


export type DashboardCtx = {

  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
export type DesktopDashboardLayoutProps = {
  children: React.ReactNode;
  logoFullSrc?: string;
  footer?: (dashboardCtx: DashboardCtx) => React.ReactNode;
};

export default function DesktopDashboardLayout({
  children,
  footer,
  logoFullSrc = "/logo-typo.svg",
}: DesktopDashboardLayoutProps) {
  const rawPathname = usePathname();
  // Strip locale prefix (/ar-SY/store-front → /store-front), but not path starts (/store-front → /store-front)
  const pathname = rawPathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, '') || '/';
  const { navItems, storefrontNavigation, user, store, sidebarOpen, toggleSidebar } = useDashboard();

  return (
    <TooltipProvider>
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <aside
        className={cn(
          "bg-secondary text-secondary-foreground border-e border-secondary-foreground/10 flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between p-4 ps-6",
            !sidebarOpen && "justify-center"
          )}
        >
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2">
              <Image src={logoFullSrc} alt="Logo" width={30} height={30} className="h-auto w-18" />
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
          >
            <MenuIcon className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 sidebar-scrollbar">
          {(() => {
            const groups = navItems.reduce<Map<string, DashboardNavItem[]>>((acc, item) => {
              const key = item.group ?? '';
              if (!acc.has(key)) acc.set(key, []);
              acc.get(key)!.push(item);
              return acc;
            }, new Map());

            let globalIndex = 0;
            return Array.from(groups.entries()).map(([groupLabel, items]) => {
              const showHeading = !!groupLabel && !items.some((i) => i.children?.length);
              return (
                <div key={groupLabel || "__ungrouped"} className="space-y-1">
                  {showHeading && sidebarOpen && (
                    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground/50">
                      {groupLabel}
                    </p>
                  )}
                  {showHeading && !sidebarOpen && (
                    <div className="mx-3 h-px bg-secondary-foreground/15 mb-1" />
                  )}
                  {items.map((item) => {
                    const i = globalIndex++;
                    return (
                      <DesktopNavItem
                        key={item.href}
                        item={item}
                        index={i}
                        pathname={pathname}
                        sidebarOpen={sidebarOpen}
                      />
                    );
                  })}
                </div>
              );
            });
          })()}

          {storefrontNavigation && (
            <Link
              target="_blank"
              href={storefrontNavigation.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 mt-2 rounded-lg transition-colors text-primary hover:bg-primary/10",
                !sidebarOpen && "justify-center"
              )}
            >
              <storefrontNavigation.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span className="font-medium">{storefrontNavigation.label}</span>}
            </Link>
          )}
        </nav>


        {
          footer ? footer({
            sidebarOpen,
            toggleSidebar
          }) :
            <div className="p-4 ">
              <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                <Link target="_blank" className="flex gap-2 items-center" href={storefrontNavigation?.href ?? "/"}>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={store?.logo ?? undefined} alt={user?.name ?? "user"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {user?.name}
                    </AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-foreground truncate">{store?.name}   </p>
                      <p className="text-xs text-secondary-foreground/60 truncate">{user?.name ?? "-"}</p>
                    </div>
                  )}
                </Link>
              </div>
            </div>
        }


      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 h-full overflow-y-auto">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  );
}

type DesktopNavItemProps = {
  item: DashboardNavItem;
  index: number;
  pathname: string;
  sidebarOpen: boolean;
};

function DesktopNavItem({ item, index, pathname, sidebarOpen }: DesktopNavItemProps) {
  const children = item.children ?? [];
  const childActive = children.some((child) => isItemActive(pathname, child));
  const [open, setOpen] = useState(childActive);
  // A group header shouldn't get the solid "active" fill just because a child
  // (which may share its href, e.g. the settings landing page) is active —
  // that fill belongs to whichever child row is actually current.
  const active = isItemActive(pathname, item) && !childActive;
  const Icon = item.icon;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const linkClassName = cn(
    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
    !sidebarOpen && "justify-center",
    children.length > 0 && sidebarOpen && "flex-1",
    active
      ? "bg-primary text-primary-foreground"
      : "text-background hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
  );

  const row = (
    <Link href={item.href} className={linkClassName}>
      <Icon className="h-5 w-5 shrink-0" />
      {sidebarOpen && <span className="font-medium">{item.label}</span>}
    </Link>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
    >
      {children.length > 0 && sidebarOpen ? (
        <div className={cn("rounded-lg", childActive && "bg-secondary-foreground/5")}>
          <div className="flex items-center gap-1">
            {row}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={item.label}
              aria-expanded={open}
              className={cn(
                "me-1 rounded-md p-1.5 text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground",
                childActive && "text-secondary-foreground"
              )}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-1 ms-8 space-y-1 border-s border-secondary-foreground/15 px-2 py-0.5">
                  {children.map((child) => {
                    const ChildIcon = child.icon;
                    const childIsActive = isItemActive(pathname, child);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                          childIsActive
                            ? "bg-primary text-primary-foreground"
                            : "text-background hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                        )}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          {!sidebarOpen && <TooltipContent side="right">{item.label}</TooltipContent>}
        </Tooltip>
      )}
    </motion.div>
  );
}

