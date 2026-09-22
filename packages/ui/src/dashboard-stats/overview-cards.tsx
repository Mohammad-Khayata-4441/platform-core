"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../shadcn/card";

export type StatCardItem = {
  key: string;
  title: string;
  value?: number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

export type StatCardProps = {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

export function StatCard({ title, value, subtitle, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`rounded-xl p-2.5 ${bgColor} transition-transform group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value.toLocaleString("ar-AE")}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${bgColor} opacity-60`} />
    </Card>
  );
}

export type OverviewCardsGridProps = {
  items: StatCardItem[];
  data: Record<string, number>;
  columns?: string;
};

export default function OverviewCardsGrid({
  items,
  data,
  columns = "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
}: OverviewCardsGridProps) {
  return (
    <div className={`grid ${columns} gap-4`}>
      {items.map((stat) => (
        <StatCard
          key={stat.key}
          title={stat.title}
          value={data[stat.key] ?? 0}
          subtitle={stat.subtitle}
          icon={stat.icon}
          color={stat.color}
          bgColor={stat.bgColor}
        />
      ))}
    </div>
  );
}
