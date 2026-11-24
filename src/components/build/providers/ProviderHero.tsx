'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ParticleMark } from '@/components/brand/ParticleMark';
import type { ProviderDefinition } from '@/lib/ai/provider-os/types';
import { providerMark } from './provider-marks';
import s from './provider-hero.module.css';

const positions = [
  ['openai', 'OpenAI', 34.4, 34.7], ['anthropic', 'Anthropic', 49.8, 31.2],
  ['gemini', 'Google Gemini', 64.9, 34.7], ['openrouter', 'OpenRouter', 23.8, 44.6],
  ['deepseek', 'DeepSeek', 75.5, 44.6], ['groq', 'Groq', 19, 57.7],
  ['qwen', 'QwenCloud', 80.3, 57.7], ['mistral', 'Mistral', 27.6, 67.3],
  ['grok', 'Grok', 71.9, 67.3],
] as const;

export function ProviderHero({ definitions, selected, connection, onSelect, onGetApi, onBrowse }: {
  definitions: readonly ProviderDefinition[];
  selected: string;
  connection: string | null;
  onSelect: (definition: ProviderDefinition) => void;
  onGetApi: () => void;
  onBrowse: () => void;
}) {
  const hero = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    let visible = true;
    const sync = () => { element.dataset.motionActive = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const current = definitions.find(definition => definition.id === selected);
  return <section ref={hero} className={s.hero} data-paused={paused} aria-label="Universal Provider Engine">
    <button type="button" className={s.motionControl} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Resume orbit':'Pause orbit'}</button>
    {/* The reference sky is drawn, never photographed: nebula banks, a seeded
        star field and the planet limb are code layers inside this scene. */}
    <div className={s.sky} aria-hidden="true" />
    <div className={s.limb} aria-hidden="true" />
    <div className={s.planet} aria-hidden="true" />
    <Link href="/build" className={s.brand}><i aria-hidden="true" /> <b>KNOuX</b> <span>STORE</span></Link>
    <header className={s.title}><h1>Universal Provider Engine</h1><p>Connect. Discover. Route.</p></header>
    <svg className={s.orbits} viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true">
      <defs><filter id="provider-orbit-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <g fill="none" stroke="#b88bf3" strokeWidth="1.4">
        <ellipse cx="768" cy="557" rx="631" ry="170" opacity=".35"/>
        <ellipse cx="768" cy="531" rx="488" ry="209" opacity=".75"/>
        <ellipse cx="768" cy="568" rx="348" ry="80" opacity=".38" transform="rotate(-6 768 568)"/>
        <ellipse cx="768" cy="560" rx="170" ry="43" opacity=".8" transform="rotate(-8 768 560)"/>
        <ellipse cx="768" cy="813" rx="370" ry="39" opacity=".35"/>
        <ellipse cx="768" cy="813" rx="300" ry="24" opacity=".25"/>
      </g>
      {[[433,389], [649,332], [885,332], [1101,399], [510,519], [1055,534], [531,716], [1009,716], [156,599], [1374,540], [665,614], [916,550]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="6" fill="#bd76ff" filter="url(#provider-orbit-glow)"/><circle cx={x} cy={y} r="3" fill="#fff"/></g>)}
      {/* Four-point flares: the reference's brightest sky stars. */}
      <g stroke="#f4ebff" fill="none">
        {[[1428, 54, 22], [1497, 561, 15], [1471, 899, 12], [742, 866, 26], [235, 128, 9]].map(([x, y, r]) => (
          <g key={`flare-${x}`} data-flare="" opacity=".8">
            <path d={`M${x - r} ${y}h${r * 2}M${x} ${y - r}v${r * 2}`} strokeWidth="1.2" />
            <path d={`M${x - r * .45} ${y - r * .45}l${r * .9} ${r * .9}M${x + r * .45} ${y - r * .45}l${-r * .9} ${r * .9}`} strokeWidth=".8" opacity=".6" />
            <circle cx={x} cy={y} r={r * .22} fill="#fff" stroke="none" />
          </g>
        ))}
      </g>
    </svg>
    <div className={s.leftPanel}><button type="button" onClick={onBrowse}><span aria-hidden="true">▱</span> Providers</button>{positions.slice(0,3).map(([id,name])=>{const d=definitions.find(p=>p.id===id); const mark=providerMark(id);return <button key={id} type="button" disabled={!d} onClick={()=>d&&onSelect(d)}>{mark&&<Image src={'/providers/'+mark+'.svg'} alt="" width={23} height={23}/>}<span>{name}</span><span aria-hidden="true">→</span></button>})}</div>
    <div className={s.rightPanel}><Link href="/build/ai/models"><span aria-hidden="true">◇</span> Model Discovery</Link><div aria-hidden="true" className={s.skeleton}>{Array.from({length:4},(_,i)=><i key={i}/>)}</div></div>
    <div className={s.lowerLeft} aria-hidden="true"><div className={s.skeleton}>{Array.from({length:5},(_,i)=><i key={i}/>)}</div></div>
    <div className={s.lowerRight} aria-hidden="true"><div className={s.skeleton}>{Array.from({length:5},(_,i)=><i key={i}/>)}</div></div>
    {positions.map(([id,name,x,y], index)=>{const d=definitions.find(p=>p.id===id),mark=providerMark(id);return <button type="button" key={id} className={s.node} style={{'--x':x+'%','--y':y+'%','--phase':(([6,7,8,5,0,4,1,3,2][index] / 9)*100)+'%'} as CSSProperties} disabled={!d} aria-label={'Select '+name} aria-pressed={selected===id} onClick={()=>d&&onSelect(d)}><span className={s.sphere} aria-hidden="true">{mark?<Image src={'/providers/'+mark+'.svg'} alt="" width={48} height={48}/>:<b data-provider={id} />}</span><span>{name}</span></button>})}
    <div className={s.core}>
      <ParticleMark patternId="provider-mark-particles" className={s.mark} />
      <div className={s.coreLight} aria-hidden="true"/>
      <div className={s.coreLinks}><button type="button" onClick={onBrowse} aria-label="Browse providers"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 4 21 11-21 11L3 15Z M3 24l21 11 21-11 M3 33l21 11 21-11"/></svg></button><Link href="/build/ai/models" aria-label="Discover models"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 3 20 11v22L24 47 4 36V14Z M4 14l20 11 20-11 M24 25v22"/></svg></Link></div>
    </div>
    {current ? <div className={s.selection} aria-live="polite"><strong>{current.name}</strong><span>{connection}</span></div> : null}
    <button type="button" className={s.getApi} onClick={onGetApi}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 14 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)"/></svg>Get API</button>
  </section>;
}
