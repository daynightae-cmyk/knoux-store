import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();

// Replace only I/O clients. The shipped handlers, guard, RBAC and validators execute.
const stub=code=>'data:text/javascript,'+encodeURIComponent(code);
registerHooks({resolve(specifier,context,nextResolve){
  if (specifier==='@/lib/supabase/server') return {url:stub('export async function createClient(){return globalThis.__growthAuthClient}'),shortCircuit:true};
  if (specifier==='../supabase/admin' || specifier==='@/lib/supabase/admin') return {url:stub('export function createAdminClient(){return globalThis.__growthAdminClient}'),shortCircuit:true};
  return nextResolve(specifier,context);
}});
const creative=await import('../src/app/api/growth/creatives/route.ts');
const campaign=await import('../src/app/api/growth/campaigns/route.ts');
const media=await import('../src/app/api/growth/media/route.ts');
const id='11111111-1111-4111-8111-111111111111';
const input={id,clientId:'a',expectedUpdatedAt:'2026-10-16T00:00:00Z',name:'Draft',objective:'LEADS',budgetMinor:1000,startDate:'2026-10-16',endDate:'2026-10-31',platforms:['instagram']};
let rpcCalls=[];
function auth(role='OWNER',expired=false){
  rpcCalls=[];
  globalThis.__growthAuthClient={auth:{getUser:async()=>expired?{data:{user:null},error:{message:'JWT expired'}}:{data:{user:{id}},error:null}},from:()=>({select:()=>({eq:async()=>({data:[{client_id:'a',role}],error:null})})})};
  globalThis.__growthAdminClient={rpc:async(name,args)=>{rpcCalls.push({name,args});return {data:{id,updated_at:'2026-10-16T01:00:00Z'},error:null};}};
}
const request=(body,origin='https://example.test')=>new Request('https://example.test/api/growth/creatives',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});

test('expired sessions cannot save creative or campaign drafts',async()=>{
  auth('OWNER',true);
  assert.equal((await creative.POST(request(input))).status,401);
  assert.equal((await campaign.POST(request(input))).status,401);
  assert.equal(rpcCalls.length,0);
});
test('real RBAC blocks missing edit permission before privileged persistence',async()=>{
  auth('VIEWER');
  assert.equal((await creative.POST(request(input))).status,403);
  assert.equal((await campaign.POST(request(input))).status,403);
  assert.equal(rpcCalls.length,0);
});
test('authorized creative update passes actor, tenant and expected revision to transaction',async()=>{
  auth();
  const response=await creative.POST(request({...input,headline:'Saved'}));
  assert.equal(response.status,200); assert.equal(rpcCalls.length,1);
  assert.equal(rpcCalls[0].args.p_actor,id); assert.equal(rpcCalls[0].args.p_client,'a');
  assert.equal(rpcCalls[0].args.p_expected,input.expectedUpdatedAt);
  assert.equal(rpcCalls[0].args.p_input.headline,'Saved');
});
test('untrusted status, missing revision, foreign origin and invalid platforms are refused',async()=>{
  auth();
  assert.equal((await creative.POST(request({...input,status:'APPROVED'}))).status,403);
  assert.equal((await creative.POST(request({...input,expectedUpdatedAt:undefined}))).status,409);
  assert.equal((await creative.POST(request(input,'https://foreign.test'))).status,403);
  assert.equal((await campaign.POST(request({...input,platforms:['invalid']}))).status,400);
  assert.equal(rpcCalls.length,0);
});
test('transaction conflicts surface as 409 and missing deployment fails closed',async()=>{
  auth();
  globalThis.__growthAdminClient.rpc=async()=>({data:null,error:{code:'40001'}});
  assert.equal((await creative.POST(request(input))).status,409);
  globalThis.__growthAdminClient.rpc=async()=>({data:null,error:{code:'PGRST202'}});
  assert.equal((await campaign.POST(request(input))).status,503);
});


test('media handler rejects foreign clients and MIME spoofing before storage',async()=>{
  auth();
  const upload=(client,bytes)=>{const form=new FormData();form.set('clientId',client);form.set('file',new File([bytes],'hero.png',{type:'image/png'}));return new Request('https://example.test/api/growth/media',{method:'POST',headers:{origin:'https://example.test'},body:form});};
  assert.equal((await media.POST(upload('b',new Uint8Array(24)))).status,403);
  assert.equal((await media.POST(upload('a',new Uint8Array(24)))).status,400);
});

test('media persistence failure removes the uploaded object and reports cleanup failure honestly',async()=>{
  auth();
  let removed=[]; let cleanupFailure=false; let rowFailure=true; let rowThrows=false;
  const bucket={upload:async()=>({error:null}),remove:async paths=>{removed.push(...paths);return {error:cleanupFailure?new Error('cleanup failed'):null};},createSignedUrl:async()=>({data:{signedUrl:'https://example.test/private/signed'},error:null})};
  globalThis.__growthAdminClient={storage:{from:()=>bucket},from:()=>({insert:async()=>{if(rowThrows)throw new Error('transport failure');return {error:rowFailure?new Error('database refused'):null};}})};
  const upload=()=>{const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0s8AAAAASUVORK5CYII=','base64'));const form=new FormData();form.set('clientId','a');form.set('file',new File([png],'hero.png',{type:'image/png'}));return new Request('https://example.test/api/growth/media',{method:'POST',headers:{origin:'https://example.test'},body:form});};
  let response=await media.POST(upload());assert.equal(response.status,503);assert.match((await response.json()).reason,/object removed/);assert.equal(removed.length,1);assert.ok(removed[0].startsWith('a/'));
  cleanupFailure=true;response=await media.POST(upload());assert.match((await response.json()).reason,/operator attention/);
  cleanupFailure=false;rowThrows=true;response=await media.POST(upload());assert.equal(response.status,503);assert.equal(removed.length,3);
  rowThrows=false;rowFailure=false;response=await media.POST(upload());assert.equal(response.status,200);const asset=(await response.json()).asset;assert.ok(asset.id);assert.equal(asset.kind,'IMAGE');assert.equal(removed.length,3);
});
