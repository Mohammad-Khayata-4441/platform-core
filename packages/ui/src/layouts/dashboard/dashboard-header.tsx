"use client";

import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Globe, LogOut, Search, Settings, User } from "lucide-react";
import { type ReactNode, useRef, useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../../shadcn/avatar";
import { Badge } from "../../shadcn/badge";
import { Button } from "../../shadcn/button";
import { Input } from "../../shadcn/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/popover";
import { Separator } from "../../shadcn/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../shadcn/sheet";
import { useDashboard } from "./dashboard-context";
import { cn } from "../../lib/cn";
import type { DashboardCurrency } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const relativeTimeFormatter =
  typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
    ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
    : null;

/** Human-friendly "منذ …" label for a notification timestamp. */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then) || !relativeTimeFormatter) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeTimeFormatter.format(Math.round(diffSec), "second");
  if (abs < 3600) return relativeTimeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeTimeFormatter.format(Math.round(diffSec / 3600), "hour");
  return relativeTimeFormatter.format(Math.round(diffSec / 86400), "day");
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type DashboardHeaderProps = {
  /** Page title shown in the header */
  title?: string;
  /** Show a back button. Pass a string href to make it a link, or `true` to use browser history */
  back?: string | boolean;
  /** Label shown next to the back arrow (defaults to title if not provided) */
  backLabel?: string;
  /** Enable the inline search bar (disabled by default) */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Called when the user types in the search input */
  onSearch?: (value: string) => void;
  /** Extra nodes rendered between the title area and the icon buttons */
  actions?: ReactNode;
  notificationsTitle?: string;
  noNotificationsText?: string;
  markAllReadText?: string;
  menuTitle?: string;
  profileText?: string;
  websiteText?: string;
  logoutText?: string;
  currenciesList?: DashboardCurrency[];
  activeCurrency?: string;
  profileHref?: string;
 };

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardHeader({
  title,
  back,
  backLabel,
  showSearch = false,
  searchPlaceholder = "Search...",
  onSearch,
  actions,
  notificationsTitle = "Notifications",
  noNotificationsText = "No new notifications",
  markAllReadText = "Mark all as read",
  menuTitle = "Menu",
  profileText = "Profile",
  websiteText = "Website",
  logoutText = "Log out",
  profileHref = "/profile",
 }: DashboardHeaderProps) {
  const {
    user,
    storefrontNavigation,
    settingsNavigation,
    onLogout,
    notificationOpen,
    setNotificationOpen,
    userMenuOpen,
    setUserMenuOpen,
    notifications,
    notificationsUnreadCount,
    notificationsLoading,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,
  } = useDashboard();

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);



  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const notificationCount = notificationsUnreadCount;
  const searchRef = useRef<HTMLInputElement>(null);

  const handleNotificationClick = (id: string, href?: string | null) => {
    onMarkNotificationRead?.(id);
    setNotificationOpen(false);
    if (href) {
      window.location.assign(href);
    }
  };

  // ── Back button ──────────────────────────────────────────────────────────
  const BackButton = back ? (
    typeof back === "string" ? (
      <Button variant="ghost" size="icon" asChild className="shrink-0 -ms-1">
        <Link href={back}>
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 -ms-1"
        onClick={() => window.history.back()}
      >
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
      </Button>
    )
  ) : null;

  return (
    <header className="bg-white dark:bg-gray-900 border-b  dark:border-gray-800 px-4  lg:px-6  py-4 flex items-center gap-3 sticky top-0 z-40">

      {/* ── Left: back + title ── */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {BackButton}
        {title && (
          <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {backLabel ?? title}
          </h1>
        )}
      </div>

      {/* ── Centre: search ── */}
      {showSearch && (
        <div className="flex-1 max-w-sm lg:max-w-md">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={searchPlaceholder}
              className="ps-9 bg-gray-50 dark:bg-gray-800  dark:border-gray-700 focus-visible:ring-1"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Spacer when no search ── */}
      {!showSearch && <div className="flex-1" />}

      {/* ── Right: custom actions + icon strip ── */}
      <div className="flex items-center gap-1 lg:gap-2 shrink-0">
        {actions}
        {/* Notifications – Popover dropdown */}
        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{notificationsTitle}</p>
                {notificationCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </div>
              {notificationCount > 0 && onMarkAllNotificationsRead && (
                <button
                  type="button"
                  onClick={() => onMarkAllNotificationsRead()}
                  className="text-xs text-primary hover:underline"
                >
                  {markAllReadText}
                </button>
              )}
            </div>

            {notificationsLoading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                …
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {noNotificationsText}
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n.id, n.link)}
                      className="w-full text-start px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.isRead ? "bg-transparent" : "bg-primary",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm truncate",
                            n.isRead ? "font-normal text-gray-700 dark:text-gray-300" : "font-semibold text-gray-900 dark:text-gray-100",
                          )}
                        >
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 whitespace-pre-line">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        {/* Settings – desktop only */}
        <Button variant="ghost" size="icon" asChild className="hidden lg:flex">
          <Link href={settingsNavigation.href}>
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        {/* User menu – Popover on desktop */}
        <Popover open={isDesktop === true && userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hidden lg:flex">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? "user"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="end">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? "user"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name ?? "-"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email ?? user?.phone ?? "-"}
                  </p>
                </div>
              </div>
              <Link
                href={profileHref}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                <span>{profileText}</span>
              </Link>
              {storefrontNavigation && (
                <Link
                  href={storefrontNavigation.href}
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Globe className="h-4 w-4" />
                  <span>{websiteText}</span>
                </Link>
              )}
              <Link
                href={settingsNavigation.href}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span>{settingsNavigation.label}</span>
              </Link>
              <Separator className="my-1" />
              <button
                onClick={async () => {
                  await onLogout?.();
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span>{logoutText}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Mobile: Sheet user menu */}
        <Sheet open={isDesktop === false && userMenuOpen} onOpenChange={setUserMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="User Menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? "user"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[20px]">
            <SheetHeader className="mb-4 text-right">
              <SheetTitle>{menuTitle}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? "user"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">{user?.name ?? "-"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user?.email ?? user?.phone ?? "-"}
                  </p>
                </div>
              </div>
              <Link
                href={profileHref}
                className="flex items-center gap-3 px-4 py-3 text-base rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                <span>{profileText}</span>
              </Link>
              {storefrontNavigation && (
                <Link
                  href={storefrontNavigation.href}
                  target="_blank"
                  className="flex items-center gap-3 px-4 py-3 text-base rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Globe className="h-5 w-5" />
                  <span>{websiteText}</span>
                </Link>
              )}
              <Link
                href={settingsNavigation.href}
                className="flex items-center gap-3 px-4 py-3 text-base rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-5 w-5" />
                <span>{settingsNavigation.label}</span>
              </Link>
              <Separator className="my-2" />
              <button
                onClick={async () => {
                  await onLogout?.();
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-base rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left text-red-600 dark:text-red-400"
              >
                <LogOut className="h-5 w-5" />
                <span>{logoutText}</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
