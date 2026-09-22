"use client";
import type { ReactNode } from "react";
import { motion } from "motion/react";

import DashboardHeader, { type DashboardHeaderProps } from "./dashboard-header";
import { cn } from "../../lib/cn";

/* ─────────────────────────────────────────────────────────────────
   Compound Component: DashboardPage
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageProps = {
  children: ReactNode;
};

export function DashboardPage({ children }: DashboardPageProps) {
  return (
    <div className="flex flex-col min-h-full">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Slot: DashboardPage.Header
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageHeaderProps = DashboardHeaderProps & {
  children?: ReactNode;
};

DashboardPage.Header = function DashboardPageHeader({
  children,
  ...headerProps
}: DashboardPageHeaderProps) {
  if (children) {
    return (
      <motion.div
        className="sticky top-0 z-20 border-b bg-background"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="sticky top-0 z-20"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <DashboardHeader {...headerProps} />
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Slot: DashboardPage.Body
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageMaxWidth =
  | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";

const MAX_WIDTH_CLASSES: Record<DashboardPageMaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export type DashboardPageBodyProps = {
  children: ReactNode;
  noPadding?: boolean;
  className?: string;
  /** Constrains and centers the body content — use instead of a page-local `max-w-*` wrapper div. */
  maxWidth?: DashboardPageMaxWidth;
  /** Extra classes (e.g. `space-y-6`) for the content wrapper, only rendered when `maxWidth` is set. */
  contentClassName?: string;
};

DashboardPage.Body = function DashboardPageBody({
  children,
  noPadding,
  className,
  maxWidth,
  contentClassName,
}: DashboardPageBodyProps) {
  return (
    <motion.main
      className={cn("flex-1", !noPadding && "px-4 lg:px-6 py-4 lg:py-6", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {maxWidth ? (
        <div className={cn("mx-auto w-full", MAX_WIDTH_CLASSES[maxWidth], contentClassName)}>
          {children}
        </div>
      ) : (
        children
      )}
    </motion.main>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Slot: DashboardPage.Toolbar
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageToolbarProps = {
  children: ReactNode;
  align?: "start" | "center" | "end" | "between";
};

DashboardPage.Toolbar = function DashboardPageToolbar({
  children,
  align = "between",
}: DashboardPageToolbarProps) {
  const alignClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <motion.div
      className={cn("flex items-center gap-2 mb-4 overflow-x-auto", alignClasses[align])}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Slot: DashboardPage.Section
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageSectionProps = {
  children: ReactNode;
  title?: ReactNode;
  titleClassName?: string;
  className?: string;
};

DashboardPage.Section = function DashboardPageSection({
  children,
  title,
  titleClassName,
  className,
}: DashboardPageSectionProps) {
  return (
    <motion.section
      className={cn("mt-6", className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {title && (
        <h2 className={cn("text-lg font-semibold mb-3", titleClassName)}>
          {title}
        </h2>
      )}
      {children}
    </motion.section>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Slot: DashboardPage.Card
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageCardProps = {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
};

DashboardPage.Card = function DashboardPageCard({
  children,
  title,
  className,
}: DashboardPageCardProps) {
  return (
    <motion.div
      className={cn("rounded-lg border bg-card text-card-foreground ", className)}
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
      {title && (
        <div className="border-b px-4 py-3 font-semibold">
          {title}
        </div>
      )}
      <div className="px-4 py-4">
        {children}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Export Type
   ───────────────────────────────────────────────────────────────── */

export type DashboardPageComponent = typeof DashboardPage & {
  Header: typeof DashboardPage.Header;
  Body: typeof DashboardPage.Body;
  Toolbar: typeof DashboardPage.Toolbar;
  Section: typeof DashboardPage.Section;
  Card: typeof DashboardPage.Card;
};
