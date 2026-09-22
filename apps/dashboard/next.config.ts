import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@core/ui', '@core/api-client', '@core/api-contracts', '@core/auth'],
};

export default nextConfig;
