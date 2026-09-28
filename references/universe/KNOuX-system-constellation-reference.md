# KNOuX System Constellation / Inspector Reference

## Purpose
Specialized engineering reference for:
- Product Universe
- Institution / division map
- interactive node inspection
- contextual detail drawer

## Source assessment
The supplied AGENT.OS HTML is useful as an interaction-shell reference, not as a complete 3D implementation.

The HTML contains:
- a separate connector-line canvas
- numbered side navigation
- cursor-follow tooltip
- right-side sliding inspector overlay
- node-selection event dispatch
- responsive simplification rules
- sparse black/white technical layout

The HTML references `index.js`, but that file was not supplied.
Therefore the actual 3D node/constellation implementation is not available and must not be claimed as copied or reproduced.

## Patterns to adapt
1. Connector layer
   - Keep connection lines in a dedicated SVG/Canvas layer.
   - Recompute only when node positions/viewport require it.
   - Keep pointer events disabled on decorative connectors.

2. Micro-navigation
   - Numbered entries with a restrained expanding tick.
   - Use for KNOuX divisions, product families, or constellation filters.
   - Must support keyboard focus, not hover only.

3. Context tooltip
   - Follow the pointer only on desktop/pointer-fine devices.
   - Use requestAnimationFrame/ref updates instead of React state for every mousemove.
   - Disable or replace on touch.

4. Node selection
   - Selecting a real KNOuX node changes an explicit selected-node state.
   - Do not build the architecture around global CustomEvents unless there is a clear integration reason.
   - React state/context/store is preferred inside the existing application.

5. Inspector drawer
   - Dark, restrained right-side panel.
   - Label, product/division name, verified status, real capabilities, evidence/links, CTA.
   - Open from the constellation without forcing a full page transition.
   - Deep-link/shareable product routes still remain available.

6. Responsive degradation
   - Remove secondary telemetry and decorative controls first.
   - Preserve core navigation and inspector usability.

## Never copy
- AGENT.OS branding or IA
- fake agent counts
- fake uptime
- random TX/min values
- invented system status
- demo version strings
- global scanline styling
- Google Fonts runtime dependency
- unseen `index.js` logic

## KNOuX visual translation
Use the accepted KNOuX language:
- deep black / graphite
- off-white / silver / platinum
- restrained violet accent
- particle / constellation continuity from the Living Mark
- large negative space
- precise typography
- subtle depth, not dashboard clutter

## Data truth
Every product/division node must be generated from the existing verified KNOuX registries and repository evidence.
No placeholder repositories, client projects, fake metrics, or speculative capabilities.

## Performance
Prefer DOM/SVG/Canvas 2D for connector lines, hover fields, labels, and inspector UI.
Use Three.js only if the current Product Universe already requires true spatial depth.
Avoid creating another permanent WebGL context when the existing KNOuX scene can be reused.

## Accessibility
- keyboard-selectable nodes
- visible focus states
- aria-expanded / aria-controls for inspector triggers
- Escape closes the inspector
- focus returns to the originating node
- no hover-only information
- reduced-motion path removes cursor-follow and spatial drift
