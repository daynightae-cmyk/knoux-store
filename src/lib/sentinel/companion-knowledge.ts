import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY } from '@/lib/supabase/config';
import { companionCatalog } from './companion-catalog';
import { entryForPage,findGuideEntries } from './guide';
import { companionFields,type CompanionRequest } from './companion-contract';
import { softwareProducts } from '@/data/software';

export async function companionKnowledge(input: CompanionRequest,signal: AbortSignal) {
  const target=companionCatalog.find(entry=>entry.id===input.context.target)!;
  const page=entryForPage(companionCatalog,input.context.route);
  const matches=findGuideEntries(companionCatalog,input.question);
  const entries=[...new Map([target,...(page?[page]:[]),...matches].map(entry=>[entry.id,entry])).values()].slice(0,3);
  const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  // Anonymous RLS, no cookies/service-role, no payload, no private settings.
  const result=await client.from('content_registry').select('id,title,summary,status,route').eq('published',true).in('route',entries.map(entry=>entry.route!)).limit(3).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(2000)]));
  const published=(result.data??[]).filter(row=>typeof row.route==='string' && entries.some(entry=>entry.route===row.route)).map(row=>({title:String(row.title).slice(0,160),summary:String(row.summary).slice(0,320),status:String(row.status).slice(0,40),route:row.route}));
  // Registry discoverability is not a product's release/runtime maturity.
  const facts=entries.map(entry=>{
    const product=softwareProducts.find(item=>entry.route===`/products/${item.slug}`);
    return {id:entry.id,name:entry.name,summary:(product?.statement??entry.summary).slice(0,480),catalogStatus:entry.status,documentedReleaseStatus:product?.status??null,limitations:product?.limitations.slice(0,2).map(text=>text.slice(0,160))??[],route:entry.route};
  });
  return {entries,facts,published,registryAvailable:!result.error,field:input.context.field?companionFields[input.context.field][input.language]:null};
}
