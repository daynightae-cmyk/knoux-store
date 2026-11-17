import 'server-only';
import { safeEndpointFetch } from '../ai/provider-os/endpoint';
import type { DomainAvailability } from './shared';

const BOOTSTRAP = 'https://data.iana.org/rdap/dns.json';
type Bootstrap = { services: [string[], string[]][] };
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
let cache: { expires: number; data: Bootstrap } | null = null;

async function publicFetch(url: string, init: RequestInit) {
    // Only IANA and endpoints selected from its authenticated bootstrap are allowed.
    return safeEndpointFetch(url, init, { KNOUX_PROVIDER_ALLOWED_HOSTS: new URL(url).hostname });
}
async function bootstrap(fetcher: Fetcher): Promise<Bootstrap> {
    if (fetcher === publicFetch && cache && cache.expires > Date.now()) return cache.data;
    const response = await fetcher(BOOTSTRAP, { signal: AbortSignal.timeout(10000), headers: { accept: 'application/json' }, redirect: 'error' });
    if (!response.ok) throw new Error('IANA bootstrap unavailable');
    const data = await response.json();
    if (!Array.isArray(data.services) || !data.services.every((entry: unknown) => Array.isArray(entry) && entry.length === 2 && entry.every(value => Array.isArray(value) && value.every(item => typeof item === 'string')))) throw new Error('Invalid IANA bootstrap');
    if (fetcher === publicFetch) cache = { data, expires: Date.now() + 86400000 };
    return data;
}

/** Registration data only. A 404 is never a purchase-availability verdict. */
export async function checkRegistration(domains: readonly string[], fetcher: Fetcher = publicFetch): Promise<DomainAvailability[]> {
    let registry: Bootstrap;
    try { registry = await bootstrap(fetcher); }
    catch { return domains.map(domain => row(domain, 'error', 'IANA RDAP', 'Registration data could not be checked. / تعذّر التحقق.')); }
    return Promise.all(domains.map(async domain => {
        const tld = domain.split('.').at(-1)!;
        const endpoint = registry.services.find(([tlds]) => tlds.includes(tld))?.[1].find(value => value.startsWith('https://'));
        if (!endpoint) return row(domain, 'unsupported', 'IANA RDAP', 'No HTTPS RDAP service is listed by IANA for this extension. / الامتداد مش مدعوم في سجل IANA.');
        try {
            const base = new URL(endpoint);
            if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Invalid bootstrap endpoint');
            const url = new URL(`domain/${encodeURIComponent(domain)}`, endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
            const response = await fetcher(url.href, { signal: AbortSignal.timeout(10000), redirect: 'error', headers: { accept: 'application/rdap+json, application/json' } });
            const type = response.headers.get('content-type') ?? '';
            if (!/application\/(?:rdap\+)?json/i.test(type)) throw new Error('Non-RDAP response');
            const result = await response.json();
            if (response.status === 404 && result.errorCode === 404) return row(domain, 'no-record', base.hostname, 'No visible registration record. Registrar confirmation is required before availability or pricing. / مفيش سجل ظاهر؛ لازم تأكيد Registrar قبل الشراء أو السعر.');
            if (response.ok && result.objectClassName === 'domain' && typeof result.ldhName === 'string' && result.ldhName.toLowerCase().replace(/\.$/, '') === domain) return row(domain, 'registered', base.hostname, 'Registration record found. / مسجّل.');
            return row(domain, 'error', base.hostname, 'Incomplete or unsuccessful RDAP response. / تعذّر التحقق.');
        } catch { return row(domain, 'error', 'IANA RDAP', 'Registration service could not be checked. / تعذّر التحقق.'); }
    }));
}
function row(domain: string, state: DomainAvailability['state'], provider: string, reason: string): DomainAvailability {
    return { domain, state, provider: `RDAP · ${provider}`, reason, checkedAt: new Date().toISOString(), premium: false, registration: null, renewal: null };
}
