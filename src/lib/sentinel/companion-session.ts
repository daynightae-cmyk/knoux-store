import 'server-only';
import { createHmac,randomUUID,timingSafeEqual } from 'node:crypto';
import { clientAddress,rateLimit } from '@/lib/http/rate-limit';

export function companionReady(env: NodeJS.ProcessEnv=process.env) {return env.KNOUX_COMPANION_ENABLED==='true' && !!env.KNOUX_COMPANION_SESSION_SECRET && !!(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);}
export function companionOrigin(request: Request) {
  const url=new URL(request.url),expected=process.env.KNOUX_COMPANION_ORIGIN??url.origin;
  return request.headers.get('origin')===expected && !['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')??'') && !url.search;
}
export function companionCookie(request: Request) {return new URL(request.url).protocol==='https:'?'__Host-knoux-companion':'knoux-companion';}
function signature(value: string) {return createHmac('sha256',process.env.KNOUX_COMPANION_SESSION_SECRET??'').update(`knoux-companion-v1:${value}`).digest('base64url');}
export function newCompanionSession(now=Date.now()) {const value=`${randomUUID()}.${Math.floor(now/1000)+1800}`;return `${value}.${signature(value)}`;}
export function readCompanionSession(request: Request,now=Date.now()): string | null {
  const token=request.headers.get('cookie')?.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${companionCookie(request)}=`))?.split('=').slice(1).join('=');
  if(!token || token.length>180) return null;
  const parts=token.split('.');if(parts.length!==3 || !/^[a-f0-9-]{36}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1])) return null;
  const expiry=Number(parts[1])*1000;if(expiry<now || expiry>now+1800000) return null;
  const expected=Buffer.from(signature(`${parts[0]}.${parts[1]}`));const given=Buffer.from(parts[2]);
  return expected.length===given.length && timingSafeEqual(expected,given)?parts[0]:null;
}
export function companionHash(value: string) {return createHmac('sha256',process.env.KNOUX_COMPANION_SESSION_SECRET??'').update(value).digest('hex');}
export function sessionIssuanceAllowed(request: Request) {return rateLimit('companion:session:global',{max:40}).allowed && rateLimit(`companion:session:${companionHash(clientAddress(request.headers))}`,{max:6}).allowed;}
