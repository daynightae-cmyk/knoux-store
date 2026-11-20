import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const root = await fs.realpath(process.env.KNOUX_PREVIEW_ROOT ?? '');
const token = process.env.KNOUX_PREVIEW_TOKEN ?? '';
const parentUrl = new URL(process.env.KNOUX_PREVIEW_PARENT_ORIGIN ?? '');
if (parentUrl.protocol !== 'http:' && parentUrl.protocol !== 'https:') throw new Error('A bounded parent origin is required.');
const parentOrigin = parentUrl.origin;
if (!/^[a-z][a-z0-9+.-]*:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(parentOrigin)) throw new Error('The parent origin is malformed.');
if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('A bounded preview ticket is required.');
const prefix = `/${token}/`;

/** Serializes a validated constant for an inline script; `<` cannot terminate the element. */
function jsLiteral(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function safeRelative(candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'], ['.md', 'text/plain; charset=utf-8'],
]);

const probe = `<script>(()=>{const token=${jsLiteral(token)},parentOrigin=${jsLiteral(parentOrigin)},redact=value=>String(value).slice(0,500).replace(/((?:api[_-]?key|token|secret|password|bearer)\\s*[:=]\\s*)[^\\s,;]+/gi,'$1[redacted]'),send=(kind,facts={})=>{try{parent.postMessage({source:'knoux-generated-preview',token,kind,facts},parentOrigin)}catch{}};for(const level of ['error','warn']){const original=console[level].bind(console);console[level]=(...args)=>{send('console',{level,message:args.map(redact).join(' ').slice(0,1000)});original(...args)}}addEventListener('error',event=>{send(event.target&&event.target!==window?'resource':'error',{message:redact(event.message||event.target?.src||event.target?.href||'Resource failed')})},true);addEventListener('unhandledrejection',event=>send('error',{message:redact(event.reason||'Unhandled rejection')}));const inspect=()=>{const controls=[...document.querySelectorAll('button,a[href],input,select,textarea')],unnamed=controls.filter(element=>!(element.getAttribute('aria-label')||element.textContent?.trim()||element.labels?.length||element.getAttribute('title')||element.getAttribute('value'))).length,ids=[...document.querySelectorAll('[id]')].map(element=>element.id);return{title:document.title,lang:document.documentElement.lang||null,readyMs:Math.round(performance.now()),headings:document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,mainCount:document.querySelectorAll('main').length,controls:controls.length,unnamedControls:unnamed,imagesMissingAlt:document.querySelectorAll('img:not([alt])').length,duplicateIds:ids.length-new Set(ids).size}};addEventListener('DOMContentLoaded',()=>{send('ready',inspect());setTimeout(()=>send('accessibility',inspect()),0)},{once:true});addEventListener('pagehide',()=>send('pagehide',{}),{once:true});})();</script>`;

async function readStatic(relative) {
  const target = path.resolve(root, ...relative.split('/'));
  if (!safeRelative(target)) return null;
  const actual = await fs.realpath(target).catch(() => null);
  if (!actual || !safeRelative(actual)) return null;
  const handle = await fs.open(actual, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0)).catch(() => null);
  if (!handle) return null;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 64 * 1024 * 34) return null;
    let bytes = await handle.readFile();
    if (path.extname(actual).toLowerCase() === '.html') {
      const text = bytes.toString('utf8');
      bytes = Buffer.from(/<head(?:\s[^>]*)?>/i.test(text) ? text.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${probe}`) : `${probe}${text}`);
    }
    return { bytes, type: mime.get(path.extname(actual).toLowerCase()) ?? 'application/octet-stream' };
  } finally {
    await handle.close();
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const target = request.url ?? '/';
    if (target.includes('%') || target.includes('\\') || target.includes('\0')) {
      response.writeHead(400);
      response.end();
      return;
    }
    const url = new URL(target, 'http://127.0.0.1');
    if (!url.pathname.startsWith(prefix)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const raw = url.pathname.slice(prefix.length);
    if (raw.includes('%') || raw.includes('\\') || raw.includes('\0')) {
      response.writeHead(400);
      response.end();
      return;
    }
    const relative = raw === '' ? 'index.html' : raw;
    const artifact = await readStatic(relative).catch(() => null) ?? (!path.extname(relative) ? await readStatic('index.html').catch(() => null) : null);
    if (!artifact) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': artifact.type,
      'Content-Length': artifact.bytes.byteLength,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${parentOrigin}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    if (request.method === 'HEAD') response.end(); else response.end(artifact.bytes);
  } catch {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address === 'object') process.stdout.write(`KNOUX_PREVIEW_READY ${address.port}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
