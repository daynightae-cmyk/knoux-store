import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { ProviderSecretCipher } = await import('../src/lib/ai/provider-os/secret-cipher.ts');
const { EMPTY_CONNECTION, defaultPermissions } = await import('../src/lib/ai/provider-os/policy.ts');
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const credential='33333333-3333-4333-8333-333333333333';
const first='44444444-4444-4444-8444-444444444444';
const second='55555555-5555-4555-8555-555555555555';
function profile(id,credentialId=credential) {
  const now=new Date().toISOString();
  return {id,ownerId:owner,workspaceId:owner,providerId:'groq',name:id===first?'Personal':'Company',enabled:true,active:false,auth:{mode:'VAULT_SECRET',credentialId},permissions:defaultPermissions(),cli:null,bindings:{mcp:[],plugins:[],skills:[]},routing:{automatic:true,modelAllowlist:[],monthlySpendLimit:null},connection:EMPTY_CONNECTION,models:[],discoveredAt:null,version:1,createdAt:now,updatedAt:now};
}
test('provider envelope binds identity, randomizes ciphertext and rejects tampering without echoing the secret',()=>{
  const cipher=new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:randomBytes(32).toString('base64')});
  const scope={ownerId:owner,workspaceId:owner,credentialId:credential};
  const value='TEST_ONLY_PROVIDER_CREDENTIAL';
  const a=cipher.encrypt(value,scope),b=cipher.encrypt(value,scope);
  assert.notEqual(a.ciphertext,b.ciphertext);
  assert.equal(cipher.decrypt(a,scope),value);
  assert.equal(JSON.stringify(a).includes(value),false);
  for(const mismatch of [{...scope,ownerId:other},{...scope,workspaceId:other},{...scope,credentialId:first}]) assert.throws(()=>cipher.decrypt(a,mismatch),/decryption refused/);
  assert.throws(()=>cipher.decrypt({...a,tag:randomBytes(16).toString('base64')},scope),/decryption refused/);
  assert.throws(()=>cipher.decrypt({...a,algorithm:'PLAINTEXT'},scope),/decryption refused/);
  assert.throws(()=>new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:'not-a-key'}),/32-byte/);
  assert.equal(new ProviderSecretCipher({}).writable(),false);
  assert.throws(()=>new ProviderSecretCipher({}).encrypt(value,scope),/NOT CONFIGURED/);
});
test('server key rotation can decrypt old envelopes while all new writes use the active key',()=>{
  const oldKey=randomBytes(32).toString('base64'),newKey=randomBytes(32).toString('base64');
  const scope={ownerId:owner,workspaceId:owner,credentialId:credential};
  const old=new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:oldKey,KNOUX_PROVIDER_VAULT_KEY_ID:'old'});
  const next=new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:newKey,KNOUX_PROVIDER_VAULT_KEY_ID:'new',KNOUX_PROVIDER_VAULT_PREVIOUS_KEYS:JSON.stringify({old:oldKey})});
  assert.equal(next.decrypt(old.encrypt('TEST_ONLY_VALUE',scope),scope),'TEST_ONLY_VALUE');
  assert.equal(next.encrypt('TEST_ONLY_VALUE',scope).keyId,'new');
  assert.throws(()=>new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:newKey,KNOUX_PROVIDER_VAULT_KEY_ID:'new',KNOUX_PROVIDER_VAULT_PREVIOUS_KEYS:JSON.stringify({new:oldKey})}),/invalid/);
});
test('Provider OS SQL enforces tenancy, browser-role denial, atomic replacement and dependency lifecycle',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);grant usage on schema auth to authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261008234936_provider_operating_system.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values($1),($2)',[owner,other]);
  const command=async(action,payload={},workspace=owner,principal=owner)=> (await db.query('select public.knoux_provider_command($1,$2,$3,$4::jsonb) as result',[principal,workspace,action,JSON.stringify(payload)])).rows[0].result;
  const envelope=new ProviderSecretCipher({KNOUX_PROVIDER_VAULT_KEY:randomBytes(32).toString('base64')}).encrypt('TEST_ONLY_PERSISTED_VALUE',{ownerId:owner,workspaceId:owner,credentialId:credential});
  await db.exec('set role service_role');
  await command('ENSURE_WORKSPACE');
  await command('CREDENTIAL_CREATE',{id:credential,providerId:'groq',name:'Test vault',encryptedValue:envelope});
  await command('PROFILE_CREATE',{id:first,profile:profile(first)});
  await command('PROFILE_CREATE',{id:second,profile:profile(second)});
  await t.test('activation is one-per-provider and stale optimistic versions refuse writes',async()=>{
    const activated=await command('PROFILE_SWITCH',{id:first,version:1});assert.equal(activated.active,true);
    const switched=await command('PROFILE_SWITCH',{id:second,version:1});assert.equal(switched.active,true);
    const rows=(await db.query('select id,active,version from public.knoux_provider_profiles order by id')).rows;
    assert.deepEqual(rows.map(r=>r.active),[false,true]);
    await assert.rejects(command('PROFILE_UPDATE',{id:first,version:1,profile:profile(first)}),e=>e.code==='40001');
  });
  await t.test('shared dependencies block delete, owner/workspace mismatches cannot bind or read',async()=>{
    await assert.rejects(command('CREDENTIAL_DELETE',{id:credential,version:1}),e=>e.code==='23503');
    await assert.rejects(command('ENSURE_WORKSPACE',{},owner,other),e=>e.code==='42501');
    await command('ENSURE_WORKSPACE',{},other,other);
    await assert.rejects(command('PROFILE_CREATE',{id:'66666666-6666-4666-8666-666666666666',profile:{...profile(first),id:'66666666-6666-4666-8666-666666666666',ownerId:other,workspaceId:other}},other,other),e=>e.code==='23503');
  });
  await t.test('replacement atomically invalidates both dependent profiles; failed replacement leaves old state intact',async()=>{
    const current=(await db.query('select body from public.knoux_provider_profiles where id=$1',[first])).rows[0].body;
    await command('CONNECTION_UPDATED',{id:first,version:current.version,profile:{...current,connection:{...EMPTY_CONNECTION,configuration:'CONFIGURED',auth:'AUTHENTICATED',runtime:'GENERATION_VERIFIED'},models:[{modelId:'test-evidence'}]}});
    await assert.rejects(command('CREDENTIAL_REPLACE',{id:credential,version:1,encryptedValue:{algorithm:'PLAINTEXT'},resetConnection:EMPTY_CONNECTION}),e=>e.code==='23514');
    assert.equal((await db.query('select body from public.knoux_provider_profiles where id=$1',[first])).rows[0].body.connection.runtime,'GENERATION_VERIFIED');
    await command('CREDENTIAL_REPLACE',{id:credential,version:1,encryptedValue:envelope,resetConnection:EMPTY_CONNECTION});
    for(const row of (await db.query('select body from public.knoux_provider_profiles')).rows) {assert.equal(row.body.connection.auth,'UNTESTED');assert.deepEqual(row.body.models,[]);}
    assert.equal((await db.query('select revision from public.knoux_provider_credentials')).rows[0].revision,2);
    await assert.rejects(command('CREDENTIAL_ROTATE',{id:credential,version:1,encryptedValue:envelope,resetConnection:EMPTY_CONNECTION}),e=>e.code==='40001');
  });
  await t.test('authenticated owners see only their metadata and cannot elevate policies or retrieve ciphertext',async()=>{
    await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${other}',false)`);
    assert.equal((await db.query('select body from public.knoux_provider_profiles')).rows.length,0);
    await assert.rejects(db.query('select * from public.knoux_provider_credentials'),e=>e.code==='42501');
    await assert.rejects(db.query("update public.knoux_provider_profiles set body=body||'{\"permissions\":{\"PUSH\":\"ALLOW\"}}'::jsonb"),e=>e.code==='42501');
    await assert.rejects(command('CREDENTIAL_DELETE',{id:credential,version:2}),e=>e.code==='42501');
    await db.exec(`reset role;set role anon`);
    await assert.rejects(db.query('select * from public.knoux_provider_profiles'),e=>e.code==='42501');
    await assert.rejects(command('ENSURE_WORKSPACE'),e=>e.code==='42501');
    await db.exec('reset role;set role service_role');
  });
  await t.test('revocation wipes encrypted value; deleting profiles preserves credential until explicit unreferenced delete',async()=>{
    await command('CREDENTIAL_REVOKE',{id:credential,version:2,resetConnection:EMPTY_CONNECTION});
    const revoked=(await db.query('select configured,encrypted_value from public.knoux_provider_credentials')).rows[0];
    assert.equal(revoked.configured,false);assert.equal(revoked.encrypted_value,null);
    for(const row of (await db.query('select id,version from public.knoux_provider_profiles')).rows) await command('PROFILE_DELETE',{id:row.id,version:row.version});
    assert.equal((await db.query('select id from public.knoux_provider_credentials')).rows.length,1);
    await command('CREDENTIAL_DELETE',{id:credential,version:3});
    assert.equal((await db.query('select id from public.knoux_provider_credentials')).rows.length,0);
    const audit=(await db.query('select * from public.knoux_provider_audit')).rows;
    assert.ok(audit.some(row=>row.event==='CREDENTIAL_REPLACED'));
    assert.ok(audit.some(row=>row.event==='CREDENTIAL_REVOKED'));
    assert.equal(JSON.stringify(audit).includes('TEST_ONLY_PERSISTED_VALUE'),false);
    assert.equal(JSON.stringify(audit).includes(envelope.ciphertext),false);
  });
});
