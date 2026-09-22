'use client';

import { buildApi } from '@/config/api';

export const api = buildApi(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4040');
