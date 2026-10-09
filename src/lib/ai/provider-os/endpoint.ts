import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { resolveDeploymentEnvironment } from '../../build/deployment';
import { validateCustomProviderEndpoint } from '../../build/custom-provider';
export function isPublicAddress(address: string): boolean {
    if (isIP(address) === 4) {
        const [a, b] = address.split('.').map(Number);
        return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
    }
    if (isIP(address) === 6)
        return !/^(::|fc|fd|fe[89ab]|ff|2001:db8)/i.test(address);
    return false;
}
export function endpointSyntax(value: unknown, local = false): string | null {
    if (typeof value !== 'string' || value.length > 1000)
        return 'Provide a valid endpoint.';
    try {
        const url = new URL(value);
        if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol))
            return 'Endpoints cannot contain credentials, query strings or fragments.';
        if (local)
            return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ['/v1', '/v1/'].includes(url.pathname) ? null : 'Local endpoints must use loopback and the /v1 API path.';
        const declaration = validateCustomProviderEndpoint(value);
        if (declaration)
            return declaration;
        if (url.protocol !== 'https:' || isIP(url.hostname.replace(/^\[|\]$/g, '')) || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|invalid)$/i.test(url.hostname))
            return 'Custom endpoints require a public HTTPS hostname.';
        return null;
    }
    catch {
        return 'Provide a valid endpoint.';
    }
}
/** DNS is checked once, then the native socket is pinned to that address. Redirects are refused. */
export async function safeEndpointFetch(input: string, init: RequestInit, env: Record<string, string | undefined>): Promise<Response> {
    const url = new URL(input);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol))
        throw new Error('Unsafe provider endpoint refused.');
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    let address: {
        address: string;
        family: number;
    };
    if (loopback) {
        const ports = (env.KNOUX_PROVIDER_LOCAL_PORTS ?? '11434,1234,8080').split(',').map(v => v.trim());
        if (resolveDeploymentEnvironment(env) !== 'local' || !ports.includes(url.port || (url.protocol === 'https:' ? '443' : '80')))
            throw new Error('Local provider requires an authorized local host and port. Hosted servers cannot control a user-local runtime.');
        address = { address: url.hostname === '[::1]' ? '::1' : '127.0.0.1', family: url.hostname === '[::1]' ? 6 : 4 };
    }
    else {
        if (url.protocol !== 'https:' || !url.hostname.includes('.') || isIP(url.hostname))
            throw new Error('Public HTTPS provider hostname required.');
        const hosts = (env.KNOUX_PROVIDER_ALLOWED_HOSTS ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
        if (!hosts.includes(url.hostname.toLowerCase()))
            throw new Error('Custom endpoint host is not allowed by the server operator.');
        const addresses = await lookup(url.hostname, { all: true });
        if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address)))
            throw new Error('Private or reserved endpoint address refused.');
        address = addresses[0];
    }
    if (init.signal?.aborted)
        throw new DOMException('Aborted', 'AbortError');
    return new Promise((resolve, reject) => {
        const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
        const options: RequestOptions & {
            autoSelectFamily: boolean;
        } = { method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers)), family: address.family, autoSelectFamily: false,
            lookup: (_hostname, _options, callback) => callback(null, address.address, address.family), signal: init.signal ?? undefined };
        const req = send(url, options, res => {
            if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400) {
                res.destroy();
                reject(new Error('Provider redirects are refused.'));
                return;
            }
            let bytes = 0;
            res.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > 16 * 1024 * 1024)
                    res.destroy(new Error('Provider response exceeded the safe size limit.'));
            });
            const headers = new Headers();
            for (const [name, value] of Object.entries(res.headers))
                if (value !== undefined)
                    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
            const body = [204, 205, 304].includes(res.statusCode ?? 0) ? null : Readable.toWeb(res) as ReadableStream<Uint8Array>;
            resolve(new Response(body, { status: res.statusCode ?? 502, headers }));
        });
        req.on('error', () => reject(new Error('Provider endpoint request failed.')));
        req.setTimeout(120000, () => req.destroy(new Error('Provider endpoint timed out.')));
        if (typeof init.body === 'string')
            req.write(init.body);
        else if (init.body != null) {
            req.destroy();
            reject(new Error('Unsupported provider request body.'));
            return;
        }
        req.end();
    });
}
