'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import styles from './SentinelSpotlight.module.css';
/**
 * A luminous frame drawn over the element Sentinel is currently attending.
 *
 * The highlight is a portal-level overlay, so it is never trapped by an
 * ancestor's overflow, transform or stacking context, and it tracks the live
 * `getBoundingClientRect()` of the real target rather than a cached one.
 *
 * Two behaviours matter for correctness:
 *
 * 1. The scan sweep is restarted whenever the target changes. React re-runs the
 *    effect for a new target but keeps the same DOM node, so a CSS animation
 *    declared on that node would already be finished and would not replay —
 *    the visitor would see the frame jump between elements with no scan at all.
 *    Reflow is forced explicitly to restart both `arrive` and `scan`.
 * 2. A private target is refused outright. The context observer already filters
 *    `[data-private]`, but an overlay that illuminates a credential field or a
 *    hidden node would leak which control holds a secret, so the guard is
 *    repeated here as the last line before anything is drawn.
 *
 * The overlay is purely decorative (`aria-hidden`) and never accepts pointer
 * events, so the described control stays fully clickable.
 */
const PRIVATE_SELECTOR='[data-private],input,textarea,select,[contenteditable=true],[hidden],[aria-hidden=true],button[type=submit]';
export function SentinelSpotlight({target}:{target:HTMLElement|null}){
 const frame=useRef<HTMLDivElement>(null);
 const attended=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  const node=frame.current;
  const refused=!target||!node||!target.isConnected||target.closest(PRIVATE_SELECTOR)!==null;
  if(attended.current&&attended.current!==target)attended.current.removeAttribute('data-sentinel-attended');
  attended.current=refused?null:target;
  if(refused){if(node)node.style.display='none';return;}
  const element=target as HTMLElement;
  let raf=0,closed=false;
  const place=()=>{
   raf=0;
   if(closed||!frame.current)return;
   const rect=element.getBoundingClientRect();
   const header=document.querySelector('header.site-header')?.getBoundingClientRect().bottom??0;
   // Clamp into the viewport and below the sticky header so the frame never
   // hangs off-screen or sits underneath it.
   const left=Math.max(4,rect.left-5),top=Math.max(header+4,rect.top-5),right=Math.min(innerWidth-4,rect.right+5),bottom=Math.min(innerHeight-4,rect.bottom+5);
   const visible=element.isConnected&&!element.closest(PRIVATE_SELECTOR)&&element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&right>left&&bottom>top&&!document.hidden;
   Object.assign(frame.current.style,{display:visible?'block':'none',left:`${left}px`,top:`${top}px`,width:`${Math.max(0,right-left)}px`,height:`${Math.max(0,bottom-top)}px`});
  };
  const update=()=>{if(!raf)raf=requestAnimationFrame(place);};
  element.setAttribute('data-sentinel-attended','true');
  place();
  // Restart the bounded arrive + scan animation for this new target.
  node.style.animation='none';
  const sweep=node.firstElementChild as HTMLElement|null;
  if(sweep)sweep.style.animation='none';
  void node.offsetWidth;
  node.style.animation='';
  if(sweep)sweep.style.animation='';
  const resize=new ResizeObserver(update);
  resize.observe(element);
  document.addEventListener('scroll',update,true);
  window.addEventListener('resize',update);
  document.addEventListener('visibilitychange',update);
  return()=>{
   closed=true;
   cancelAnimationFrame(raf);
   resize.disconnect();
   document.removeEventListener('scroll',update,true);
   window.removeEventListener('resize',update);
   document.removeEventListener('visibilitychange',update);
   element.removeAttribute('data-sentinel-attended');
  };
 },[target]);
 if(!target||typeof document==='undefined')return null;
 return createPortal(<div ref={frame} className={styles.spotlight} data-sentinel-spotlight aria-hidden="true"><span/></div>,document.body);
}
