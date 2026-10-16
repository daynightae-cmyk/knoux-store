import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { loadTypeScript } from './load.mjs';
const {companionCatalog}=await loadTypeScript('../src/lib/sentinel/companion-catalog.ts');
const {parseCompanionRequest,safeCompanionText}=await loadTypeScript('../src/lib/sentinel/companion-contract.ts');
const {newCompanionSession,readCompanionSession,companionHash}=await loadTypeScript('../src/lib/sentinel/companion-session.ts');
const {POST:sessionPost}=await loadTypeScript('../src/app/api/sentinel/session/route.ts');
const {POST:replyPost}=await loadTypeScript('../src/app/api/sentinel/reply/route.ts');
const {reserveCompanionBudget}=await loadTypeScript('../src/lib/sentinel/companion-budget.ts');
const {resetRateLimits}=await loadTypeScript('../src/lib/http/rate-limit.ts');
const {companionKnowledge}=await loadTypeScript('../src/lib/sentinel/companion-knowledge.ts');
const base={id:'11111111-1111-4111-8111-111111111111',language:'en',context:{route:'/engineering',target:companionCatalog.find(entry=>entry.route==='/engineering').id},question:'What does this page support?'};

test('companion schema admits only public metadata; never DOM/field values, destinations, providers or executable actions',()=>{
  assert.ok(parseCompanionRequest(base,companionCatalog));
  for(const value of [{...base,provider:'private'},{...base,question:'x'.repeat(601)},{...base,context:{...base.context,html:'private'}},{...base,context:{...base.context,target:'unknown'}},{...base,context:{...base.context,route:'/account/private'}},{...base,context:{...base.context,field:'password'}},{...base,context:{...base.context,section:'hidden-private'}}])assert.equal(parseCompanionRequest(value,companionCatalog),null);
  const contact=companionCatalog.find(entry=>entry.route==='/contact');
  assert.ok(parseCompanionRequest({...base,context:{route:'/contact',target:contact.id,field:'email'}},companionCatalog));
  assert.equal(parseCompanionRequest({...base,context:{route:'/contact',target:contact.id,field:'email',value:'private@example.org'}},companionCatalog),null);
  assert.doesNotMatch(safeCompanionText('https://evil.invalid javascript:alert(1)\u0000'),/https:|javascript:|\u0000/);
});

test('public knowledge preserves release-candidate prose and labels registry state separately from product maturity',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async()=>Response.json([]);
    const entry=companionCatalog.find(item=>item.route==='/products/knoux-clipboard-ai');
    assert.ok(entry);
    const knowledge=await companionKnowledge({...base,context:{route:entry.route,target:entry.id},question:'Clipboard AI release maturity'},new AbortController().signal);
    const fact=knowledge.facts.find(item=>item.id===entry.id);
    assert.match(fact.summary,/release candidate/i);assert.equal(fact.documentedReleaseStatus,'release-candidate');assert.equal(fact.catalogStatus,entry.status);assert.equal(Object.hasOwn(fact,'status'),false);
  }finally{globalThis.fetch=original;}
});

test('visitor session is signed, expires, cannot be forged and never authorizes private identity',()=>{
  const previous=process.env.KNOUX_COMPANION_SESSION_SECRET;process.env.KNOUX_COMPANION_SESSION_SECRET='test-only-session-secret';
  try{
    const token=newCompanionSession(),request=new Request('http://localhost:4554',{headers:{cookie:`knoux-companion=${token}`}});
    assert.match(readCompanionSession(request),/^[a-f0-9-]{36}$/);assert.equal(readCompanionSession(request,Date.now()+1801000),null);
    assert.equal(readCompanionSession(new Request('http://localhost:4554',{headers:{cookie:`knoux-companion=${token.slice(0,-1)}x`}})),null);
    assert.notEqual(companionHash('session'),companionHash('another-session'));
  }finally{if(previous===undefined)delete process.env.KNOUX_COMPANION_SESSION_SECRET;else process.env.KNOUX_COMPANION_SESSION_SECRET=previous;}
});

test('unconfigured AI fails honestly without calling a provider; cross-origin and unsigned requests are rejected',async()=>{
  const saved={...process.env};
  try{
    delete process.env.KNOUX_COMPANION_ENABLED;process.env.KNOUX_COMPANION_ORIGIN='http://localhost:4554';
    assert.equal(sessionPost(new Request('http://localhost:4554/api/sentinel/session',{method:'POST',headers:{origin:'https://evil.invalid'}})).status,403);
    assert.equal(sessionPost(new Request('http://localhost:4554/api/sentinel/session',{method:'POST',headers:{origin:'http://localhost:4554'}})).status,503);
    assert.equal((await replyPost(new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers:{origin:'http://localhost:4554'}}))).status,503);
    process.env.KNOUX_COMPANION_ENABLED='true';process.env.KNOUX_COMPANION_SESSION_SECRET='unit-test-secret';process.env.GEMINI_API_KEY='not-a-real-key';
    assert.equal((await replyPost(new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers:{origin:'http://localhost:4554'}}))).status,401);
    const cookie=`knoux-companion=${newCompanionSession()}`;
    assert.equal((await replyPost(new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers:{origin:'http://localhost:4554',cookie,'content-type':'application/json'},body:JSON.stringify({...base,privateTool:'shell'})}))).status,400);
  }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});

test('local budget deduplicates retries; cloud activation without shared atomic budget fails closed',async()=>{
  const saved={...process.env};resetRateLimits();
  try{
    process.env.KNOUX_COMPANION_SESSION_SECRET='unit-only';process.env.KNOUX_COMPANION_LOCAL_PREVIEW='true';process.env.KNOUX_COMPANION_ORIGIN='http://127.0.0.1:4554';
    const request=new Request('http://127.0.0.1:4554');assert.equal(await reserveCompanionBudget(request,'s1','fp'),true);assert.equal(await reserveCompanionBudget(request,'s1','fp'),false);
    delete process.env.KNOUX_COMPANION_LOCAL_PREVIEW;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(await reserveCompanionBudget(request,'s2','fp2'),false);
  }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);resetRateLimits();}
});

test('reviewed SQL budget atomically caps global/day and session/day; anon cannot spend or read it',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    await db.exec(readFileSync(new URL('../security/sentinel/companion-budget.sql',import.meta.url),'utf8'));
    await db.exec('set role anon');await assert.rejects(db.query('select public.reserve_companion_budget($1,3000)',['a'.repeat(64)]),/permission denied/);await assert.rejects(db.query('select * from public.companion_budget'),/permission denied/);await db.exec('reset role');
    const reserve=hash=>db.query('select public.reserve_companion_budget($1,3000) as accepted',[hash]);
    // Concurrent callers against the isolated PostgreSQL engine; PGlite queues
    // transactions, so this proves caps without claiming multi-host deployment.
    const simultaneous=await Promise.all(Array.from({length:60},()=>reserve('a'.repeat(64))));
    assert.equal(simultaneous.filter(result=>result.rows[0].accepted).length,40);
    assert.equal((await reserve('a'.repeat(64))).rows[0].accepted,false);
    // Refused session allocations conservatively retain global reservations.
    for(let index=0;index<139;index++)assert.equal((await reserve(index.toString(16).padStart(64,'0'))).rows[0].accepted,true);
    assert.equal((await reserve('f'.repeat(64))).rows[0].accepted,false);
    const totals=await db.query("select requests,reserved_microusd from public.companion_budget where bucket='global'");assert.equal(totals.rows[0].requests,200);assert.equal(Number(totals.rows[0].reserved_microusd),600000);
  }finally{await db.close();}
});

test('chunked bodies are bounded and stalled bodies cancel after the real timeout without inference',async()=>{
  const saved={...process.env};
  try{
    Object.assign(process.env,{KNOUX_COMPANION_ENABLED:'true',KNOUX_COMPANION_SESSION_SECRET:'unit-secret',GEMINI_API_KEY:'not-a-real-key',KNOUX_COMPANION_ORIGIN:'http://localhost:4554'});
    const headers={origin:'http://localhost:4554',cookie:`knoux-companion=${newCompanionSession()}`,'content-type':'application/json'};
    const oversized=new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers,body:'x'.repeat(4097)});assert.equal((await replyPost(oversized)).status,413);
    let cancelled=false;
    const stalled=new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers,duplex:'half',body:new ReadableStream({cancel(){cancelled=true;}})});
    assert.equal((await replyPost(stalled)).status,408);assert.equal(cancelled,true);
  }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});

test('provider network failure produces an honest SSE error, never fabricated answer text',async()=>{
  const saved={...process.env};resetRateLimits();
  try{
    Object.assign(process.env,{KNOUX_COMPANION_ENABLED:'true',KNOUX_COMPANION_LOCAL_PREVIEW:'true',KNOUX_COMPANION_SESSION_SECRET:'unit-network-secret',GEMINI_API_KEY:'not-a-real-key',KNOUX_COMPANION_ORIGIN:'http://localhost:4554'});
    const response=await replyPost(new Request('http://localhost:4554/api/sentinel/reply',{method:'POST',headers:{origin:'http://localhost:4554',cookie:`knoux-companion=${newCompanionSession()}`,'content-type':'application/json'},body:JSON.stringify(base)}));
    const body=await response.text();assert.equal(response.status,200);assert.match(body,/"type":"error"/);assert.doesNotMatch(body,/"type":"delta"|"type":"done"|not-a-real-key/);
  }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);resetRateLimits();}
});

test('non-sensitive companion controls still work when browser storage is blocked',async()=>{
  const saved={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
  Object.assign(globalThis,{window:new EventTarget(),document:{documentElement:{dataset:{}}},localStorage:{getItem(){throw new Error('Storage blocked');},setItem(){throw new Error('Storage blocked');}}});
  try{
    const preferences=await loadTypeScript('../src/components/identity/sentinel-preferences.ts');
    preferences.saveSentinelLanguage('ar');preferences.setSentinelQuiet(true);preferences.setSentinelOptions({tips:false});
    const snapshot=JSON.parse(preferences.sentinelPreferenceSnapshot());assert.equal(snapshot.language,'ar');assert.equal(snapshot.quiet,true);assert.equal(snapshot.tips,false);
  }finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
