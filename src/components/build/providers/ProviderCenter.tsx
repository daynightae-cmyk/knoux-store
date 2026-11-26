'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AGENT_PERMISSIONS, type ProviderWorkspaceSnapshot, type ProviderDefinition, type ProviderProfile, type AuthSource } from '@/lib/ai/provider-os/types';
import { routingEligibility } from '@/lib/ai/provider-os/policy';
import { freshVerifiedConnection, providerConnectionLabel } from '@/lib/ai/provider-os/connection-label';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './providers.module.css';
import { ProviderHero } from './ProviderHero';
import { ProviderAuthFeedback } from './ProviderAuthFeedback';
import { PlatformFacts } from './PlatformFacts';
import { CustomMetadata } from './CustomMetadata';
import { providerMark } from './provider-marks';
import { cueAtmosphere } from '../dev/living-atmosphere';
const classes = [['ALL', 'All providers'], ['INTELLIGENCE', 'Intelligence'], ['CONNECTED', 'Connected'], ['FREE_MODELS', 'Free models'], ['CODING_AGENT', 'Coding agents'], ['VISION', 'Vision'], ['LOCAL', 'Local models'], ['CUSTOM', 'Custom']] as const;
const unknown = 'UNKNOWN · not reported';
const consoleProvider = 'opencode-console-v2';
// Providers arranged evenly around a large slow-orbiting circle (angle in degrees, 0 = top).
const orbitSlots = [
    ['openai', 0], ['anthropic', 36], ['gemini', 72], ['openrouter', 108],
    ['groq', 144], ['mistral', 180], ['deepseek', 216], ['qwen', 252],
    ['grok', 288], ['opencode-go', 324],
] as const;
const providerOrder = new Map<string, number>([consoleProvider, ...orbitSlots.map(([id]) => id)].map((id, rank) => [id, rank]));

function ProviderMark({ definition }: { definition: ProviderDefinition }) {
    const mark = providerMark(definition.id);
    return <span className={styles.orbit} data-mark={mark} data-provider={definition.id} aria-hidden="true">{mark ? <Image src={`/providers/${mark}.svg`} alt="" width={26} height={26} loading="eager" /> : definition.id === 'groq' || definition.id === 'grok' ? definition.name : definition.class === 'CODING_AGENT' ? '⌘' : definition.class === 'LOCAL' ? '◉' : '✦'}</span>;
}
export function ProviderCenter({ embedded = false, initialDefinitions = [] }: Readonly<{
    embedded?: boolean;
    initialDefinitions?: readonly ProviderDefinition[];
}>) {
    const { dispatch } = useBuildWorkspace();
    const [celebration, setCelebration] = useState<{name: string; sequence: number} | null>(null);
    const [data, setData] = useState<ProviderWorkspaceSnapshot | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    // No provider is pre-selected: the constellation opens unobstructed so every
    // orbit node is clickable. Selecting a provider reveals its contextual panel.
    const [search, setSearch] = useState(''), [category, setCategory] = useState('ALL'), [selected, setSelected] = useState(''), [tab, setTab] = useState('Overview');
    const [orbitPage, setOrbitPage] = useState(0);
    const [mode, setMode] = useState<'constellation' | 'catalog'>('constellation');
    const isConstellation = !embedded && mode === 'constellation';
    // Defer the heavy hero constellation until after mount so the registry
    // rail and its "Browse providers" summary are in the DOM immediately on
    // slow tablet/mobile runners, preventing the credential-recovery spec
    // from timing out waiting for the summary to appear.
    const [heroMounted, setHeroMounted] = useState(false);
    // Defer the heavy hero constellation until after mount so the registry
    // rail and its "Browse providers" summary are in the DOM immediately on
    // slow tablet/mobile runners, preventing the credential-recovery spec
    // from timing out waiting for the summary to appear. setTimeout avoids a
    // synchronous setState inside the effect.
    useEffect(() => {
      const timer = setTimeout(() => setHeroMounted(true), 0);
      return () => clearTimeout(timer);
    }, []);

    const [wizard, setWizard] = useState(false), [profileName, setProfileName] = useState(''), [authMode, setAuthMode] = useState<AuthSource['mode']>('API_KEY'), [credentialId, setCredentialId] = useState(''), [reference, setReference] = useState('');
    const [editProfile, setEditProfile] = useState<{
        id: string;
        version: number;
    } | null>(null);
    const [streamBilling, setStreamBilling] = useState(false);
    const [credentialName, setCredentialName] = useState(''), [secret, setSecret] = useState(''), [editCredential, setEditCredential] = useState(''), [rotate, setRotate] = useState(false);
    const [showAll, setShowAll] = useState(false), [modelSearch, setModelSearch] = useState(''), [freeOnly, setFreeOnly] = useState(false), [modelPage, setModelPage] = useState(0), [billing, setBilling] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLButtonElement | null>(null);
    const providerBrowse = useRef<HTMLDetailsElement>(null), detail = useRef<HTMLElement>(null);
    // A synchronous lock also covers submissions before React commits `busy`.
    const inFlight = useRef(false);
    const load = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch('/api/build/provider-os', { cache: 'no-store', signal });
        const result = await response.json();
        if (result.definitions)
            setData(result);
        else
            setMessage(result.message ?? 'Provider persistence unavailable. No fixtures were substituted.');
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        async function initialize() {
            try {
                const response = await fetch('/api/build/provider-os', { cache: 'no-store', signal: controller.signal });
                const result = await response.json();
                if (result.definitions) {
                    setData(result);
                }
                else
                    setMessage(result.message ?? 'Provider persistence unavailable. No fixtures were substituted.');
            }
            catch (error) {
                if (!controller.signal.aborted)
                    setMessage('Cannot reach provider persistence. No connection is claimed.');
            }
        }
        void initialize();
        return () => controller.abort();
    }, []);
    useEffect(() => {
        if (wizard && !dialog.current?.open)
            dialog.current?.showModal();
        if (!wizard && dialog.current?.open)
            dialog.current.close();
    }, [wizard]);
    const definitions = data?.definitions ?? initialDefinitions, definition = definitions.find(item => item.id === selected), profiles = data?.profiles.filter(item => item.providerId === selected) ?? [];
    const profile = profiles.find(item => item.active) ?? profiles[0], credentials = data?.credentials.filter(item => item.providerId === selected) ?? [], agent = data?.agents.find(item => item.id === selected);
    const writable = data?.persistence === 'AVAILABLE', vaultWritable = writable && data?.secretStore.writable;
    const query = search.trim().toLowerCase();
    const filtered = definitions.filter(item => {
        const ownProfiles = data?.profiles.filter(candidate => candidate.providerId === item.id) ?? [];
        const models = ownProfiles.flatMap(candidate => candidate.models);
        const matches = [item.name, item.id, item.transport, ...models.flatMap(model => [model.modelId, model.displayName])]
            .some(value => value.toLowerCase().includes(query));
        if (!matches) return false;
        if (category === 'CONNECTED') return ownProfiles.some(candidate => candidate.active && providerConnectionLabel(candidate) === 'VERIFIED');
        if (category === 'FREE_MODELS') return models.some(model => model.pricing.inputPerMillion === 0 && model.pricing.outputPerMillion === 0);
        if (category === 'VISION') return models.some(model => model.modalities.imageInput);
        return category === 'ALL' || item.class === category;
    });
    if (!embedded) filtered.sort((a, b) => (providerOrder.get(a.id) ?? Infinity) - (providerOrder.get(b.id) ?? Infinity));
    // Compact orbit below 1000px: the reference hero stays the desktop authority,
    // while narrow screens keep a pageable, touch-sized shortcut surface.
    const orbitProviders = orbitSlots.flatMap(([id]) => {
        const provider = filtered.find(item => item.id === id);
        return provider ? [provider] : [];
    });
    const lastOrbitPage = Math.max(0, Math.ceil(orbitProviders.length / 3) - 1);
    const visibleOrbitPage = Math.min(orbitPage, lastOrbitPage);
    const compactOrbit = orbitProviders.slice(visibleOrbitPage * 3, visibleOrbitPage * 3 + 3);
    async function command(input: Record<string, unknown>, workspaceId?: string): Promise<boolean> {
        if (inFlight.current)
            return false;
        inFlight.current = true;
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/build/provider-os', { method: 'POST', headers: { 'content-type': 'application/json', ...(workspaceId ? { 'x-knoux-workspace-id': workspaceId } : {}) }, body: JSON.stringify(input) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message ?? 'Provider operation refused.');
            setData(result);
            if (workspaceId) clearCredentialDraft();
            window.dispatchEvent(new Event('knoux-provider-profiles-changed'));
            if (input.action === 'TEST_CONNECTION') {
                const before = data?.profiles.find(item => item.id === input.id);
                const after = (result as ProviderWorkspaceSnapshot).profiles?.find(item => item.id === input.id);
                if (result.persistence === 'AVAILABLE' && freshVerifiedConnection(before, after)) {
                    const name = definitions.find(item => item.id === after?.providerId)?.name ?? 'Provider';
                    setCelebration(value => ({ name, sequence: (value?.sequence ?? 0) + 1 }));
                    cueAtmosphere('provider-authenticated');
                    setMessage(name + ': authentication and model discovery verified. Generation is not tested.');
                } else {
                    setMessage('Connection test result: ' + providerConnectionLabel(after) + '. No success effect was triggered.');
                }
            } else {
                setMessage('Configuration saved. Measured connection facts remain separate.');
            }
            return true;
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Provider operation refused.');
            return false;
        }
        finally {
            setBusy(false);
            inFlight.current = false;
        }
    }
    function choose(item: ProviderDefinition) {
        if (inFlight.current) return;
        if (item.id !== selected) cueAtmosphere('confirm');
        clearCredentialDraft();
        setSelected(item.id);
        setTab('Overview');
        setModelPage(0);
        setModelSearch('');
        setBilling(false);
        setStreamBilling(false);
        if (window.innerWidth <= 650) {
            if (providerBrowse.current)
                providerBrowse.current.open = false;
            requestAnimationFrame(() => {
                detail.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
                detail.current?.focus({ preventScroll: true });
            });
        }
    }
    function clearCredentialDraft() {
        setSecret('');
        setCredentialName('');
        setEditCredential('');
        setRotate(false);
    }
    function closeWizard() { setWizard(false); setSecret(''); setEditProfile(null); opener.current?.focus(); }
    function openWizard(button: HTMLButtonElement, existing?: ProviderProfile) {
        if (!definition)
            return;
        opener.current = button;
        setEditProfile(existing ? { id: existing.id, version: existing.version } : null);
        setAuthMode(existing?.auth.mode ?? definition.authModes[0]);
        setProfileName(existing?.name ?? '');
        setCredentialId(existing && 'credentialId' in existing.auth ? existing.auth.credentialId ?? '' : '');
        setReference(existing ? existing.auth.mode === 'ENV_REFERENCE' ? existing.auth.variable : existing.auth.mode === 'CLI_PROFILE' ? existing.auth.profileName : 'endpoint' in existing.auth ? existing.auth.endpoint : '' : definition.environmentNames[0] ?? '');
        setWizard(true);
    }
    async function createProfile(event: FormEvent) {
        event.preventDefault();
        if (!definition)
            return;
        let auth: AuthSource;
        if (authMode === 'ENV_REFERENCE')
            auth = { mode: authMode, variable: reference };
        else if (authMode === 'CLI_PROFILE')
            auth = { mode: authMode, profileName: reference };
        else if (authMode === 'LOCAL_ENDPOINT' || authMode === 'CUSTOM_ENDPOINT')
            auth = { mode: authMode, endpoint: reference, credentialId: credentialId || null };
        else
            auth = { mode: authMode, credentialId: credentialId || null };
        if (await command(editProfile ? { action: 'PROFILE_UPDATE', id: editProfile.id, version: editProfile.version, patch: { name: profileName, auth } } : { action: 'PROFILE_CREATE', providerId: definition.id, name: profileName, auth }))
            closeWizard();
    }
    async function saveSecret(event: FormEvent) {
        event.preventDefault();
        if (!definition)
            return;
        const existing = credentials.find(item => item.id === editCredential);
        const saved = await command(existing ? { action: rotate ? 'CREDENTIAL_ROTATE' : 'CREDENTIAL_REPLACE', id: existing.id, version: existing.revision, secret } : { action: 'CREDENTIAL_CREATE', providerId: definition.id, name: credentialName, secret });
        if (saved) setSecret('');
    }
    async function pasteSecret(field: HTMLElement) {
        try {
            const value = (await navigator.clipboard.readText()).trim();
            if (field.isConnected && !inFlight.current) {
                if (value.length > 8192) {
                    setMessage('Clipboard text exceeds the credential field limit.');
                    return;
                }
                setSecret(value);
            }
        } catch {
            if (field.isConnected) setMessage('Clipboard access is unavailable. Paste directly into Secret key.');
        }
    }
    function update(patch: Record<string, unknown>) {
        if (profile)
            void command({ action: 'PROFILE_UPDATE', id: profile.id, version: profile.version, patch });
    }
    const models = (profile?.models ?? []).filter(model => (showAll || (model.modalities.text && model.lifecycle !== 'deprecated' && model.catalog?.buildEligible !== false)) && (!freeOnly || (model.pricing.inputPerMillion === 0 && model.pricing.outputPerMillion === 0)) && `${model.modelId} ${model.displayName}`.toLowerCase().includes(modelSearch.toLowerCase()));
    const heading = <header className={styles.heading}><span className={styles.eyebrow}>PROVIDERS / AI ECOSYSTEM</span>{embedded ? <h2>Providers</h2> : <h1>Provider Intelligence</h1>}</header>;
    const toolbar = <div className={styles.toolbar}><label className={styles.search}>Search providers<input type="search" value={search} onChange={event => { setSearch(event.target.value); if (providerBrowse.current) providerBrowse.current.open = true; }} placeholder="Provider, transport, agent…"/></label>{data?.workspaces?.length ? <label>Provider workspace<select disabled={busy} value={data.workspaceId ?? ''} onChange={event => void command({ action: 'WORKSPACE_SELECT' }, event.target.value)}>{data.workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label> : null}<button type="button" disabled={busy} onClick={() => void load().catch(() => setMessage('Provider refresh failed.'))}>Refresh facts ↗</button>{writable ? <button type="button" disabled={busy} onClick={() => {
                const name = window.prompt('New provider workspace name');
                if (name)
                    void command({ action: 'WORKSPACE_CREATE', name });
            }}>Add workspace +</button> : null}</div>
    const controls = <>
    {embedded || !isConstellation ? heading : <h2>Providers</h2>}
    {message ? <p role="status" className={styles.notice}>{message}</p> : null}
    {data?.persistence !== 'AVAILABLE' ? <p className={styles.notice}>{data?.persistence === 'AUTH_REQUIRED' ? <><Link href="/login">Sign in</Link> to manage your provider profiles. Operator environment providers remain available through the canonical runtime.</> : data?.blocker ?? 'Reading the authenticated provider registry…'}</p> : null}
    <div className={styles.filters} role="group" aria-label="Provider class">{classes.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => { setCategory(id); setSelected(''); setTab('Overview'); if (wizard) closeWizard(); if (providerBrowse.current)
        providerBrowse.current.open = true; }}>{label}</button>)}</div>
    </>;
    return <div className={`${styles.center} ${isConstellation ? styles.standalone : ''} dev-route`} data-provider-view={embedded ? undefined : mode}>
    {!embedded ? <nav className={styles.workspaceViews} aria-label="Build workspace views">
      {([['Build', 'genesis'], ['Preview', 'preview'], ['Registry', 'data']] as const).map(([label, surface]) => (
        <Link href="/build" key={surface} onClick={() => dispatch({ type: 'surface/active', surface })}>{label}</Link>
      ))}
    </nav> : null}
    {!embedded ? <div className={styles.modeSwitch} role="group" aria-label="Provider view mode">
      <button type="button" aria-pressed={isConstellation} onClick={() => setMode('constellation')}>Constellation</button>
      <button type="button" aria-pressed={!isConstellation} onClick={() => setMode('catalog')}>Intelligence catalog</button>
    </div> : null}
    <ProviderAuthFeedback celebration={celebration} />
    {isConstellation && heroMounted && <ProviderHero
      definitions={definitions}
      selected={selected}
      connection={definition ? providerConnectionLabel(profile) : null}
      discoveredModels={profile?.discoveredAt ? profile.models.length : null}
      onSelect={choose}
      onBrowse={() => setMode('catalog')}
      onInspect={() => { detail.current?.scrollIntoView({ block: 'start' }); detail.current?.focus({ preventScroll: true }); }}
      onGetApi={() => {
        if (inFlight.current) return;
        if (!definition) { setMode('catalog'); return; }
        setTab('Credentials');
        requestAnimationFrame(() => { detail.current?.scrollIntoView({ block: 'start' }); detail.current?.focus({ preventScroll: true }); });
      }}
    />}
    {embedded ? <>{controls}{toolbar}<PlatformFacts /></> : null}
    <div className={`${styles.composition} ${isConstellation && orbitProviders.length ? styles.withOrbit : ''}`}>
      <div className={styles.registryRail}>
      {embedded ? null : controls}
      {!embedded && !isConstellation ? toolbar : null}
      <details ref={providerBrowse} className={styles.providerBrowse} open><summary>Browse providers &#8599;</summary><nav className={styles.providerList} aria-label="Provider registry">{filtered.map(item => { const own = data?.profiles.filter(profile => profile.providerId === item.id) ?? [], active = own.find(profile => profile.active); return <button key={item.id} type="button" aria-current={selected === item.id ? 'true' : undefined} onClick={() => choose(item)}><ProviderMark definition={item} /><span><strong>{item.name}</strong><small>{item.gateway ? 'GATEWAY · ' : ''}{item.class.replace('_', ' ')} · {active ? active.enabled ? 'PROFILE ACTIVE' : 'PROVIDER DISABLED' : own.length ? 'PROFILE INACTIVE' : 'UNCONFIGURED'}</small></span><span aria-hidden="true">↗</span></button>; })}{!filtered.length ? <p>{data ? 'No provider matches this search. Coding agents appear only from a paired trusted bridge.' : 'Provider registry is unavailable until its status has been read.'}</p> : null}</nav></details>
      {embedded ? null : <details className={styles.registryUtilities}><summary>{isConstellation ? 'Search & workspace' : 'Platform facts'}</summary>{isConstellation ? toolbar : null}<PlatformFacts /></details>}
      </div>
      {isConstellation && orbitProviders.length > 0 ? (
        <aside className={styles.providerOrbit} aria-label="Provider shortcuts">
          <div className={styles.compactOrbit}>
            <div className={styles.compactTrack} aria-hidden="true" />
            <div className={styles.orbitCore}>
              {definition && <ProviderMark definition={definition} />}
              <span>{definition?.name ?? 'Provider orbit'}</span>
            </div>
            <div className={styles.orbitOptions}>
              {compactOrbit.map(provider => (
                <button key={provider.id} type="button" aria-current={selected === provider.id ? 'true' : undefined} onClick={() => choose(provider)}>
                  <ProviderMark definition={provider} /><span>{provider.name}</span>
                </button>
              ))}
            </div>
            {lastOrbitPage > 0 && <div className={styles.orbitPaging}>
              <button type="button" aria-label="Previous provider orbit page" disabled={visibleOrbitPage === 0} onClick={() => setOrbitPage(visibleOrbitPage - 1)}>‹</button>
              <span aria-live="polite">{visibleOrbitPage + 1} / {lastOrbitPage + 1}</span>
              <button type="button" aria-label="Next provider orbit page" disabled={visibleOrbitPage === lastOrbitPage} onClick={() => setOrbitPage(visibleOrbitPage + 1)}>›</button>
            </div>}
          </div>
        </aside>
      ) : null}
      <section ref={detail} tabIndex={-1} className={styles.detail} aria-label="Provider detail">{!definition ? <div className={styles.intro}><span aria-hidden="true" className={styles.constellation}>✦</span><h2>A connected constellation.</h2><p>Select a provider to configure its profiles and inspect measured capabilities. Keys stay on the server; unmeasured usage remains unknown.</p><p>{data?.blocker}</p></div> : <>
        {!embedded ? <div className={styles.detailMark} aria-hidden="true">
          <svg viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}>{MARK_PATHS.map(({ id, d }) => <path key={id} d={d} />)}</svg>
        </div> : null}
        <header className={styles.detailHeading}><span className={styles.eyebrow}>{definition.class.replace('_', ' ')} / {definition.transport}</span><h2 className={styles.detailTitle}>{embedded ? null : <ProviderMark definition={definition} />}{definition.name}</h2><p data-provider-connection>Connection: <strong>{providerConnectionLabel(profile)}</strong></p>{profile ? <p>Profile: <strong>{profile.name}</strong> · {profile.active ? "ACTIVE" : "INACTIVE"} · {profile.enabled ? "ENABLED" : "DISABLED"}</p> : null}<p>{definition.gateway ? 'Gateway transport. Author namespaces do not prove the actual upstream route.' : definition.detectionOnly ? 'CLI discovery is a separate fact from authentication and execution.' : 'A scoped profile feeds the existing KNOuX adapters and Router V2.'}</p><div className={styles.actions}><button type="button" disabled={!writable || busy} onClick={event => openWizard(event.currentTarget)}>Add profile +</button>{profile ? <><button type="button" disabled={!writable || busy} onClick={() => update({ enabled: !profile.enabled })}>{profile.enabled ? 'Disable provider' : 'Enable provider'}</button><button type="button" disabled={!writable || busy} onClick={() => void command({ action: 'TEST_CONNECTION', id: profile.id, version: profile.version })}>Test connection</button></> : null}{definition.docsUrl ? <a href={definition.docsUrl} target="_blank" rel="noopener noreferrer" className={styles.docsLink}><span aria-hidden="true">↗</span> Get API Key</a> : null}</div><small>Connection testing checks authentication and discovery only; it does not generate content.</small></header>
        <nav className={styles.tabs} aria-label={`${definition.name} sections`}>{definition.tabs.map(item => <button type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <section className={styles.tabContent} aria-label={tab}>
        {tab === 'Endpoint' && definition.class === 'CUSTOM' ? <CustomMetadata /> : null}
        {tab === 'Overview' ? <><h3>Independent facts</h3><dl className={styles.facts}>{Object.entries(profile?.connection ?? { configuration: 'CONFIG_REQUIRED', auth: 'UNTESTED', discovery: 'UNTESTED', runtime: 'UNTESTED', streaming: 'UNTESTED' }).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value ?? 'UNTESTED'}</dd></div>)}</dl><p>{profile ? routingEligibility(profile, profile.connection.configuration === 'CONFIGURED').reason : 'Create a profile, bind its source and test the connection.'}</p>{agent ? <dl className={styles.facts}><div><dt>Detected</dt><dd>{agent.detected ? 'DETECTED' : 'CLI_NOT_FOUND'}</dd></div><div><dt>Authentication</dt><dd>{agent.authenticated}</dd></div><div><dt>Execution</dt><dd>{agent.state}</dd></div><div><dt>Version</dt><dd>{agent.version ?? 'UNMEASURED'}</dd></div></dl> : null}</> : null}
        {tab === 'Profiles & Limits' ? <><h3>Profiles & limits</h3><p>Switching is atomic and scoped to this workspace. Deleting a profile retains its credential until you explicitly delete it.</p>{profiles.map(item => <article className={styles.profile} key={item.id}><h4>{item.name}</h4><p>{item.active ? 'ACTIVE' : 'INACTIVE'} · {item.enabled ? 'ENABLED' : 'DISABLED'} · {item.auth.mode} · revision {item.version}</p><div className={styles.actions}><button type="button" disabled={!writable || busy || item.active} onClick={() => void command({ action: 'PROFILE_SWITCH', id: item.id, version: item.version })}>Use {item.name}</button><button type="button" disabled={!writable || busy} onClick={() => {
                        const next = window.prompt('Profile name', item.name);
                        if (next)
                            void command({ action: 'PROFILE_UPDATE', id: item.id, version: item.version, patch: { name: next } });
                    }}>Rename {item.name}</button><button type="button" disabled={!writable || busy} onClick={event => openWizard(event.currentTarget, item)}>Edit authentication for {item.name}</button><button type="button" disabled={!writable || busy} onClick={() => {
                        if (window.confirm(`Delete profile ${item.name}? Its credential will be retained.`))
                            void command({ action: 'PROFILE_DELETE', id: item.id, version: item.version });
                    }}>Delete {item.name}</button></div></article>)}{profile ? <form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget), limit = fields.get('limit'); update({ routing: { ...profile.routing, monthlySpendLimit: limit === '' ? null : Number(limit) } }); }}><label>Monthly spending ceiling (USD)<input name="limit" type="number" min="0" max="1000000" step="0.01" defaultValue={profile.routing.monthlySpendLimit ?? ''} key={`${profile.id}-${profile.version}`}/></label><p>Provider limits: {profile.providerLimits?.length ? "See provider-reported measurements in Usage." : unknown}. A configured spending ceiling blocks routing while durable usage enforcement is unavailable; unknown does not mean unlimited.</p><button type="submit" disabled={!writable || busy}>Save spending ceiling</button></form> : null}</> : null}
        {tab === 'Credentials' ? <><h3>Write-only credentials</h3><p>{data?.secretStore.state ?? 'SECRET STORAGE NOT CONFIGURED'}</p>{credentials.map(item => <article className={styles.profile} key={item.id}><h4>{item.name}</h4><p>{item.configured ? 'CONFIGURED · auth untested' : 'REVOKED / UNCONFIGURED'} · revision {item.revision} · {item.referencedBy.length} profile references</p><div className={styles.actions}><button type="button" disabled={!vaultWritable || busy} onClick={() => { setEditCredential(item.id); setRotate(false); setSecret(''); }}>Replace {item.name}</button><button type="button" disabled={!vaultWritable || busy} onClick={() => { setEditCredential(item.id); setRotate(true); setSecret(''); }}>Rotate {item.name}</button><button type="button" disabled={!writable || busy || !item.configured} onClick={() => {
                        if (window.confirm('Revoke this credential and invalidate every dependent profile?'))
                            void command({ action: 'CREDENTIAL_REVOKE', id: item.id, version: item.revision });
                    }}>Revoke {item.name}</button><button type="button" disabled={!writable || busy || item.referencedBy.length > 0} title={item.referencedBy.length ? 'Remove all profile bindings before deletion.' : undefined} onClick={() => {
                        if (window.confirm('Permanently delete this unreferenced credential?'))
                            void command({ action: 'CREDENTIAL_DELETE', id: item.id, version: item.revision });
                    }}>Delete {item.name}</button></div></article>)}
          <form key={`${definition.id}:${editCredential}`} className={styles.form} onSubmit={event => void saveSecret(event)}>
            <h4>{editCredential ? rotate ? 'Rotate credential' : 'Replace credential' : 'Add credential'}</h4>
            {!editCredential ? <label>Credential name<input required maxLength={80} value={credentialName} onChange={event => setCredentialName(event.target.value)}/></label> : <button type="button" onClick={clearCredentialDraft}>Add a different credential</button>}
            <label htmlFor="provider-secret-key">Secret key
              <input id="provider-secret-key" type="password" autoComplete="new-password" spellCheck={false} autoCapitalize="none" required maxLength={8192} disabled={!vaultWritable} value={secret} onChange={event => setSecret(event.target.value)}/>
            </label>
            <div className={styles.actions}>
              <button type="button" disabled={!vaultWritable || busy} onClick={event => void pasteSecret(event.currentTarget)}>Paste from clipboard</button>
            </div>
            <p>The field clears after a successful save. Replacement and rotation reset dependent connection checks.</p>
            <button type="submit" disabled={!vaultWritable || busy}>{editCredential ? 'Save replacement' : 'SAVE API KEY'}</button>
          </form>
        </> : null}
        {tab === 'Endpoint' ? <><h3>Endpoint binding</h3><p>{profile && 'endpoint' in profile.auth ? profile.auth.endpoint : 'No endpoint bound.'}</p><p>{definition.class === 'LOCAL' ? 'Loopback only, through an authorized local server. A hosted deployment cannot execute a runtime on your computer.' : 'Public HTTPS only. The server operator must allow the hostname; DNS is checked and the socket is pinned. Redirects are refused.'}</p>{profile ? <form className={styles.form} onSubmit={event => {
                        event.preventDefault();
                        const endpoint = String(new FormData(event.currentTarget).get('endpoint'));
                        if ('credentialId' in profile.auth)
                            update({ auth: { ...profile.auth, endpoint } });
                    }}><label>Endpoint URL<input name="endpoint" type="url" required defaultValue={'endpoint' in profile.auth ? profile.auth.endpoint : ''}/></label><button type="submit" disabled={!writable || busy}>Save endpoint</button></form> : null}</> : null}
        {tab === 'Models' ? <><h3>Canonical catalog</h3><div className={styles.toolbar}><label>Search models<input type="search" value={modelSearch} onChange={event => { setModelSearch(event.target.value); setModelPage(0); }}/></label><label className={styles.check}><input type="checkbox" checked={showAll} onChange={event => { setShowAll(event.target.checked); setModelPage(0); }}/>SHOW ALL</label><label className={styles.check}><input type="checkbox" checked={freeOnly} onChange={event => { setFreeOnly(event.target.checked); setModelPage(0); }}/>FREE only</label></div><p>{models.length} matching · FREE requires reported zero input and output prices. Build eligibility is a view; catalog identities are preserved.</p>{models.slice(modelPage * 30, modelPage * 30 + 30).map(model => <article className={styles.model} key={model.modelId}><h4>{model.displayName}</h4><code>{model.modelId}</code><p>{model.source} · {model.modalities.text ? 'TEXT / BUILD CANDIDATE' : 'CATALOG ONLY'} · context {model.contextWindow ?? 'UNKNOWN'} · {model.pricing.inputPerMillion === 0 && model.pricing.outputPerMillion === 0 ? 'FREE' : model.pricing.inputPerMillion === null ? 'PRICE UNKNOWN' : `$${model.pricing.inputPerMillion} / $${model.pricing.outputPerMillion ?? 'UNKNOWN'} per million tokens`}</p></article>)}{!models.length ? <p>No measured models match. Test connection to discover this profile’s catalog.</p> : null}<div className={styles.actions}><button type="button" disabled={modelPage === 0} onClick={() => setModelPage(page => page - 1)}>Previous models</button><span>Page {modelPage + 1}</span><button type="button" disabled={(modelPage + 1) * 30 >= models.length} onClick={() => setModelPage(page => page + 1)}>Next models</button></div></> : null}
        {tab === 'Capabilities' ? <><h3>Model capability evidence</h3><p>SUPPORTED is provider metadata; VERIFIED requires an executed test. UNKNOWN grants no capability.</p>{profile?.models.slice(0, 30).map(model => <article className={styles.model} key={model.modelId}><h4>{model.displayName}</h4><dl className={styles.facts}>{Object.entries(model.capabilities).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article>)}</> : null}
        {tab === 'Routing' ? <><h3>Canonical Router V2</h3><p>{profile ? routingEligibility(profile, profile.connection.configuration === 'CONFIGURED').reason : 'PROFILE REQUIRED'}</p>{profile ? <><label className={styles.check}><input type="checkbox" checked={profile.routing.automatic} disabled={!writable || busy} onChange={event => update({ routing: { ...profile.routing, automatic: event.target.checked } })}/>Allow automatic routing</label><p>Manual selection stays exact. Disabled profiles cannot generate or participate in fallback.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); update({ routing: { ...profile.routing, modelAllowlist: fields.getAll('model') } }); }}><fieldset><legend>Model allowlist (empty permits eligible discovered models)</legend>{profile.models.filter(model => model.modalities.text).slice(0, 100).map(model => <label className={styles.check} key={model.modelId}><input type="checkbox" name="model" value={model.modelId} defaultChecked={profile.routing.modelAllowlist.includes(model.modelId)}/>{model.displayName}</label>)}</fieldset><button type="submit" disabled={!writable || busy}>Save model policy</button></form></> : null}</> : null}
        {tab === 'Permissions' ? <><h3>Supported · allowed · available</h3><p>Defaults deny. A profile policy can never exceed the operator’s server-side permission ceiling.</p>{profile ? <form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); update({ permissions: Object.fromEntries(AGENT_PERMISSIONS.map(id => [id, fields.get(id)])) }); }}>{AGENT_PERMISSIONS.map(id => { const capability = agent?.capabilities.find(entry => entry.id === id); return <label key={id}>{id} · {capability?.supported ?? 'UNKNOWN'} · stored policy {profile.permissions[id]} · {capability?.currentlyAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}<select name={id} defaultValue={profile.permissions[id]}><option>DENY</option><option>ASK</option><option>ALLOW</option></select></label>; })}<button type="submit" disabled={!writable || busy}>Save permission policy</button></form> : <p>Create a coding-agent profile first.</p>}</> : null}
        {['MCP', 'Plugins', 'Skills'].includes(tab) ? <><h3>{tab} bindings</h3><p>Installed metadata comes from the trusted bridge. A binding does not claim a running or authenticated connection.</p>{profile ? <form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget), key = tab === 'MCP' ? 'mcp' : tab === 'Plugins' ? 'plugins' : 'skills', kind = tab === 'MCP' ? 'MCP' : tab === 'Plugins' ? 'PLUGIN' : 'SKILL'; update({ bindings: { ...profile.bindings, [key]: (data?.inventory.filter(item => item.kind === kind) ?? []).map(item => ({ id: item.id, enabled: fields.getAll('binding').includes(item.id) })) } }); }}>{data?.inventory.filter(item => item.kind === (tab === 'MCP' ? 'MCP' : tab === 'Plugins' ? 'PLUGIN' : 'SKILL')).map(item => <label className={styles.check} key={item.id}><input name="binding" value={item.id} type="checkbox" defaultChecked={profile.bindings[tab === 'MCP' ? 'mcp' : tab === 'Plugins' ? 'plugins' : 'skills'].some(binding => binding.id === item.id && binding.enabled)}/>{item.name} · {item.state} · {item.source}</label>)}<p>{data?.inventory.length ? 'Only installed inventory entries can be bound.' : 'No installed entries measured by a paired bridge.'}</p><button type="submit" disabled={!writable || busy}>Save {tab} bindings</button></form> : null}</> : null}
        {tab === 'Environment' ? <><h3>Environment references</h3><p>Names only. Values remain on the trusted local host.</p>{data?.inventory.flatMap(item => item.environmentNames).length ? <ul>{[...new Set(data.inventory.flatMap(item => item.environmentNames))].map(item => <li key={item}>{item}</li>)}</ul> : <p>No environment names measured.</p>}</> : null}
        {tab === 'CLI & Args' ? <><h3>CLI source and structured arguments</h3><dl className={styles.facts}><div><dt>Source</dt><dd>{agent?.source ?? 'UNKNOWN'}</dd></div><div><dt>Binary reference</dt><dd>{agent?.binary ?? 'CLI_NOT_FOUND'}</dd></div><div><dt>Version</dt><dd>{agent?.version ?? 'UNMEASURED'}</dd></div></dl><p>No raw shell command is accepted. Execution remains EXECUTOR_NOT_CONNECTED until a real agent adapter exists.</p>{profile && agent?.binary ? <form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget), arg = (key: string) => String(fields.get(key) ?? '') || null; update({ cli: { source: agent.source, binaryReference: agent.binary, arguments: { model: arg('model'), profile: arg('cliProfile'), workingDirectoryReference: arg('cwd') }, role: fields.get('role'), autoSwitch: fields.get('autoSwitch') === 'on' } }); }}>{[['model', 'Model'], ['cliProfile', 'CLI profile'], ['cwd', 'Owned workspace reference (optional UUID)']].map(([key, label]) => <label key={key}>{label}<input name={key} maxLength={80}/></label>)}<label>Agent role<select name="role"><option>PRIMARY</option><option>REVIEW</option><option>FALLBACK</option></select></label><label className={styles.check}><input type="checkbox" name="autoSwitch"/>Allow switching when an executor becomes available</label><button type="submit" disabled={!writable || busy}>Save structured configuration</button></form> : null}</> : null}
        {tab === 'Usage' ? <><h3>Usage provenance</h3>{(profile ? data?.usage?.[profile.id] : null)?.map(usage => <article className={styles.profile} key={usage.source}><h4>{usage.source}</h4><dl className={styles.facts}>{Object.entries(usage).filter(([key]) => key !== 'source').map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? unknown}</dd></div>)}</dl></article>) ?? <p>No usage measured. Requests, tokens, balances and limits remain UNKNOWN.</p>}<p>KNOuX measurements cover the current server instance and retained operations. They are separate from your provider’s bill.</p>{profile?.providerLimits?.map(limit => <article className={styles.profile} key={limit.limitType}><h4>{limit.limitType}</h4><p>{limit.source} · remaining {limit.remaining ?? 'UNKNOWN'} / total {limit.total ?? 'UNKNOWN'} · reset {limit.resetAt ?? 'UNKNOWN'} · measured {limit.measuredAt ?? 'UNTESTED'}</p></article>)}</> : null}
        {tab === 'Health' || tab === 'Diagnostics' ? <><h3>Measured diagnostics</h3><p>{profile?.connection.blocker ?? 'No measured refusal.'}</p><p>Last test: {profile?.connection.lastTestedAt ?? 'UNTESTED'} · last success: {profile?.connection.lastSuccessAt ?? 'UNTESTED'} · category: {profile?.connection.lastErrorCategory ?? 'NONE'}</p><h4>Last explicit live test</h4>{profile?.lastLiveTest ? <dl className={styles.facts}>{Object.entries(profile.lastLiveTest).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? "UNKNOWN"}</dd></div>)}</dl> : <p>UNTESTED — no acknowledged live generation test.</p>}<h4>Safe audit</h4>{data?.audit.filter(event => event.profileId === profile?.id || credentials.some(item => item.id === event.credentialId)).map(event => <p key={event.id}>{event.event} · {event.createdAt}</p>)}{profile && !definition.detectionOnly ? <><label className={styles.check}><input type="checkbox" checked={billing} onChange={event => setBilling(event.target.checked)}/>I acknowledge that a live generation test may incur provider charges.</label><label className={styles.check}><input type="checkbox" checked={streamBilling} onChange={event => setStreamBilling(event.target.checked)}/>Also run a separate tiny streaming request (may incur additional charges).</label><button type="button" disabled={!writable || busy || !billing} onClick={() => void command({ action: 'RUN_LIVE_GENERATION_TEST', id: profile.id, version: profile.version, billingAcknowledged: true, streamingAcknowledged: streamBilling })}>RUN LIVE GENERATION TEST</button><p>This separate action never runs during connection testing.</p></> : null}</> : null}
        </section>
      </>}</section>
    </div>
    <dialog className={styles.dialog} ref={dialog} onCancel={event => { event.preventDefault(); closeWizard(); }} onClose={() => { setWizard(false); setSecret(''); setEditProfile(null); }} aria-labelledby="provider-profile-title"><form className={styles.form} onSubmit={event => void createProfile(event)}><div className={styles.actions}><h2 id="provider-profile-title">{definition ? editProfile ? `Edit ${definition.name} authentication` : `Add ${definition.name} profile` : 'Provider profile'}</h2><button type="button" onClick={closeWizard}>Close</button></div><label>Profile name<input autoFocus required maxLength={80} value={profileName} onChange={event => setProfileName(event.target.value)}/></label><label>Authentication source<select value={authMode} onChange={event => { setAuthMode(event.target.value as AuthSource['mode']); setReference(event.target.value === 'ENV_REFERENCE' ? definition?.environmentNames[0] ?? '' : ''); }}>{definition?.authModes.map(mode => <option key={mode} disabled={mode === 'ENV_REFERENCE' && !data?.operator}>{mode}</option>)}</select></label>{authMode === 'ENV_REFERENCE' ? <label>Declared environment name<select value={reference} onChange={event => setReference(event.target.value)}>{definition?.environmentNames.map(variable => <option key={variable}>{variable}</option>)}</select></label> : authMode === 'CLI_PROFILE' ? <label>CLI profile reference<input required maxLength={80} value={reference} onChange={event => setReference(event.target.value)}/></label> : <>{authMode === 'LOCAL_ENDPOINT' || authMode === 'CUSTOM_ENDPOINT' ? <label>Endpoint URL<input required type="url" value={reference} onChange={event => setReference(event.target.value)} placeholder={authMode === 'LOCAL_ENDPOINT' ? 'http://127.0.0.1:11434/v1' : 'https://approved-host.example/v1'}/></label> : null}<label>Stored credential<select value={credentialId} onChange={event => setCredentialId(event.target.value)}><option value="">Unconfigured / no credential</option>{credentials.filter(item => item.configured).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p>Add a write-only credential in Credentials first. No key is exposed by this selector.</p></>}<button type="submit" disabled={!writable || busy}>{editProfile ? "Save authentication" : "Create profile"}</button><p>New profiles are inactive until explicitly selected. Authentication and execution remain UNTESTED.</p></form></dialog>
  </div>;
}
