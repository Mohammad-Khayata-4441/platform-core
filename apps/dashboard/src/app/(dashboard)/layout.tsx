'use client';

import type { ReactNode } from 'react';
import { ResponsiveDashboardLayout } from '@core/ui/layouts/dashboard';
import { navigation, settingsNavigation } from '@/config/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ResponsiveDashboardLayout
      navItems={navigation}
      settingsNavigation={settingsNavigation}
      user={{ name: 'Demo User', email: 'demo@example.com' }}
      store={{ name: 'Platform Core' }}
      onLogout={() => {
        /* wire to @core/auth */
      }}
    >
      {children}
    </ResponsiveDashboardLayout>
  );
}
