import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { clientAddress,rateLimit } from '@/lib/http/rate-limit';
import { companionHash } from './companion-session';

// $0.25/M input, $1.50/M output: conservative 8000 input + 384 output reserve.
export const COMPANION_RESERVE_MICROUSD=3000;
const repeats=new Map<string,number>();
export async function reserveCompanionBudget(request: Request,session: string,fingerprint: string) {
  const now=Date.now(),identity=companionHash(session),key=`${identity}:${fingerprint}`;
  for(const [id,time] of repeats) if(now-time>60000) repeats.delete(id);
  if(repeats.size>=4096 || now-(repeats.get(key)??0)<30000) return false;
  if(!rateLimit('companion:global:minute',{max:30}).allowed || !rateLimit(`companion:session:${identity}`,{max:6}).allowed || !rateLimit(`companion:address:${companionHash(clientAddress(request.headers))}`,{max:12}).allowed) return false;
  let allowed=false;
  const previewOrigin=process.env.KNOUX_COMPANION_ORIGIN;
  if(process.env.KNOUX_COMPANION_LOCAL_PREVIEW==='true' && previewOrigin && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(previewOrigin)) {
    allowed=rateLimit('companion:local:daily',{max:200,windowMs:86400000,blockMs:86400000}).allowed && rateLimit(`companion:local:daily:${identity}`,{max:40,windowMs:86400000,blockMs:86400000}).allowed;
  } else if(process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const client=createClient(SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await client.rpc('reserve_companion_budget',{session_hash:identity,reserve_microusd:COMPANION_RESERVE_MICROUSD}).abortSignal(AbortSignal.timeout(3000));
    allowed=!result.error && result.data===true;
  }
  // Cloud deployment without the atomic budget prerequisite fails closed.
  if(allowed) repeats.set(key,now);
  return allowed;
}
