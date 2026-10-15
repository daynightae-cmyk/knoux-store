'use client';
import Panel from './SentinelGuidePanel';
import { usePathname } from 'next/navigation';
import { useCallback,useEffect,useRef,useState,useSyncExternalStore } from 'react';
import { KnouxSentinel } from './KnouxSentinel';
import { KnouxThoughtBubble } from './KnouxThoughtBubble';
import { SentinelSpotlight } from './SentinelSpotlight';
import { useCompanionContext } from './useCompanionContext';
import { useCompanionReply } from './useCompanionReply';
import { subscribeSentinelQuiet,sentinelPreferenceSnapshot,sentinelServerSnapshot,SENTINEL_GUIDE_EVENT } from './sentinel-preferences';
import { entryForPage,type GuideEntry,type GuideLanguage } from '@/lib/sentinel/guide';
import type { CompanionContext } from '@/lib/sentinel/companion-contract';
import { HintPolicy } from '@/lib/sentinel/context';
import { guideDirection, guideLanguageTag, type GuideLanguage as LanguageId } from '@/lib/sentinel/languages';
import styles from './SentinelGuide.module.css';
/**
 * Accessible label shown when the mascot itself is hidden. Urdu is a separate
 * language, so it carries its own label rather than inheriting Arabic.
 */
const launcherLabel: Record<LanguageId, string> = {
  en: 'Open Sentinel guide',
  ar: 'افتح دليل Sentinel',
  ur: 'Sentinel رہنما کھولیں',
};
export function SentinelGuideLauncher() {
  const pathname=usePathname();
  const preferences=JSON.parse(useSyncExternalStore(subscribeSentinelQuiet,sentinelPreferenceSnapshot,sentinelServerSnapshot));
  const language:GuideLanguage=preferences.language,key=`${pathname}:${language}`;
  const [open,setOpen]=useState(false),[closing,setClosing]=useState(false),[composerKey,setComposerKey]=useState('');
  const [catalog,setCatalog]=useState<GuideEntry[]>([]),[questionValue,setQuestionValue]=useState({key:'',text:''});
  const [speechActive,setSpeechActive]=useState(false),[dismissed,setDismissed]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [attention,setAttention]=useState<{key:string;target:HTMLElement|null}>({key,target:null});
  const onAttention=useCallback((target:HTMLElement|null)=>setAttention({key,target}),[key]);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),policy=useRef(new HintPolicy(12000)),priorOpen=useRef(false);
  const {reply,send,stop,unavailable}=useCompanionReply(pathname,language,preferences.quiet);
  const composing=composerKey===key,question=questionValue.key===key?questionValue.text:'';
  const onIntent=useCallback((context:CompanionContext)=>{
    if(menuOpen || preferences.quiet || !preferences.tips || document.activeElement?.closest('form,input,textarea,select,[contenteditable]') || !policy.current.allow(pathname,`${context.target}:${context.section??''}:${context.topic??''}`,Date.now()))return;
    setDismissed('');send(context,'',false);
  },[pathname,preferences.quiet,preferences.tips,send,menuOpen]);
  const context=useCompanionContext(pathname,catalog,onIntent,!menuOpen && !open && !composing && preferences.tips && !preferences.quiet && preferences.visible,open||composing||menuOpen,onAttention);
  useEffect(()=>{
    const toggle=document.querySelector('.mobile-toggle');if(!toggle)return;
    const observer=new MutationObserver(()=>{const active=toggle.getAttribute('aria-expanded')==='true';setMenuOpen(active);if(active){stop();setComposerKey('');}});
    observer.observe(toggle,{attributes:true,attributeFilter:['aria-expanded']});return ()=>observer.disconnect();
  },[stop]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/sentinel/catalog',{credentials:'omit',signal:controller.signal}).then(async result=>{if(result.ok)setCatalog((await result.json()).entries);}).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(priorOpen.current && !open)document.querySelector<HTMLButtonElement>('.ks-trigger,[data-sentinel-fallback]')?.focus();
    priorOpen.current=open;document.documentElement.dataset.sentinelGuideOpen=String(open);
    window.dispatchEvent(new CustomEvent(SENTINEL_GUIDE_EVENT,{detail:{open}}));
    return ()=>{if(closeTimer.current)clearTimeout(closeTimer.current);};
  },[open]);
  const close=()=>{if(closing)return;window.speechSynthesis?.cancel();stop();setComposerKey('');setSpeechActive(false);setClosing(true);closeTimer.current=setTimeout(()=>{setOpen(false);setClosing(false);},preferences.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);};
  const dismiss=()=>{stop();policy.current.dismiss();setDismissed(key);setComposerKey('');document.querySelector<HTMLButtonElement>('.ks-trigger')?.focus();};
  const activate=()=>{if(open){close();return;}setDismissed('');setComposerKey(key);};
  const ask=()=>{const page=entryForPage(catalog,pathname);if(!page){unavailable();return;}setDismissed('');send(context??{route:pathname,target:page.id},question);};
  const visible=!menuOpen && !open && dismissed!==key && (composing || reply.state!=='idle');
  const phase=preferences.quiet?'quiet':open?(speechActive?'speaking':'expanded'):reply.state==='thinking'?'thinking':reply.state==='streaming'?'speaking':visible?'guiding':'idle';
  const character=<KnouxSentinel expanded={open} docked={composing||visible||menuOpen} menuPaused={menuOpen} phase={phase} language={language} onActivate={activate}>
    {visible && <KnouxThoughtBubble language={language} reply={reply} question={question} setQuestion={text=>setQuestionValue({key,text})} onAsk={ask} onStop={stop} onDismiss={dismiss} onSources={()=>{stop();setOpen(true);}} onClear={()=>{stop();setQuestionValue({key,text:''});}} catalog={catalog} composing={composing} />}
  </KnouxSentinel>;
  return <>
    <SentinelSpotlight target={!open&&!composing&&!menuOpen&&!preferences.quiet&&preferences.visible&&attention.key===key?attention.target:null}/>
    {!open && (preferences.visible?character:<button data-sentinel-fallback aria-haspopup="dialog" className={styles.fallback} type="button" onClick={activate} lang={guideLanguageTag(language)} dir={guideDirection(language)}>{launcherLabel[language]}</button>)}
    {!preferences.visible && visible && <div className={styles.hiddenCompanion}>{character}</div>}
    {open && <Panel onClose={close} closing={closing} character={character} contextEntry={catalog.find(entry=>entry.id===context?.target)} onSpeaking={setSpeechActive} />}
  </>;
}
