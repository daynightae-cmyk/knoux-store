import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const main = execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
const donorRoot='D:/Knoux Store-worktrees/local-bridge-registration';
const recoveryRoot='D:/Knoux Store Recovery/2026-10-02/restored/local-control-plane';
const read=name=>JSON.parse(fs.readFileSync(path.join(here,name),'utf8').replace(/^\uFEFF/,''));
const write=(name,value)=>fs.writeFileSync(path.join(here,name),JSON.stringify(value,null,2)+'\n');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
// Strict blob reader. `git show <ref>:<path>` is unsafe here: for a path that is absent
// at <ref> it can fall back to printing a COMMIT object instead of failing, which
// silently turns a missing file into a non-null hash and a bogus source comparison.
// The object type is checked first, so an absent path is always null.
const gitBytes=(ref,p)=>{try{const type=execFileSync('git',['cat-file','-t',ref+':'+p],{stdio:['ignore','pipe','ignore'],encoding:'utf8'}).trim();if(type!=='blob')return null;return execFileSync('git',['cat-file','blob',ref+':'+p],{stdio:['ignore','pipe','ignore'],maxBuffer:20*1024*1024});}catch{return null;}};
// Read once. An existsSync/statSync pre-check would be a check-then-read race, and it
// also resolves two different snapshots. Only the expected absence / not-a-regular-file
// outcomes become null; every other IO failure propagates instead of being swallowed.
// The absence test is a named multi-line condition: chained inline it reads as one
// expression and static analysis flags the nesting as ambiguous operator precedence.
const absentFileCodes = new Set(['ENOENT', 'EISDIR', 'ENOTDIR']);
const bytesAt = (p) => {
  try {
    return fs.readFileSync(p);
  } catch (error) {
    // Boolean(error) is load-bearing: typeof null === 'object', so without it the
    // `'code' in error` test would throw on a null reason instead of rethrowing it.
    const fileIsAbsent = Boolean(error)
      && typeof error === 'object'
      && 'code' in error
      && absentFileCodes.has(error.code);
    if (fileIsAbsent) return null;
    throw error;
  }
};
// Preserve case and whitespace inside SQL string literals. This is a conservative
// textual comparison, not a PostgreSQL semantic-equivalence parser.
const stripComments=s=>s.split(/('(?:''|[^'])*')/).map((x,i)=>i%2?x:x.replace(/--[^\n]*/g,'')).join('');
const norm=s=>stripComments(s??'').split(/('(?:''|[^'])*')/).map((x,i)=>i%2?x:x.replace(/\s+/g,' ').toLowerCase()).join('').trim();
const mainPaths=execFileSync('git',['ls-tree','-r','--name-only',main],{encoding:'utf8'}).trim().split('\n');
const sqlFiles=mainPaths.filter(p=>p.startsWith('supabase/migrations/')&&p.endsWith('.sql'));
const declarations=[];
const tables=new Map(), functions=new Map(), indexes=new Map(), policies=new Map(), triggers=new Map();
function balanced(s,start) {
 let depth=0,quoted=false;
 for(let i=start;i<s.length;i++){if(s[i]==="'"){if(quoted&&s[i+1]==="'"){i++;continue;}quoted=!quoted;}if(quoted)continue;if(s[i]==='(')depth++;if(s[i]===')'&&--depth===0)return i;}
 return -1;
}
function splitTop(s){let out=[],start=0,depth=0,quoted=false;for(let i=0;i<s.length;i++){if(s[i]==="'"){if(quoted&&s[i+1]==="'"){i++;continue;}quoted=!quoted;}if(quoted)continue;if(s[i]==='(')depth++;if(s[i]===')')depth--;if(s[i]===','&&depth===0){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out;}
for(const file of sqlFiles){
 const raw=gitBytes(main,file).toString('utf8'),s=stripComments(raw);
 const evidence={file,sha256:hash(Buffer.from(raw))};
 for(const m of s.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(public\.\w+)\s*\(/gi)){
  const start=m.index+m[0].length-1,end=balanced(s,start);
  const columns=splitTop(s.slice(start+1,end)).filter(x=>! /^(constraint|primary|unique|check|foreign)\b/i.test(x)).map(x=>{const a=x.match(/^"?(\w+)"?\s+(.+)$/s);return a?{name:a[1],declaration:a[2]}:null;}).filter(Boolean);
  tables.set(m[1],{...evidence,columns}); declarations.push({kind:'relation',identity:m[1],...evidence});
  for(const column of columns)declarations.push({kind:'column',identity:m[1]+'.'+column.name,columnDeclaration:column.declaration,...evidence});
 }
 for(const m of s.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(public\.\w+)\s*\(/gi)){
  const start=m.index+m[0].length-1,end=balanced(s,start),tail=s.slice(end+1),body=tail.match(/\bas\s+(\$\w*\$)([\s\S]*?)\1/i);
  if(!body)continue;
  const sig=s.slice(start+1,end),header=tail.slice(0,body.index);
  functions.set(m[1],{...evidence,signature:sig,body:body[2],header});
  declarations.push({kind:'function',identity:m[1],...evidence});
 }
 for(const m of s.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)\s+on\s+(public\.\w+)[^;]*;/gi)){indexes.set('public.'+m[1],{...evidence,statement:m[0]});declarations.push({kind:'index',identity:'public.'+m[1],...evidence});}
 for(const m of s.matchAll(/create\s+policy\s+("([^"]+)"|(\w+))\s+on\s+(public\.\w+)[^;]*;/gi)){const id=m[4]+'.'+(m[2]||m[3]);policies.set(id,{...evidence,statement:m[0]});declarations.push({kind:'policy',identity:id,...evidence});}
 for(const m of s.matchAll(/create\s+trigger\s+(\w+)[\s\S]*?\bon\s+(public\.\w+)[^;]*;/gi)){const id=m[2]+'.'+m[1];triggers.set(id,{...evidence,statement:m[0]});declarations.push({kind:'trigger',identity:id,...evidence});}
}
const catalog=read('live-structural-catalog.json');
const notes='Comparison is against exact origin/main tracked migrations. Name inventory is not semantic equality. No donor or withheld historical statement is canonical source. Managed objects are UNKNOWN unless secret-dependent. Source-only inventory contains declarations, not a replay-derived schema.';
for(const o of catalog.objects){
 let classification='UNKNOWN',reason='Catalog structure verified; no complete semantic source comparison',source=null;
 if(o.details.secret_dependent||o.details.default_withheld){classification='SECRET-DEPENDENT';reason='Definition/default withheld at database query boundary';}
 else if(o.identity.startsWith('public.')){
  if(o.kind==='relation'&&['r','p'].includes(o.details.kind)){source=tables.get(o.identity);if(!source){classification='LIVE ONLY';reason='No CREATE TABLE declaration in exact main migrations';}}
  if(o.kind==='column'){
   const id=o.identity.split('.').slice(0,2).join('.'),name=o.identity.split('.').at(-1),table=tables.get(id);
   source=table?.columns.find(c=>c.name===name);
   if(!table){classification='LIVE ONLY';reason='Parent table absent from exact main migration declarations';}
   else if(source){
    const decl=norm(source.declaration),type=decl.split(/\s+(?=not null|default |generated |primary key|references |unique|check )/)[0].trim().replace('timestamptz','timestamp with time zone').replace(/^int$/,'integer');
    const defaultMatch=source.declaration.match(/\bdefault\s+([\s\S]+?)(?=\s+(?:not null|primary key|references|check|unique)\b|$)/i);
    const expectedNull=/\bnot null\b|\bprimary key\b/i.test(source.declaration);
    const defaultEqual=norm(defaultMatch?.[1]??'')===norm(o.details.default??'');
    const expectedIdentity=/generated always as identity/i.test(source.declaration)?'a':/generated by default as identity/i.test(source.declaration)?'d':'';
    o.comparison={typeEqual:type===o.details.type,notNullEqual:expectedNull===o.details.not_null,defaultEqual,identityEqual:expectedIdentity===o.details.identity};
    source={...tables.get(id),columnDeclaration:source.declaration};delete source.columns;
    if(Object.values(o.comparison).every(Boolean)){classification='MATCHES SOURCE';reason='Column type, nullability and default equal after whitespace/type-alias normalization';}
    else if(!o.comparison.typeEqual){classification='DIVERGED';reason='Declared source type differs from catalog type; later ALTER statements require manual review';}
    else reason='Column attributes differ textually; ALTER/cast equivalence not proved';
   }
  }
  if(o.kind==='function'){
   source=functions.get('public.'+o.details.name);
   if(!source){classification='LIVE ONLY';reason='No CREATE FUNCTION declaration in exact main migrations';}
   else {
    const body=o.details.definition?.match(/\bas\s+(\$\w*\$)([\s\S]*?)\1/i)?.[2];
    const bodyEqual=norm(body)===norm(source.body),securityEqual=/security\s+definer/i.test(source.header)===o.details.security_definer;
    o.comparison={bodyEqual,securityEqual,sourceSignature:source.signature};
    if(!bodyEqual||!securityEqual){classification='DIVERGED';reason='Last source routine body or SECURITY DEFINER attribute differs from current catalog';}
    else reason='Body and security mode match; full signature/configuration/grant equivalence still unproved';
   }
  }
  if(['index','policy','trigger'].includes(o.kind)){
   source=({index:indexes,policy:policies,trigger:triggers})[o.kind].get(o.identity);
   if(!source){classification='UNKNOWN';reason='May be implicit/generated or absent from source; no semantic declaration proof';}
  }
 }
 o.classification=classification;o.comparisonReason=reason;
 if(o.kind==='function')for(const grant of o.details.grants??[]){grant.classification='UNKNOWN';grant.comparisonReason='Effective ACL verified in live catalog; full source grant/default-grant closure not proved';}
 if(source)o.sourceEvidence=source;
}
const identities=new Set(catalog.objects.map(o=>o.kind+':'+(o.kind==='function'?o.details.schema+'.'+o.details.name:o.identity)));
catalog.sourceOnly=[...new Map(declarations.map(d=>[d.kind+':'+d.identity,d])).values()].filter(d=>!identities.has(d.kind+':'+d.identity)).map(d=>({...d,classification:'SOURCE ONLY',comparisonReason:'Declaration name absent from live catalog; migration replay not performed'}));
catalog.comparison={main,notes,sourceFiles:sqlFiles.map(file=>({file,sha256:hash(gitBytes(main,file))})),counts:catalog.objects.reduce((a,o)=>(a[o.classification]=(a[o.classification]||0)+1,a),{}),sourceOnlyCount:catalog.sourceOnly.length};
write('live-structural-catalog.json',catalog);
const archived=read('live-edge-functions.json'),live=read('current-edge-functions.json'),donor=read('bridge-donor-source.json');
const bridgePaths=new Set([...mainPaths.filter(p=>p.startsWith('bridge/')), ...donor.files.map(f=>f.path).filter(p=>!p.endsWith('.sql')&&!p.startsWith('supabase/functions/')), ...JSON.parse(fs.readFileSync(path.join(recoveryRoot,'PROVENANCE.json'))).files.filter(p=>!p.endsWith('.sql')&&p!=='.env.example')]);
// canonicalExecutionRole answers a different question than classification: which
// executable artifact the RUNNING Bridge path actually loads. Source equality proves
// none of that, so this stays UNVERIFIED for every component until deployment or
// process attestation exists. It is deliberately not inferred from a hash match.
const unverifiedRole='No deployment attestation: which executable artifact the running Bridge path loads is not attested. Source equality does not prove runtime identity.';
const components=[];
for(const p of [...bridgePaths].sort()){
 const mb=gitBytes(main,p),db=bytesAt(path.join(donorRoot,p)),ab=bytesAt(path.join(recoveryRoot,p));
 const mainHash=mb?hash(mb):null,donorHash=db?hash(db):null,archiveHash=ab?hash(ab):null;
 const mainDonor=mainHash&&donorHash?mainHash===donorHash?'MATCH':'DIVERGED':'UNKNOWN';
 components.push({path:p,mainSha256:mainHash,dirtyDonorSha256:donorHash,archivedRecoverySha256:archiveHash,liveDeployedSha256:null,classification:'UNKNOWN',canonicalExecutionRole:'UNVERIFIED',comparison:mainDonor,reason:'Recovery provenance identifies a source commit, not a deployment. Running local worker/gateway artifact identity not attested; no temporal ordering inferred from mtime.'});
}
for(const f of live.functions){const af=archived.functions.find(x=>x.slug===f.slug);for(const file of f.files){const p='supabase/functions/'+f.slug+'/'+file.name,mb=gitBytes(main,p),db=bytesAt(path.join(donorRoot,p)),ab=af?.files.find(x=>x.name===file.name);const lh=hash(Buffer.from(file.content)),ah=ab?hash(Buffer.from(ab.content)):null,dh=db?hash(db):null;
 components.push({path:p,mainSha256:mb?hash(mb):null,dirtyDonorSha256:dh,archivedDeployedSourceSha256:ah,liveDeployedSha256:lh,liveVersion:f.version,archivedVersion:af?.version,archivedBundleSha256:af?.ezbr_sha256,liveBundleSha256:f.ezbr_sha256,classification:ah!==lh?'DIVERGED':dh&&dh!==lh?'DIVERGED':'MATCH',canonicalExecutionRole:'UNVERIFIED',canonicalExecutionReason:unverifiedRole,reason:dh&&dh!==lh?'Archive matches fresh live source; dirty donor differs; chronology unproved':'Fresh live source equals archived deployed source; main presence and donor availability recorded separately'});
}}
const canonicalRoles=components.reduce((a,c)=>(a[c.canonicalExecutionRole]=(a[c.canonicalExecutionRole]||0)+1,a),{});
write('bridge-reconciliation.json',{observedAt:live.observedAt,main,donorRoot,donorHead:execFileSync('git',['-C',donorRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),recoveryRoot,recoveryProvenance:JSON.parse(fs.readFileSync(path.join(recoveryRoot,'PROVENANCE.json'))),canonicalExecution:{counts:canonicalRoles,resolved:0,statement:'No Bridge component is classified VERIFIED CANONICAL for execution. Canonical vocabulary: VERIFIED CANONICAL, LIVE-ONLY, DONOR-ONLY, DIVERGED, SUPERSEDED, UNVERIFIED. Resolving any component to VERIFIED CANONICAL requires credential-free deployment or process attestation of the loaded artifact, not source equality.'},components,states:'MATCH is explicitly scoped to compared sources, never all four by implication. Missing deployment attestation means UNKNOWN. No LIVE NEWER / DONOR NEWER / MAIN NEWER inferred solely from difference. No implementation files imported.'});
const reviews=[];
const signalDecisions={
'acquire_foursquare_places.py':['BLOCKED','DuckDB remote mirror extraction and external parquet writes; remote dataset revision/license and staging consumer provenance unproved.'],
'acquire_opensanctions_targets.py':['BLOCKED','Streams targets and emits Person/Business aliases. Donor CC-BY claim and personal-data acceptance lack retained current approval evidence.'],
'acquire_overture_fsq_places.py':['BLOCKED','Remote joined parquet extraction, normalization and staging batches; unpinned dataset and dual-source attribution require proof.'],
'acquire_overture_places.py':['BLOCKED','STAC-selected release and remote S3 extraction. Per-record licence handling and exact pinned release need evidence.'],
'acquire_wikidata_phones.py':['BLOCKED','Country-scoped SPARQL excludes explicit Q5 humans, not all personal records; output-promotion validation unproved.'],
'consolidate_manifests.py':['REFERENCE ONLY','Builds local central Pydantic manifest from hard-coded dataset entries and counts. No database promotion call found; previous mutatingApi heuristic is withdrawn. Must not import historical measured claims as current evidence.'],
'extract_osm_business_phones.py':['BLOCKED','OSM extraction rewrites batches and unlinks prior output; attribution, name/brand filter and safe output-path validation need evidence before reuse.'],
'measure_corpus_metrics.py':['REFERENCE ONLY','Top-level local parquet scanning; hard-coded corpus paths. Counts apply only to those artifacts, not live database.'],
'parse_itu_numbering.py':['BLOCKED','Hard-coded country PDF page/table selections and deterministic range expansion; current source-PDF hashes and extraction accuracy not proved.'],
'prepare_telecom_metadata.py':['BLOCKED','Writes network/prefix payloads plus UI mapping from local manifests; uppercase MOBILE and provenance mapping compatibility need validation.'],
'query_placekey_mena.py':['REFERENCE ONLY','Network query and DuckDB extension installation execute at import time; exploratory counts only.'],
'signal_storage.py':['BLOCKED','Useful external-storage routing and free-space guard, but imports config mkdir side effects and hard-coded Windows default. No proven deployment integration or import-safety.'],
'test_hotosm.py':['REFERENCE ONLY','Exploratory HDX HTTP requests execute at import time; not a deterministic offline test.']
};
for(const ref of ['ff90282','848c0eb']){
 const full=execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim(),files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',ref],{encoding:'utf8'}).trim().split('\n');
 for(const p of files){
  const db=gitBytes(ref,p),mb=gitBytes(main,p);let decision='SUPERSEDED',reason='';
  if(ref==='ff90282'){
   if(p==='src/app/api/contact/route.ts'||p==='src/components/RequestForm.tsx'){decision='BLOCKED';reason='Unique durable Supabase contact intake/Stored UI semantics conflict with current guarded webhook-only contract. Live RPC exists, but source/grant parity and intended persistence are unproved; preserve current origin/size/rate guards.';}
   else if(p.endsWith('.sql')){decision='REFERENCE ONLY';reason='Historical foundation prototype: live same-version statement MD5 differs; current catalog is authority. Never apply or represent as recovered historical migration.';}
   else if(p.includes('database.types')){decision='REFERENCE ONLY';reason='Historical five-table generated types omit current Signal and bridge structures; stale type safety must not replace live catalog.';}
   else if(p.includes('build-content-seed')){decision='BLOCKED';reason='Literal-only TypeScript AST exporter generates local JSON and transactional seed SQL; old named exports/current collection compatibility and content_sync source parity unproved. Not run.';}
   else if(p.startsWith('references/')){decision='REFERENCE ONLY';reason='Historical closure/QA report is provenance context, not present-day live proof.';}
   else if(p.startsWith('src/components/auth/')||p.startsWith('src/app/')||p.startsWith('src/lib/auth/'))reason='Current source retains real Supabase credential/OAuth/recovery actions and newer redirect/capability/form contracts. Donor whole-file restoration would regress canonical behavior.';
   else if(p.startsWith('src/lib/supabase/')||p==='proxy.ts')reason='Current SSR adapter and proxy have current cookie/header handling and canonical naming. Donor five-table typing/config helpers are stale.';
   else if(p==='package.json'||p==='package-lock.json')reason='Current dependency graph includes later integrations; dependency work belongs to PR #30. No old lockfile import.';
   else if(p==='.env.example'||p==='.gitignore')reason='Historical configuration/ignore additions replaced by larger current canonical configuration; old whole-file replacement drops later entries.';
   else if(p==='src/components/SiteHeader.tsx'||p==='src/app/globals.css')reason='Later canonical navigation/auth integration and visual system supersede old header/styles; no visual donor transplant.';
   else if(p.startsWith('tests/'))reason='Current tests exercise hardened auth, redirects and contact guards; historical source-contract assertions target obsolete helpers/Stored intake.';
   else {decision='UNKNOWN';reason='No affirmative semantic port proof';}
  } else {
   const sd=signalDecisions[path.basename(p)];
   if(sd)[decision,reason]=sd;
   else if(p==='config/signal_sources.yaml'){decision='BLOCKED';reason='Enables new ingestion sources and declares approval/licensing including OpenSanctions; source-policy evidence not retained. Current configuration deliberately keeps several disabled.';}
   else if(p==='requirements-signal.txt'){decision='BLOCKED';reason='Adds osmium/PyMuPDF and broad DuckDB range; no compatible locked, audited ingestion toolchain proved.';}
   else if(p.includes('carrierPrefixes')){decision='BLOCKED';reason='Generated mapping lacks bundled raw manifest provenance and is not referenced by current instant-telecom source. Do not treat prefixes as verified identity or carrier evidence.';}
   else if(p.startsWith('src/lib/wordpress/')||p==='tests/wordpress-marketplace.test.mjs')reason='Raster-only intent is superseded by current toRenderableAssetUrl plus MIME/redirect/size checks in asset-policy and proxy tests. Donor filter/test adds no unique accepted behavior.';
   else if(p==='.gitignore')reason='Current ignore rules preserve later source/evidence structure. Broad /audit/ ignore would hide future evidence.';
   else {decision='UNKNOWN';reason='No affirmative semantic port proof';}
  }
  reviews.push({donor:full,path:p,donorSha256:db?hash(db):null,mainSha256:mb?hash(mb):null,mainPresence:mb?'PRESENT':'ABSENT',decision,reason,executed:false});
 }
}
write('donor-semantic-review.json',{main,scope:'Every changed file in each one-commit donor; no wholesale merge, acquisition/import, generated claims or runtime execution',reviews,counts:reviews.reduce((a,r)=>(a[r.donor]??={},a[r.donor][r.decision]=(a[r.donor][r.decision]||0)+1,a),{})});
const prod=read('production-audit.json'),full=read('full-tooling-audit.json');
write('dependency-audit-summary.json',{observedAt:new Date().toISOString(),main,lockfileSha256:hash(gitBytes(main,'package-lock.json')),owner:'PR #30',cli:'npm@10.9.4 audit read-only; host allow-scripts policy unchanged',productionAudit:prod.metadata.vulnerabilities,fullDevToolingAudit:full.metadata.vulnerabilities,openAdvisories:Object.entries(full.vulnerabilities).map(([name,v])=>({name,severity:v.severity,range:v.range,via:v.via,availableFix:v.fixAvailable})),availableFix:'npm proposes breaking Knip 6.39.0 and eslint-config-next 14.2.35 graph changes; no compatible full-graph resolution validated or applied',noFixAvailable:{advisory:'GHSA-vfj7-8cjw-p6xm',affected:'braces <=3.0.3',patchedVersion:null,source:'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',checkedAt:'2026-10-03',note:'GitHub advisory lists Patched versions: None; one underlying advisory yields six vulnerable graph nodes'},status:'BLOCKED'});
// Rebind the application summary to the catalog that is actually on disk. The earlier
// snapshotSha256 was computed over the pre-merge catalog and could not be reproduced from
// any surviving artifact, so it is not retained as a claim. The derivation below is
// reproducible by anyone re-running this script.
const summary=read('application-catalog-summary.json');
const catalogFingerprint=hash(Buffer.from(JSON.stringify(catalog.objects)));
delete summary.snapshotSha256;
write('application-catalog-summary.json',{...summary,main,catalogObjects:catalog.objects.length,catalogObjectsSha256:catalogFingerprint,derivation:'sha256 over JSON.stringify(live-structural-catalog.json .objects) as written by reconcile-phase-a.mjs',fingerprintNote:'Replaces an earlier snapshotSha256 that was computed over the pre-merge 4,316-object catalog and could not be reproduced from any surviving artifact. Per-object claims below are re-asserted against the current catalog by assert-phase-a-evidence.mjs.'});
console.log(JSON.stringify({catalogObjects:catalog.objects.length,catalog:catalog.comparison.counts,sourceOnly:catalog.sourceOnly.length,bridgeComponents:components.length,canonicalExecution:canonicalRoles,donorDecisions:reviews.length,counts:read('donor-semantic-review.json').counts,production:prod.metadata.vulnerabilities,full:full.metadata.vulnerabilities}));
