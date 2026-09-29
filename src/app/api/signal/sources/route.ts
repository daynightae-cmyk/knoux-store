import { NextResponse } from 'next/server';
import type { SignalSourceStatus } from '@/lib/signal/types';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('signal_sources_public');

  if (error) {
    return NextResponse.json(
      { ok: false, sources: [], error: 'Signal source registry is unavailable.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { ok: true, sources: (data ?? []) as SignalSourceStatus[] },
    { headers: { 'cache-control': 'no-store' } },
  );
}
