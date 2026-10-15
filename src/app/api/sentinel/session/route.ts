import { companionReady,companionOrigin,companionCookie,newCompanionSession,readCompanionSession,sessionIssuanceAllowed } from '@/lib/sentinel/companion-session';
import { COMPANION_MODEL } from '@/lib/sentinel/companion-provider';
export const runtime='nodejs';
export function POST(request: Request) {
  if(!companionOrigin(request)) return Response.json({error:'ORIGIN_DENIED'},{status:403});
  if(!companionReady()) return Response.json({ready:false,error:'UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});
  const existing=readCompanionSession(request);
  if(!existing && !sessionIssuanceAllowed(request)) return Response.json({error:'RATE_LIMITED'},{status:429,headers:{'Retry-After':'60'}});
  const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(!existing) headers.set('Set-Cookie',`${companionCookie(request)}=${newCompanionSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return Response.json({ready:true,model:COMPANION_MODEL,retention:'Session only; questions are not stored by KNOuX.'},{headers});
}
