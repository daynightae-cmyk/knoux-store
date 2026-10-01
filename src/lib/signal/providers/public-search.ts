import type { SignalPublicMention } from '../types';

type ExaResult = {
  title?: string;
  url?: string;
  text?: string;
};

type ExaResponse = {
  results?: ExaResult[];
};

export type SignalPublicSearchResult = {
  status: 'live' | 'error' | 'not_configured';
  mentions: SignalPublicMention[];
};

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export async function searchPublicPhoneMentions(
  e164: string,
  nationalNumber: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SignalPublicSearchResult> {
  const key = env.EXA_API_KEY?.trim();
  if (!key) return { status: 'not_configured', mentions: [] };

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify({
        query: `"${e164}"`,
        type: 'auto',
        numResults: 8,
        contents: { text: { maxCharacters: 1200 } },
      }),
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });

    if (!response.ok) return { status: 'error', mentions: [] };
    const payload = await response.json() as ExaResponse;
    const targetE164 = digits(e164);
    const targetNational = digits(nationalNumber);
    const mentions = (payload.results ?? []).flatMap((item) => {
      const url = item.url?.trim();
      if (!url) return [];
      const haystack = digits(`${item.title ?? ''} ${item.text ?? ''} ${url}`);
      if (!haystack.includes(targetE164) && !haystack.includes(targetNational)) return [];

      return [{
        title: item.title?.trim() || domainOf(url),
        url,
        domain: domainOf(url),
        snippet: item.text?.trim().slice(0, 480) || null,
      } satisfies SignalPublicMention];
    });

    const deduped = Array.from(new Map(mentions.map((item) => [item.url, item])).values());
    return { status: 'live', mentions: deduped.slice(0, 8) };
  } catch {
    return { status: 'error', mentions: [] };
  }
}
