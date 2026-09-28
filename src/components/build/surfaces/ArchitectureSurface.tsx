'use client';

/**
 * Project Cortex and Impact Radar.
 *
 * Both are built from the adapter's real graph, and both refuse to synthesise
 * a topology. A domain that could not be introspected appears as
 * `UNAVAILABLE` with the reason, because a plausible invented node is worse
 * than a gap the reader can see.
 *
 * The Impact Radar reports counts derived from actual import edges. It has no
 * percentage and no risk score, because neither can be derived honestly from a
 * static import graph.
 */

import { useMemo, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Empty, KV, Pane, Section, StatusBadge } from '../workspace/Primitives';
import type { ProjectGraphNode, ProjectNodeDomain } from '@/lib/build/types';

const DOMAIN_ORDER: ProjectNodeDomain[] = [
  'routes', 'api', 'ui', 'data', 'auth', 'ai', 'tests', 'dependencies', 'storage', 'deployment',
];

const DOMAIN_LABEL: Record<ProjectNodeDomain, string> = {
  ui: 'Interface',
  routes: 'App routes',
  api: 'API routes',
  auth: 'Auth',
  data: 'Registries',
  storage: 'Storage',
  ai: 'AI providers',
  tests: 'Tests',
  dependencies: 'Dependencies',
  deployment: 'Deployment',
  unavailable: 'Unavailable',
};

export function ArchitectureSurface() {
  const { state, dispatch } = useBuildWorkspace();
  const [selected, setSelected] = useState<ProjectGraphNode | null>(null);
  const graph = state.graph;

  const lanes = useMemo(() => {
    if (!graph) return [];
    return DOMAIN_ORDER.map((domain) => ({
      domain,
      nodes: graph.nodes.filter((node) => node.domain === domain),
    })).filter((lane) => lane.nodes.length > 0);
  }, [graph]);

  if (!graph) {
    return (
      <Pane title="Project Cortex" meta={<StatusBadge status={state.status} />}>
        <Empty title="No topology yet" body="The project graph is read from the deployment that serves this page. It has not resolved." />
      </Pane>
    );
  }

  const unavailable = graph.nodes.filter((node) => node.status === 'unavailable');

  return (
    <Pane
      title="Project Cortex"
      meta={
        <>
          <span>{graph.nodes.length} NODES</span>
          <span>{graph.edges.length} EDGES</span>
        </>
      }
    >
      <div className="bo-cortex">
        {lanes.map((lane) => (
          <div className="bo-cortex__lane" key={lane.domain}>
            <div className="bo-cortex__head">
              <span className="bo-label">{DOMAIN_LABEL[lane.domain]}</span>
              <span className="bo-status" data-status="not-run">
                {lane.nodes.length}
              </span>
              {lane.domain === 'storage' ? <StatusBadge status="unavailable" label="UNAVAILABLE" /> : null}
            </div>
            <div className="bo-cortex__grid">
              {lane.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className="bo-node"
                  data-status={node.status}
                  onClick={() => {
                    setSelected(node);
                    dispatch({ type: 'diagnostic/select', id: null });
                  }}
                  aria-pressed={selected?.id === node.id}
                >
                  {node.label}
                  {node.source ? <span className="bo-node__src">{node.source}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bo-pane__body--pad" style={{ padding: 20, borderTop: '1px solid var(--bo-line)' }}>
        <Section label="Selected node">
          {selected ? (
            <KV
              rows={[
                { k: 'Id', v: selected.id },
                { k: 'Domain', v: DOMAIN_LABEL[selected.domain] },
                { k: 'Label', v: selected.label },
                { k: 'Source', v: selected.source ?? 'NONE — this domain could not be introspected.' },
                { k: 'Path', v: selected.path ?? '—' },
                { k: 'Route', v: selected.route ?? '—' },
                { k: 'Status', v: <StatusBadge status={selected.status === 'present' ? 'pass' : 'unavailable'} label={selected.status.toUpperCase()} /> },
                { k: 'Detail', v: selected.detail },
              ]}
            />
          ) : (
            <p className="bo-note">
              Every node above cites the file it was read from. Select one to see its provenance. Nothing in this
              topology is authored: routes come from the App Router tree, dependencies from the manifest, tests from
              the test directory, and import edges from parsing the real module sources.
            </p>
          )}
        </Section>

        {unavailable.length > 0 ? (
          <>
            <div style={{ height: 20 }} />
            <Section label="Domains that could not be introspected">
              {unavailable.map((node) => (
                <div key={node.id} style={{ marginBottom: 10 }}>
                  <StatusBadge status="unavailable" label="UNAVAILABLE" />
                  <p className="bo-note" style={{ marginTop: 6 }}>{node.detail}</p>
                </div>
              ))}
            </Section>
          </>
        ) : null}
      </div>
    </Pane>
  );
}

/* ------------------------------------------------------------- impact radar */

export function ImpactRadar() {
  const { state } = useBuildWorkspace();
  const graph = state.graph;
  const [target, setTarget] = useState<string | null>(null);

  const impact = useMemo(() => {
    if (!graph) return null;
    if (!target) {
      const moduleCount = graph.nodes.filter((node) => node.id.startsWith('mod:')).length;
      const testCount = graph.nodes.filter((node) => node.id.startsWith('test:')).length;
      const routeCount = graph.nodes.filter((node) => node.domain === 'routes').length;
      return { importers: 0, routes: routeCount, tests: testCount, modules: moduleCount, target: null };
    }
    const importers = graph.edges.filter((edge) => edge.to === target);
    const importersOfImporters = new Set<string>();
    for (const edge of importers) {
      for (const second of graph.edges.filter((candidate) => candidate.to === edge.from)) {
        importersOfImporters.add(second.from);
      }
    }
    const node = graph.nodes.find((entry) => entry.id === target);
    const touchingTests = graph.edges
      .filter((edge) => edge.from === target || edge.to === target)
      .filter((edge) => edge.to.startsWith('test:') || edge.from.startsWith('test:'));
    return {
      importers: importers.length,
      indirectImporters: importersOfImporters.size,
      routes: node?.route ? 1 : 0,
      tests: touchingTests.length,
      modules: 0,
      target: node,
    };
  }, [graph, target]);

  if (!graph) {
    return (
      <Pane title="Impact Radar">
        <Empty title="No graph yet" body="The import graph is read from the deployment source." />
      </Pane>
    );
  }

  const modules = graph.nodes.filter((node) => node.id.startsWith('mod:'));

  return (
    <Pane title="Impact Radar" meta={<span>{graph.edges.length} IMPORT EDGES</span>}>
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Change target">
          <select
            className="bo-select"
            value={target ?? ''}
            onChange={(event) => setTarget(event.target.value || null)}
            aria-label="Change target module"
          >
            <option value="">— select a module —</option>
            {modules.map((node) => (
              <option key={node.id} value={node.id}>
                {node.path}
              </option>
            ))}
          </select>
        </Section>

        <div style={{ height: 20 }} />

        {impact?.target ? (
          <>
            <Section label="Known impact">
              <KV
                rows={[
                  { k: 'Target', v: impact.target.path ?? impact.target.id },
                  { k: 'Direct importers', v: `${impact.importers} module${impact.importers === 1 ? '' : 's'}` },
                  { k: 'Indirect importers', v: `${impact.indirectImporters} module${impact.indirectImporters === 1 ? '' : 's'}` },
                  { k: 'Routes served', v: impact.routes === 0 ? 'none directly' : impact.target.route },
                  { k: 'Related tests', v: `${impact.tests} test file${impact.tests === 1 ? '' : 's'} reference it` },
                ]}
              />
            </Section>
            <div style={{ height: 16 }} />
            {impact.importers > 0 ? (
              <Section label="Importers">
                <table className="bo-table">
                  <thead>
                    <tr>
                      <th scope="col">Module</th>
                      <th scope="col">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.edges
                      .filter((edge) => edge.to === target)
                      .map((edge, index) => (
                        <tr key={`${edge.from}-${index}`}>
                          <td>{edge.from.replace('mod:', '')}</td>
                          <td>{edge.evidence}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Section>
            ) : (
              <p className="bo-note">No module in this build imports the selected file.</p>
            )}
          </>
        ) : (
          <Blocked
            title="No target selected"
            body="Select a module to see the modules that import it, counted from parsed import statements in the real sources."
            requirement="A module with at least one import edge. A file nothing imports has no blast radius to report."
          />
        )}

        <div style={{ height: 20 }} />
        <p className="bo-blocked__req">
          No percentage or risk score is shown. A static import graph supports counts and relationships, and a
          synthetic probability derived from them would be a fabricated measurement.
        </p>
      </div>
    </Pane>
  );
}
