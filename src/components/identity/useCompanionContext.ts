'use client';
import { companionTopics } from '@/lib/sentinel/public-build-guide';
import { useEffect,useState } from 'react';
import { companionSections,companionFields,type CompanionContext } from '@/lib/sentinel/companion-contract';
import { entryForPage,type GuideEntry } from '@/lib/sentinel/guide';

export function useCompanionContext(pathname: string,catalog: GuideEntry[],onIntent: (context: CompanionContext)=>void,enabled: boolean,frozen=false,onAttention?: (target:HTMLElement|null)=>void) {
  const [observed,setObserved]=useState<CompanionContext|null>(null);
  useEffect(()=>{
    const page=entryForPage(catalog,pathname);if(!page || frozen)return;
    let dwell=0,interacted=false;const base:CompanionContext={route:pathname,target:page.id,role:'page'};
    const publish=(context: CompanionContext,element?:HTMLElement)=>{
      const field=document.activeElement as HTMLInputElement|null;
      if(pathname==='/contact' && field?.matches('input,textarea') && companionFields[field.name]){setObserved({...base,field:field.name,role:'field'});return;}
      interacted=true;setObserved(context);if(enabled && !document.hidden){onAttention?.(element??null);onIntent(context);}
    };
    const routeTimer=window.setTimeout(()=>{if(!interacted)publish(base);},3200);
    const clear=()=>clearTimeout(dwell);
    const attend=(event: Event)=>{
      clear();onAttention?.(null);const target=event.target as Element|null;
      if(!target || target.closest('[data-knoux-sentinel],[hidden],[aria-hidden=true],[inert],[data-private]'))return;
      const field=target.closest<HTMLInputElement|HTMLTextAreaElement>('main input,main textarea');
      if(field){if(pathname==='/contact' && field.type!=='password' && companionFields[field.name])setObserved({...base,field:field.name,role:'field'});return;}
      if(target.closest('form,[contenteditable],input,textarea,select'))return;
      const link=target.closest<HTMLAnchorElement>('a[href]');
      const semantic=target.closest<HTMLElement>('[data-knoux-context]');
      const heading=target.closest<HTMLElement>('main h1,main h2,main h3');
      const action=target.closest('button[aria-controls=solution-handoff],button[aria-controls=solution-layer-detail]');
      const source=link ?? (action?document.getElementById('solution-handoff')?.querySelector<HTMLAnchorElement>('a[href]'):null);
      if(!(source??semantic??heading)?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return;
      const destination=semantic?.getAttribute('data-knoux-context')??source?.href??(heading?pathname:null);if(!destination)return;
      const url=new URL(destination,location.href);if(url.origin!==location.origin)return;
      const entry=catalog.find(entry=>entry.route===url.pathname);if(!entry)return;
      const topic=semantic?.getAttribute('data-companion-topic');
      const publicTopic=topic && Object.hasOwn(companionTopics,topic) && ['/build/providers','/build/ai/providers'].includes(pathname)?topic:undefined;
      dwell=window.setTimeout(()=>publish({...base,target:entry.id,...(publicTopic?{topic:publicTopic}:{}),role:heading?'section':link?'link':'button'},(semantic??source??heading) as HTMLElement),1100);
    };
    const ids=companionSections[pathname]??[];
    const observedSections=new Map<Element,HTMLElement>();
    const observer=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting){clear();dwell=window.setTimeout(()=>{
      const section=observedSections.get(record.target);if(!section)return;
      const destination=section.closest('[data-knoux-context]')?.getAttribute('data-knoux-context');
      const entry=destination?catalog.find(entry=>entry.route===destination):null;
      publish({...base,target:entry?.id??base.target,section:section.id,role:'section'},record.target as HTMLElement);
    },1600);}},{threshold:.3});
    // Observe a heading when available: a long section may never reach 30%
    // visibility on a phone, even while its content is being explored.
    ids.forEach(id=>{const section=document.getElementById(id);if(section){const marker=section.querySelector('h2,h3')??section;observedSections.set(marker,section);observer.observe(marker);}});
    const typing=()=>{clear();onAttention?.(null);};
    const touch=(event:PointerEvent)=>{if(event.pointerType==='touch')attend(event);};
    const leave=(event:PointerEvent)=>{const element=event.target as Element|null;if(!element?.contains(event.relatedTarget as Node|null)){clear();onAttention?.(null);}};
    document.addEventListener('pointerover',attend);document.addEventListener('focusin',attend);document.addEventListener('pointerout',leave);document.addEventListener('pointerdown',touch);document.addEventListener('keydown',clear);document.addEventListener('input',typing);
    return ()=>{clearTimeout(routeTimer);clear();observer.disconnect();document.removeEventListener('pointerover',attend);document.removeEventListener('focusin',attend);document.removeEventListener('pointerout',leave);document.removeEventListener('pointerdown',touch);document.removeEventListener('keydown',clear);document.removeEventListener('input',typing);onAttention?.(null);};
  },[pathname,catalog,enabled,onIntent,frozen,onAttention]);
  return observed?.route===pathname?observed:null;
}
