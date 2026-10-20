'use client';
import { useEffect, useRef } from 'react';
import { isSentinelQuiet, readSentinelOptions, SENTINEL_PREFERENCES_EVENT } from './sentinel-preferences';
import { capabilityFor } from './sentinel-capability';
import { sentinelSpring } from './sentinel-motion';
import { SLEEP_AFTER_MS, BLINK_MS, blinkGap, classifyTarget, resolveVisual, type SentinelMood } from './knoux-sentinel';

export function useSentinelPresence(expanded: boolean) {
  const root=useRef<HTMLSpanElement>(null), eyes=useRef<SVGGElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const coarse = matchMedia('(pointer: coarse)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0, idle=0, sleep=0, blinkTimer=0, last=0, blinkIndex=0;
    let mood: SentinelMood='idle', blinking=false;
    let x=innerWidth-88, y=innerHeight-104, tx=x, ty=y, vx=0, vy=0, sleeping=false;
    const expression=() => { node.dataset.state=resolveVisual({mood:sleeping?'sleep':mood,gazeX:0,gazeY:0,blinking});node.dataset.capability=capabilityFor(sleeping?'sleep':mood); };
    const paused=() => document.hidden || isSentinelQuiet() || reduced.matches || readSentinelOptions().reduced;
    const docked=() => expanded || coarse.matches || paused();
    const stop=() => { cancelAnimationFrame(frame); frame=0; last=0; };
    const paint=() => {
      node.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      node.dataset.bubbleSide=x>innerWidth/2?'left':'right';
      node.dataset.bubbleVertical=y>innerHeight/2?'up':'down';
    };
    const tick=(time: number) => {
      frame=0; if(docked() || sleeping) return;
      const dt=last?(time-last)/1000:1/60; last=time;
      const nx=sentinelSpring(x,vx,tx,dt), ny=sentinelSpring(y,vy,ty,dt);
      x=nx.position; vx=nx.velocity; y=ny.position; vy=ny.velocity; paint();
      const settled=Math.abs(tx-x)<.18 && Math.abs(ty-y)<.18 && Math.abs(vx)<1 && Math.abs(vy)<1;
      node.dataset.settled=String(settled);
      if(!settled) frame=requestAnimationFrame(tick); else last=0;
    };
    const start=() => { if(!frame && !docked() && !sleeping) frame=requestAnimationFrame(tick); };
    const dock=() => { tx=innerWidth-88; ty=innerHeight-104; start(); };
    const blink=() => {
      clearTimeout(blinkTimer); if(paused() || sleeping) return;
      blinkTimer=window.setTimeout(() => { blinking=true;expression();blinkTimer=window.setTimeout(() => {blinking=false;expression();blinkIndex++;blink();},BLINK_MS);},blinkGap(blinkIndex));
    };
    const sync=() => {
      stop(); clearTimeout(blinkTimer);
      node.dataset.guideDocked=String(docked()); node.dataset.ready='true';
      node.dataset.motion=paused() || sleeping?'paused':'animated'; expression();
      document.documentElement.dataset.sentinelQuiet=String(isSentinelQuiet());
      if(docked()){node.dataset.bubbleSide='left';node.dataset.bubbleVertical='up';node.dataset.settled='true';}
      if(!docked()){x=innerWidth-88;y=innerHeight-104;tx=x;ty=y;paint();}
      blink();
    };
    const wake=() => {
      if(sleeping){sleeping=false;sync();} clearTimeout(sleep);
      if(!paused()) sleep=window.setTimeout(() => {dock();sleeping=true;expression();node.dataset.motion='paused';stop();clearTimeout(blinkTimer);},SLEEP_AFTER_MS);
    };
    const move=(event: PointerEvent) => {
      if(event.pointerType!=='mouse' || docked() || document.hidden) return;
      const target=event.target as Element|null;
      // Freeze within reach: the character must be clickable, never evade the visitor.
      if(target?.closest('[data-knoux-sentinel]') || Math.hypot(event.clientX-x-32,event.clientY-y-40)<115){stop();node.dataset.settled='true';return;}
      wake();const hit=classifyTarget(target);mood=hit.mood;expression();
      const surface=target?.closest<HTMLElement>('[data-spatial]');
      if(surface){const box=surface.getBoundingClientRect();surface.style.setProperty('--local-x',`${(event.clientX-box.left)/box.width*100}%`);surface.style.setProperty('--local-y',`${(event.clientY-box.top)/box.height*100}%`);}
      if(target?.closest('form,input,textarea,select,[contenteditable]')){dock();return;}
      tx=Math.max(16,Math.min(innerWidth-88,event.clientX+(event.clientX>innerWidth-180?-100:70)));
      ty=Math.max(16,Math.min(innerHeight-104,event.clientY+(event.clientY>innerHeight-180?-110:45)));
      if(eyes.current) eyes.current.style.transform=`translate(${Math.max(-2,Math.min(2,(event.clientX-x)/80))}px,1px)`;
      start();clearTimeout(idle);idle=window.setTimeout(dock,2600);
    };
    document.addEventListener('pointermove',move,{passive:true}); document.documentElement.addEventListener('mouseleave',dock);
    document.addEventListener('visibilitychange',sync); window.addEventListener('resize',sync); window.addEventListener('keydown',wake);
    window.addEventListener(SENTINEL_PREFERENCES_EVENT,sync);coarse.addEventListener('change',sync);reduced.addEventListener('change',sync);
    sync();wake();
    return () => {
      stop();[idle,sleep,blinkTimer].forEach(clearTimeout);
      document.removeEventListener('pointermove',move);document.documentElement.removeEventListener('mouseleave',dock);
      document.removeEventListener('visibilitychange',sync);window.removeEventListener('resize',sync);window.removeEventListener('keydown',wake);
      window.removeEventListener(SENTINEL_PREFERENCES_EVENT,sync);coarse.removeEventListener('change',sync);reduced.removeEventListener('change',sync);
    };
  },[expanded]);
  return {root,eyes};
}
