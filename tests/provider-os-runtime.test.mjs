import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const {environmentContext,scopedRuntime}=await import('../src/lib/ai/provider-os/request-runtime.ts');
const {withProviderRuntime,providerEnvironment,providerModelAllowed}=await import('../src/lib/ai/provider-os/runtime-context.ts');
const {getAdapters,getRegisteredAdapters,setDiscoveryCache,getDiscoveryCache,updateHealth,getHealth}=await import('../src/lib/ai/registry.ts');
const {recordUsage,getUsageRecords}=await import('../src/lib/ai/usage.ts');
const {EMPTY_CONNECTION,defaultPermissions,routingEligibility}=await import('../src/lib/ai/provider-os/policy.ts');
const {endpointSyntax,isPublicAddress,safeEndpointFetch}=await import('../src/lib/ai/provider-os/endpoint.ts');
const {measuredUsage,openRouterUsage}=await import('../src/lib/ai/provider-os/usage-projection.ts');
const {inventoryProjection}=await import('../src/lib/ai/provider-os/inventory-projection.ts');
const {ProviderService}=await import('../src/lib/ai/provider-os/service.ts');
const owner='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const now=new Date().toISOString();
const model={providerId:'groq',modelId:'measured-model',displayName:'Contract fixture',modalities:{text:true},lifecycle:'active',source:'LIVE'};
const profile={id,ownerId:owner,workspaceId:owner,providerId:'groq',name:'Contract fixture',enabled:true,active:true,auth:{mode:'ENV_REFERENCE',variable:'GROQ_API_KEY'},permissions:defaultPermissions(),cli:null,bindings:{mcp:[],plugins:[],skills:[]},routing:{automatic:true,modelAllowlist:[],monthlySpendLimit:null},connection:{...EMPTY_CONNECTION,configuration:'CONFIGURED',auth:'AUTHENTICATED',discovery:'DISCOVERY_VERIFIED'},models:[model],discoveredAt:now,version:1,createdAt:now,updatedAt:now};
const repository={ownerId:owner,workspaceId:owner,credentialRow:async()=>null,profile:async requested=>requested===id?profile:null,profiles:async()=>[profile],command:async()=>{throw new Error('Unexpected persistence call');}};
test('canonical runtime evidence persists measured facts but refuses stale revisions and untested defaults',async()=>{
  const {persistRuntimeEvidence}=await import('../src/lib/ai/provider-os/runtime-evidence.ts');
  const context=environmentContext({GROQ_API_KEY:'TEST_ONLY_EVIDENCE'});
  context.namespace=`${owner}:${owner}`;context.profileIds.set('groq',id);context.profileRevisions.set('groq',`${id}:1:evidence-test`);
  const commands=[];let current={...profile,connection:{...EMPTY_CONNECTION}};
  const factory=(boundOwner,boundWorkspace)=>{assert.equal(boundOwner,owner);assert.equal(boundWorkspace,owner);return {...repository,profile:async()=>current,command:async(action,payload)=>commands.push({action,payload})};};
  await withProviderRuntime(context,async()=>{
    assert.equal(await persistRuntimeEvidence(factory),'AVAILABLE');assert.equal(commands.length,0);
    updateHealth('groq',{auth:'AUTHENTICATED',discovery:'DISCOVERY_VERIFIED',generation:'GENERATION_VERIFIED'});
    assert.equal(await persistRuntimeEvidence(factory),'AVAILABLE');assert.equal(commands.length,1);
    assert.equal(commands[0].action,'CONNECTION_UPDATED');assert.equal(commands[0].payload.version,1);
    assert.equal(commands[0].payload.profile.connection.runtime,'GENERATION_VERIFIED');assert.equal(commands[0].payload.profile.connection.health,'HEALTHY');
    current={...current,version:2};assert.equal(await persistRuntimeEvidence(factory),'AVAILABLE');assert.equal(commands.length,1);
    current={...current,version:1};assert.equal(await persistRuntimeEvidence(()=>({...repository,profile:async()=>{throw new Error('storage unavailable');}})),'UNAVAILABLE');
  });
  assert.equal(await persistRuntimeEvidence(factory),'NOT_SELECTED');
});
test('simultaneous canonical contexts isolate credentials, discovery, health and usage across owners and revisions',async()=>{
  const make=namespace=>{const context=environmentContext({GROQ_API_KEY:`TEST_ONLY_${namespace}`});context.namespace=namespace;context.profileIds.set('groq',id);context.profileRevisions.set('groq','revision-1');context.seedModels.set('groq',{models:[model],discoveredAt:now});return context;};
  const a=make('owner-a'),b=make('owner-b');
  await Promise.all([a,b].map(context=>withProviderRuntime(context,async()=>{
    await Promise.resolve();assert.equal(providerEnvironment().GROQ_API_KEY,`TEST_ONLY_${context.namespace}`);
    setDiscoveryCache('groq',[{...model,displayName:context.namespace}],'LIVE');updateHealth('groq',{auth:context===a?'AUTHENTICATED':'FAILED'});
    recordUsage({providerId:'groq',modelId:model.modelId,operation:'generate',taskClass:null,inputTokens:null,outputTokens:null,cachedTokens:null,latencyMs:1,ttftMs:null,estimatedCost:null,success:true,errorCategory:null,fallbackCount:0});
    await Promise.resolve();assert.equal(getDiscoveryCache('groq').models[0].displayName,context.namespace);assert.equal(getUsageRecords().length,1);assert.equal(getUsageRecords()[0].profileId,id);
    assert.equal(getHealth('groq').auth,context===a?'AUTHENTICATED':'FAILED');
  })));
  a.profileRevisions.set('groq','revision-2');a.seedModels.clear();
  withProviderRuntime(a,()=>{assert.equal(getDiscoveryCache('groq'),null);assert.notEqual(getHealth('groq').auth,'AUTHENTICATED');assert.equal(getUsageRecords().length,1);});
});
test('scoped disabled, inactive, unverified, agent and limited profiles cannot borrow environment credentials',async()=>{
  const env={GROQ_API_KEY:'TEST_ONLY_OPERATOR',OPENAI_API_KEY:'TEST_ONLY_OTHER'};
  for(const variation of [{enabled:false},{active:false},{connection:EMPTY_CONNECTION},{routing:{...profile.routing,monthlySpendLimit:5}}]){
    const context=await scopedRuntime(repository,[{...profile,...variation}],true,env);
    withProviderRuntime(context,()=>assert.equal(getAdapters().some(adapter=>adapter.id==='groq'),false));
  }
  const unprivileged=await scopedRuntime(repository,[profile],false,env);
  withProviderRuntime(unprivileged,()=>{assert.equal(getAdapters().length,0);assert.equal(providerEnvironment().GROQ_API_KEY,undefined);assert.equal(providerEnvironment().OPENAI_API_KEY,undefined);});
  const legacy=await scopedRuntime(repository,[],true,env);
  withProviderRuntime(legacy,()=>assert.equal(getAdapters().length,getRegisteredAdapters().length));
  assert.equal(env.GROQ_API_KEY,'TEST_ONLY_OPERATOR');
});
test('profile model selection refuses cross-profile identities and catalog-only models',async()=>{
  const context=await scopedRuntime(repository,[profile],true,{GROQ_API_KEY:'TEST_ONLY_KEY'});
  withProviderRuntime(context,()=>{assert.equal(providerModelAllowed('groq','measured-model'),true);assert.equal(providerModelAllowed('groq','another-owner-model'),false);});
  context.seedModels.get('groq').models.push({...model,modelId:'embedding',modalities:{text:false}});
  context.modelAllowlists.set('groq',['embedding']);
  withProviderRuntime(context,()=>{assert.equal(providerModelAllowed('groq','embedding'),false);assert.equal(providerModelAllowed('groq','measured-model'),false);});
  assert.equal(routingEligibility({...profile,routing:{...profile.routing,monthlySpendLimit:1}},true).eligible,false);
});
test('endpoint transport rejects credential-bearing URLs, schemes, private DNS names and unauthorized local targets',async()=>{
  for(const value of ['https://user:secret@example.com/v1','https://example.com/v1?token=secret','ftp://example.com/v1','http://10.0.0.1/v1','https://foo.local/v1'])assert.ok(endpointSyntax(value));
  assert.equal(endpointSyntax('https://api.example.com/v1'),null);assert.equal(endpointSyntax('http://127.0.0.1:11434/v1',true),null);
  for(const address of ['127.0.0.1','10.0.0.1','172.16.1.1','192.168.1.1','169.254.1.1','100.64.1.1','::1','fc00::1','::ffff:127.0.0.1'])assert.equal(isPublicAddress(address),false);
  await assert.rejects(safeEndpointFetch('ftp://localhost/v1',{},{}),/Unsafe/);
  await assert.rejects(safeEndpointFetch('https://api.example.com/v1',{},{}),/not allowed/);
  await assert.rejects(safeEndpointFetch('http://localhost:11434/v1',{}, {VERCEL_ENV:'preview'}),/Hosted servers/);
});
test('reported usage projects only measured numeric fields, preserves unknown and separates estimated KNOuX costs',()=>{
  const reported=openRouterUsage({data:{label:'TEST_ONLY_SECRET',usage:2,limit:10,limit_remaining:8,limit_reset:'monthly',creator_user_id:'PRIVATE',rate_limit:{requests:1000}}},now);
  assert.equal(reported.usage.cost,2);assert.equal(reported.usage.requests,null);assert.equal(reported.limits[0].percentRemaining,80);assert.equal(reported.limits[0].resetAt,null);assert.equal(JSON.stringify(reported).includes('TEST_ONLY_SECRET'),false);assert.equal(JSON.stringify(reported).includes('PRIVATE'),false);
  assert.equal(openRouterUsage({data:{usage:NaN,limit:-1,limit_remaining:null}},now).usage.cost,null);
  assert.equal(measuredUsage([]).requests,null);
  const records=[{timestamp:now,inputTokens:1,outputTokens:2,estimatedCost:{amount:.01,basis:'ESTIMATED'},success:true,fallbackCount:0,latencyMs:10,ttftMs:null}];
  assert.equal(measuredUsage(records).costBasis,'ESTIMATED');assert.equal(measuredUsage([...records,{...records[0],estimatedCost:null}]).cost,null);
});
test('bridge metadata projection cannot smuggle tokens, claim authentication or widen execution permissions',()=>{
  const projection=inventoryProjection({agents:[{id:'agent:codex',name:'Codex',binary:'C:/trusted/codex.exe',source:'CUSTOM',version:'1.2.3',measuredAt:now,detected:true,authenticated:'AUTHENTICATED',executable:true,token:'TEST_ONLY_SECRET',capabilities:[{id:'PUSH',allowed:'ALLOW',supported:'VERIFIED',currentlyAvailable:true}]}],inventory:[{id:'mcp:local',name:'Local',kind:'MCP',source:'PROJECT',state:'UNTESTED',measuredAt:now,environmentNames:['API_KEY','BAD=VALUE'],env:{API_KEY:'TEST_ONLY_SECRET'}}]});
  assert.equal(projection.agents[0].authenticated,'UNTESTED');assert.equal(projection.agents[0].executable,false);assert.ok(projection.agents[0].capabilities.every(cap=>cap.allowed==='DENY'&&!cap.currentlyAvailable));assert.deepEqual(projection.inventory[0].environmentNames,['API_KEY']);assert.equal(JSON.stringify(projection).includes('TEST_ONLY_SECRET'),false);
});
test('server commands reject ownership changes, self-escalation and billable tests without explicit acknowledgement',async()=>{
  const service=new ProviderService(repository,false,{});
  await assert.rejects(service.command({action:'PROFILE_UPDATE',id,version:1,patch:{ownerId:'another-owner'}}),/unsupported fields/);
  await assert.rejects(service.command({action:'PROFILE_UPDATE',id,version:1,patch:{permissions:{PUSH:'ALLOW'}}}),/coding agents only/);
  await assert.rejects(service.command({action:'RUN_LIVE_GENERATION_TEST',id,version:1}),/acknowledgement/);
  await assert.rejects(service.command({action:'PROFILE_UPDATE',id,version:0,patch:{enabled:false}}),/version/);
  await assert.rejects(service.command({action:'PROFILE_UPDATE',id:'33333333-3333-4333-8333-333333333333',version:1,patch:{enabled:false}}),/ownership/);
});
test('coding-agent policy is bounded by the server ceiling and CLI/binding edits require observed inventory identities',async()=>{
  const agentProfile={...profile,providerId:'agent:codex',auth:{mode:'CLI_PROFILE',profileName:'contract'},models:[]};
  const commands=[];
  const owned={...repository,profile:async()=>agentProfile,command:async(action,payload)=>commands.push({action,payload})};
  const inventory=async()=>({agents:[{id:'agent:codex',name:'Contract fixture',binary:'C:/approved/codex.exe',source:'CUSTOM'}],inventory:[{id:'mcp:observed',kind:'MCP'}],blocker:null});
  const policy={...defaultPermissions(),PUSH:'ALLOW'};
  const unprivileged=new ProviderService(owned,false,{},inventory);
  await assert.rejects(unprivileged.command({action:'PROFILE_UPDATE',id,version:1,patch:{permissions:policy}}),/ceiling/);
  const operator=new ProviderService(owned,true,{KNOUX_AGENT_PERMISSION_CEILING:JSON.stringify({PUSH:'ASK'})},inventory);
  await assert.rejects(operator.command({action:'PROFILE_UPDATE',id,version:1,patch:{permissions:policy}}),/ceiling/);
  await operator.command({action:'PROFILE_UPDATE',id,version:1,patch:{permissions:{...policy,PUSH:'ASK'}}});
  assert.equal(commands[0].payload.profile.permissions.PUSH,'ASK');
  await assert.rejects(operator.command({action:'PROFILE_UPDATE',id,version:1,patch:{bindings:{mcp:[{id:'mcp:not-installed',enabled:true}],plugins:[],skills:[]}}}),/not installed/);
  await assert.rejects(operator.command({action:'PROFILE_UPDATE',id,version:1,patch:{cli:{source:'CUSTOM',binaryReference:'C:/unapproved.exe',arguments:{},role:'PRIMARY',autoSwitch:false}}}),/verified by the trusted bridge/);
  await assert.rejects(operator.command({action:'PROFILE_UPDATE',id,version:1,patch:{cli:{source:'CUSTOM',binaryReference:'C:/approved/codex.exe',arguments:{model:null,profile:null,workingDirectoryReference:'C:/Windows'},role:'PRIMARY',autoSwitch:false}}}),/arbitrary host paths/);
});
test('canonical catalog preserves non-Build identities and public gateway catalogs cannot prove authentication',async()=>{
  const adapters=getRegisteredAdapters();
  const openai=adapters.find(adapter=>adapter.id==='openai');
  const models=openai.parseModelList({data:[{id:'gpt-4o'},{id:'text-embedding-3-small'},{id:'whisper-1'},{id:'gpt-image-1'}]});
  assert.equal(models.length,4);assert.deepEqual(models.map(model=>model.modalities.text),[true,false,false,false]);assert.equal(models[0].contextWindow,null);assert.equal(models[0].capabilities.tools,'UNKNOWN');
  const mistral=adapters.find(adapter=>adapter.id==='mistral').parseModelList({data:[{id:'chat',capabilities:{completion_chat:true,function_calling:false}},{id:'embedding',capabilities:{completion_chat:false,embedding:true}}]});
  assert.equal(mistral.length,2);assert.equal(mistral[0].capabilities.tools,'UNSUPPORTED');assert.equal(mistral[1].modalities.text,false);
  const router=adapters.find(adapter=>adapter.id==='openrouter');
  const list=router.parseModelList({data:[{id:'contract/paid:free',architecture:{input_modalities:['text'],output_modalities:['text']},pricing:{prompt:'0.1',completion:'0.2'},supported_parameters:[]},{id:'contract/free',architecture:{input_modalities:['text'],output_modalities:['text']},pricing:{prompt:'0',completion:'0'}},{id:'contract/unknown',pricing:{prompt:'NaN',completion:'-1'}}]});
  assert.equal(list[0].catalog.free,false);assert.equal(list[0].capabilities.tools,'UNSUPPORTED');assert.equal(list[1].catalog.free,true);assert.equal(list[1].capabilities.tools,'UNKNOWN');assert.equal(list[2].catalog.free,null);assert.equal(list[2].pricing.inputPerMillion,null);
  const original=globalThis.fetch,paths=[];
  globalThis.fetch=async input=>{paths.push(new URL(input).pathname);return new Response(JSON.stringify({error:{message:'Invalid credential'}}),{status:401});};
  try{for(const [adapter,key]of [[router,'OPENROUTER_API_KEY'],[adapters.find(adapter=>adapter.id==='grok'),'GROK_OPENROUTER_API_KEY']])assert.equal((await adapter.probe({[key]:'TEST_ONLY_KEY'})).authenticated,false);assert.deepEqual(paths,['/api/v1/key','/api/v1/key']);}finally{globalThis.fetch=original;}
});
