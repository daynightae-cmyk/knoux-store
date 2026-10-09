'use client';
import { useCallback, useEffect, useState } from 'react';
import type { NormalizedModel, ProviderHealth } from '@/lib/ai/types';

/** One cancellable pass over existing server projections; no client catalog fallback. */
export function useCanonicalModels() {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const [data, setData] = useState<{ models: NormalizedModel[]; providers: ProviderHealth[]; loading: boolean; error: string | null }>({ models: [], providers: [], loading: true, error: null });
  useEffect(()=>{window.addEventListener('knoux-provider-profiles-changed',refresh);return()=>window.removeEventListener('knoux-provider-profiles-changed',refresh);},[refresh]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const results = await Promise.allSettled(['/api/build/ai/models', '/api/build/ai/providers'].map(async (url) => {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'AUTH REQUIRED · Sign in to inspect server intelligence.' : 'UNAVAILABLE · Canonical model metadata could not be read.');
        return response.json();
      }));
      if (controller.signal.aborted) return;
      const models = results[0].status === 'fulfilled' ? results[0].value.providers.flatMap((provider: { providerId: string; models: NormalizedModel[] }) => provider.models.map((model) => ({ ...model, providerId: provider.providerId }))) : [];
      const providers = results[1].status === 'fulfilled' ? results[1].value.providers : [];
      const rejected = results.find((result) => result.status === 'rejected');
      setData({ models, providers, loading: false, error: rejected?.status === 'rejected' ? rejected.reason.message : null });
    }
    void load();
    return () => controller.abort();
  }, [revision]);
  return { ...data, refresh };
}
