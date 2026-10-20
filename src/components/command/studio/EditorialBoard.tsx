'use client';

import { useState } from 'react';
import { useWorkspace } from '../workspace-context';
import { PlacementPreview } from './AdPreviewTheatre';
import styles from './studio.module.css';

export function EditorialBoard() {
  const { activeClient } = useWorkspace();
  return <Board key={activeClient.id} />;
}
function Board() {
  const { records, activeClient, studioEdits, editCreative, selectCreative, placement } = useWorkspace();
  const [selectedId, setSelectedId] = useState(records.content[0]?.id ?? '');
  const item = records.content.find((content) => content.id === selectedId);
  const creative = records.creatives.find((draft) => item?.campaignId && draft.campaignId === item.campaignId);
  const edit = creative ? studioEdits[creative.id] : undefined;
  return <section className={styles.theatre} aria-label="Editorial board"><div className={styles.toolbar}><div><span className={styles.eyebrow}>EDITORIAL / INTENT BEFORE PUBLICATION</span><h2>Content in motion</h2></div><span className={styles.state}>NOT A PUBLISHER</span></div><div className={styles.editorialBoard}>{(['DRAFT', 'APPROVAL_REQUIRED', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const).map((status) => <div key={status}><h3>{status === 'SCHEDULED' ? 'Scheduled intent' : status === 'APPROVAL_REQUIRED' ? 'Client review' : status === 'PUBLISHED' ? 'Recorded published status' : status.toLowerCase()}</h3>{records.content.filter((content) => content.status === status).map((content) => <button key={content.id} type="button" aria-pressed={item?.id === content.id} onClick={() => { setSelectedId(content.id); const linked = records.creatives.find((draft) => content.campaignId && draft.campaignId === content.campaignId); if (linked) selectCreative(linked.id); }}>{content.copy.slice(0, 130)}<small>{content.scheduledFor?.slice(0, 10) ?? 'No planned date'} · {content.origin}</small></button>)}{!records.content.some((content) => content.status === status) && <p>No records</p>}</div>)}</div>{item && <div className={styles.editorialDetail}><div><h3>Selected calendar record</h3><p>{item.copy}</p><p>{item.status} · {item.origin} · {item.scheduledFor ?? 'No scheduled intent'}</p><p>Calendar records remain unchanged. Use the copy below to stage a creative variation, then review it in the theatre and Campaigns.</p><button type="button" disabled={!creative} onClick={() => { if (creative) { editCreative(creative.id, { creative: { primaryText: item.copy } }); selectCreative(creative.id); } }}>Stage calendar copy in linked creative</button>{!creative && <p>No authorized creative is linked to this content’s campaign. Select or link it through an authorized write workflow.</p>}</div>{edit && <div><span className={styles.version}>Shared creative revision {edit.revision} · NOT SAVED</span><PlacementPreview edit={edit} clientName={activeClient.name} placement={placement} /></div>}</div>}</section>;
}
