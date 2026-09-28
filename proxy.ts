import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/account/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/update-password',
    '/auth/:path*',
  ],
};
