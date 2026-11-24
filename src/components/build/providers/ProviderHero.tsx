'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ParticleMark } from '@/components/brand/ParticleMark';
import type { ProviderDefinition } from '@/lib/ai/provider-os/types';
import { providerMark } from './provider-marks';
import s from './provider-hero.module.css';

const positions = [
  ['openai', 'OpenAI', 33, 30], ['anthropic', 'Anthropic', 21, 42],
  ['gemini', 'Google Gemini', 67, 30], ['openrouter', 'OpenRouter', 80, 42],
  ['deepseek', 'DeepSeek', 89, 57], ['groq', 'Groq', 11, 57],
  ['qwen', 'QwenCloud', 21, 73], ['mistral', 'Mistral', 79, 73], ['grok', 'Grok', 67, 83],
] as const;

export function ProviderHero({ definitions, selected, connection, discoveredModels, onSelect, onGetApi, onBrowse, onInspect }: {
  definitions: readonly ProviderDefinition[];
  selected: string;
  connection: string | null;
  discoveredModels: number | null;
  onSelect: (definition: ProviderDefinition) => void;
  onGetApi: () => void;
  onBrowse: () => void;
  onInspect: () => void;
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
  const currentMark = current ? providerMark(current.id) : null;
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
    {positions.map(([id,name,x,y], index)=>{const d=definitions.find(p=>p.id===id),mark=providerMark(id);return <button type="button" key={id} className={s.node} style={{'--x':x+'%','--y':y+'%','--phase':(([6,7,8,5,0,4,1,3,2][index] / 9)*100)+'%'} as CSSProperties} disabled={!d} aria-label={'Select '+name} aria-pressed={selected===id} onClick={()=>d&&onSelect(d)}><span className={s.sphere} aria-hidden="true">{mark?<Image src={'/providers/'+mark+'.svg'} alt="" width={48} height={48}/>:<b data-provider={id} />}</span><span>{name}</span></button>})}
    <div className={s.dossier}>
      <ParticleMark patternId="provider-mark-particles" className={s.dossierSeal} />
      {current ? <div key={current.id} className={s.dossierContent} aria-live="polite">
        <header>
          {currentMark && <Image src={`/providers/${currentMark}.svg`} alt="" width={43} height={43} />}
          <div><span>{current.class.replaceAll('_', ' ')}</span><h2>{current.name}</h2></div>
          <strong>{connection?.replaceAll('_', ' ')}</strong>
        </header>
        <dl>
          <div><dt>Transport</dt><dd>{current.transport}</dd></div>
          <div><dt>Discovered models</dt><dd>{discoveredModels ?? 'Not reported'}</dd></div>
        </dl>
      </div> : <div className={s.dossierContent}><h2>Select a provider</h2></div>}
      <div className={s.dossierActions}>
        {current ? <button type="button" onClick={onInspect}>Provider details</button> : null}
        <button type="button" onClick={onBrowse}>Browse catalog</button>
        <Link href="/build/ai/models">Models</Link>
      </div>
    </div>
    <button type="button" className={s.getApi} onClick={onGetApi}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 14 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0)"/></svg>Get API</button>
  </section>;
}
