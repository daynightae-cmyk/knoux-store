'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { PLACEMENTS, brandViolations, destinationValid, beginEdit, type StudioEdit, type PlacementId } from '@/lib/growth/studio';
import { useWorkspace } from '../workspace-context';
import { CommandIcon } from '../CommandIcon';
import { trapDialogFocus } from '../dialog-focus';
import styles from './studio.module.css';

export function PlacementPreview({ edit, clientName, placement, safe = false, ratio }: { edit: StudioEdit; clientName: string; placement: PlacementId; safe?: boolean; ratio?: string }) {
  const preset = PLACEMENTS.find((item) => item.id === placement)!;
  const creative = edit.creative;
  const media = <div className={styles.media} style={{ aspectRatio: ratio ?? preset.ratio }}><svg viewBox="0 0 180 180" aria-hidden="true"><path d="M90 12 158 51v78l-68 39-68-39V51z M90 12v156 M22 51l136 78 M158 51 22 129" /></svg><span>EMPTY ASSET SLOT</span><small>{edit.asset ? `${edit.asset} · reference only; no resolved media URL` : 'No approved media selected'}</small>{safe && <div className={styles.safe}>Composition guide · not a verified platform safe zone</div>}</div>;
  const copy = <p className={styles.copy}>{creative.primaryText || 'Primary copy appears here'}</p>;
  const headline = <h3>{creative.headline || creative.concept}</h3>;
  const destination = <span className={styles.destination} dir="ltr">{destinationValid(edit.destination) ? new URL(edit.destination).hostname : 'Destination not configured'}</span>;
  return <article className={`${styles.ad} ${styles[preset.kind]}`} dir={edit.locale === 'ar' ? 'rtl' : 'ltr'} aria-label={`${preset.label} design preview`}>
    <header><span className={styles.avatar}>{clientName.slice(0, 1)}</span><div><strong>{clientName}</strong><small>DESIGN PREVIEW · NOT PUBLISHED</small></div><span aria-hidden="true">···</span></header>
    {preset.kind === 'search' ? <div className={styles.searchBody}><small>Sponsored · local text approximation</small>{destination}{headline}{copy}<p>{creative.description}</p></div> : preset.kind === 'message' ? <div className={styles.messageBody}><small>Local business message composition</small>{headline}{copy}<span>{creative.cta}</span>{destination}</div> : <>
      {preset.kind === 'feed' && copy}
      {media}
      {preset.kind === 'vertical' ? <div className={styles.overlay}>{placement !== 'tiktok' && headline}{copy}<span>{creative.cta}</span></div> : <div className={styles.adFooter}>{destination}{headline}{preset.kind === 'video' && copy}<span className={styles.cta}>{creative.cta || 'Choose CTA'}</span></div>}
    </>}
  </article>;
}

const TABS = ['Creative', 'Copy', 'Assets', 'Placements', 'Audience', 'Budget', 'Tracking', 'Approval'] as const;
export function AdPreviewTheatre({ campaignId }: { campaignId?: string }) {
  const workspace = useWorkspace();
  return <Theatre key={`${workspace.activeClient.id}:${campaignId ?? 'studio'}`} campaignId={campaignId} />;
}

function Theatre({ campaignId }: { campaignId?: string }) {
  const { activeClient, records, studioEdits, selectedCreativeId, selectCreative, editCreative, placement, setPlacement, isDemoWorkspace, campaignPlans } = useWorkspace();
  const [tab, setTab] = useState<typeof TABS[number]>('Copy');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('updated');
  const [safe, setSafe] = useState(false);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState('100');
  const [aspect, setAspect] = useState('preset');
  const fullscreen = useRef<HTMLDialogElement>(null);
  const creatives = records.creatives.filter((item) => !campaignId || item.campaignId === campaignId || records.campaigns.find((campaign) => campaign.id === campaignId)?.creativeSetIds.includes(item.id));
  const current = creatives.find((item) => item.id === selectedCreativeId) ?? creatives[0];
  const edit = current ? studioEdits[current.id] : undefined;
  const preset = PLACEMENTS.find((item) => item.id === placement)!;
  const campaign = campaignPlans.find((item) => item.id === (campaignId ?? edit?.creative.campaignId));
  const violations = edit ? brandViolations(edit, activeClient.brand.forbiddenClaims) : [];
  const patch = (value: Parameters<typeof editCreative>[1]) => current && editCreative(current.id, value);
  const label = (en: string, ar: string) => edit?.locale === 'ar' ? ar : en;
  if (!edit || !current) return <div className={styles.empty}><h2>No creative linked to this workspace</h2><p>Select a client with an authorized draft. No sample is substituted for missing live records.</p></div>;
  const preview = (original = false) => <PlacementPreview edit={original ? beginEdit(current, campaign?.landingPageUrl ?? activeClient.website ?? '') : edit} clientName={activeClient.name} placement={placement} safe={safe} ratio={aspect === 'preset' ? undefined : aspect} />;
  return <section className={styles.theatre} aria-label="Ad Preview Theatre">
    <div className={styles.toolbar}><div><span className={styles.eyebrow}>GROWTH OS / CREATIVE INSTRUMENT</span><h2>{label('Ad Preview Theatre', 'معاينة الإعلان')}</h2></div><span className={styles.state}>{isDemoWorkspace ? 'DEMO / FIXTURE' : 'STORED SOURCE'} · NOT PUBLISHED</span></div>
    <div className={styles.placementBar} role="tablist" aria-label="Ad placement">{PLACEMENTS.map((item, index) => <button key={item.id} type="button" role="tab" id={`placement-${item.id}`} aria-controls="studio-canvas" aria-selected={placement === item.id} tabIndex={placement === item.id ? 0 : -1} onClick={() => { setPlacement(item.id); setAspect('preset'); }} onKeyDown={(event) => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? PLACEMENTS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + PLACEMENTS.length) % PLACEMENTS.length; setPlacement(PLACEMENTS[next].id); setAspect('preset'); document.getElementById(`placement-${PLACEMENTS[next].id}`)?.focus(); } }}>{item.label}</button>)}</div>
    <div className={styles.body}>
      <aside className={styles.studioNav} aria-label="Studio controls">{TABS.map((item, index) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}><CommandIcon code={['08', '04', '08', '01', '05', '02', '13', '14'][index]} />{item}</button>)}<div className={styles.library}><label>Find draft<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search copy…" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Latest updated</option><option value="name">Concept</option></select></label>{creatives.filter((item) => (status === 'all' || item.status === status) && `${item.concept} ${studioEdits[item.id]?.creative.headline}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'name' ? a.concept.localeCompare(b.concept) : b.updatedAt.localeCompare(a.updatedAt)).map((item) => <button className={styles.draftButton} key={item.id} type="button" aria-pressed={current.id === item.id} onClick={() => selectCreative(item.id)}>{item.concept}<small>{item.status} · {item.format}</small></button>)}</div></aside>
      <div className={styles.canvasColumn}><div className={styles.deviceBar}><label>Zoom<select value={zoom} onChange={(event) => setZoom(event.target.value)}><option value="75">75%</option><option value="100">Fit / 100%</option></select></label><label>Aspect<select value={aspect} onChange={(event) => setAspect(event.target.value)} disabled={!['feed'].includes(preset.kind)}><option value="preset">{preset.ratio}</option><option value="1 / 1">1:1</option><option value="4 / 5">4:5</option></select></label><button type="button" aria-pressed={safe} onClick={() => setSafe(!safe)}>Guides</button><button type="button" aria-pressed={compare} onClick={() => setCompare(!compare)}>Compare source</button><button type="button" onClick={() => fullscreen.current?.showModal()}>Expand preview</button></div>
        <div id="studio-canvas" role="tabpanel" aria-labelledby={`placement-${placement}`} className={styles.canvas} style={{ '--preview-scale': Number(zoom) / 100 } as React.CSSProperties}><div className={compare ? styles.comparison : styles.single}>{compare && <div><span className={styles.version}>Stored source · {current.updatedAt}</span>{preview(true)}</div>}<div><span className={styles.version}>{label('Local revision', 'مراجعة محلية')} {edit.revision} · {edit.locale.toUpperCase()}</span>{preview()}</div></div></div>
        <div className={styles.spec}><strong>{preset.label} · {aspect === 'preset' ? preset.ratio : aspect}</strong><span>{preset.formats} · {preset.hidden}</span><p>Local DOM layout approximation. Not an official platform renderer or format validator. Guides are compositional only; verify current provider specifications before export. No reach, delivery or performance is predicted.</p></div>
      </div>
      <aside className={styles.inspector} dir={edit.locale === 'ar' ? 'rtl' : 'ltr'}><span className={styles.eyebrow}>{tab.toUpperCase()} / {activeClient.name}</span>
        {(tab === 'Copy' || tab === 'Creative') && <><label>{label('Copy language', 'لغة المحتوى')}<select aria-label="Copy language" value={edit.locale} onChange={(event) => patch({ locale: event.target.value as 'ar' | 'en' })}><option value="en">English</option><option value="ar">العربية</option></select></label><label>{label('Headline', 'العنوان')}<input aria-label="Headline" value={edit.creative.headline ?? ''} maxLength={500} onChange={(event) => patch({ creative: { headline: event.target.value } })} /><small>{edit.creative.headline?.length ?? 0} characters · local count</small></label><label>{label('Primary copy', 'النص الأساسي')}<textarea aria-label="Primary copy" rows={6} value={edit.creative.primaryText ?? ''} maxLength={4000} onChange={(event) => patch({ creative: { primaryText: event.target.value } })} /><small>{edit.creative.primaryText?.length ?? 0} characters</small></label><label>{label('Call to action', 'الدعوة لاتخاذ إجراء')}<input aria-label="Call to action" value={edit.creative.cta ?? ''} maxLength={120} onChange={(event) => patch({ creative: { cta: event.target.value } })} /></label><label>{label('Description', 'الوصف')}<textarea value={edit.creative.description ?? ''} onChange={(event) => patch({ creative: { description: event.target.value } })} /></label></>}
        {tab === 'Assets' && <><h3>Approved asset references</h3><label>Asset reference<select value={edit.asset} onChange={(event) => patch({ asset: event.target.value })}><option value="">Empty asset slot</option>{activeClient.brand.approvedAssets.map((asset) => <option key={asset}>{asset}</option>)}</select></label><p>References are not resolved media URLs. Upload and signed media resolution are not configured; no upload is accepted.</p><h3>Brand system</h3><div className={styles.swatches}>{activeClient.brand.colors.map((color) => <span key={color} style={{ background: /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#777' }} title={color} />)}</div><p>{activeClient.brand.fonts.join(' · ')}</p></>}
        {tab === 'Placements' && <><h3>{preset.label}</h3><p>{preset.hidden}</p><p>Inspect alternative layouts above. Compatibility needs provider review; a preview does not establish publishing support.</p></>}
        {tab === 'Audience' && <><h3>Campaign audience</h3><p>{campaign?.locations.join(', ') || 'No linked campaign geography'}</p><p>{campaign?.audienceNotes || 'Audience notes not reported'}</p><p>{campaign?.languages.join(' / ')}</p></>}
        {tab === 'Budget' && <><h3>Client-paid media</h3><p>{campaign ? `${campaign.currency} ${(campaign.budgetMinor / 100).toFixed(2)}` : 'No linked campaign budget'}</p><p>KNOuX service fees are separate. Edit budget in Campaigns; no spend occurs here.</p></>}
        {(tab === 'Tracking' || tab === 'Copy') && <label>{label('Destination URL', 'رابط الوجهة')}<input aria-label="Destination URL" type="url" dir="ltr" value={edit.destination} onChange={(event) => patch({ destination: event.target.value })} aria-invalid={!destinationValid(edit.destination)} />{!destinationValid(edit.destination) && <small role="status">Enter an HTTPS URL without credentials.</small>}</label>}
        {tab === 'Approval' && <><h3>{edit.revision > 0 ? 'Local changes need a new review' : current.status}</h3><p>Local revisions are not approved or saved. Review the exact campaign and copy together in Campaigns. A named authorized reviewer and durable write boundary are required.</p><Link href="/command/campaigns">Open campaign review</Link></>}
        <div className={styles.checks}><strong>{label('Brand checks', 'فحص العلامة')}</strong>{violations.length ? violations.map((claim) => <p role="alert" key={claim}>Forbidden claim: {claim}</p>) : <p>No exact forbidden-phrase match. Human review still required.</p>}<details><summary>Brand rules</summary><p>{activeClient.brand.tone}</p><ul>{activeClient.brand.forbiddenClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></details></div>
      </aside>
    </div>
    <footer className={styles.activity} aria-live="polite"><strong>{edit.revision > 0 ? 'NOT SAVED · local edits' : 'READ-ONLY SOURCE'}</strong><span>{isDemoWorkspace ? 'Demo editing only' : 'Draft write endpoint unavailable'} · revision {edit.revision} · {current.id}</span><span>Selection shared with Creative, Campaigns & Social. No platform called.</span></footer>
    <dialog ref={fullscreen} className={styles.fullscreen} aria-label="Expanded design preview" onKeyDown={trapDialogFocus} onClick={(event) => { if (event.target === event.currentTarget) fullscreen.current?.close(); }}><button type="button" onClick={() => fullscreen.current?.close()}>Close preview</button><p>DESIGN PREVIEW · NOT PUBLISHED</p>{preview()}</dialog>
  </section>;
}
