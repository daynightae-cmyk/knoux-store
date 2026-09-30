# Quiet Room — Scene Mechanics Reference

Purpose: preserve only mechanics that are useful to the KNOuX About opening experience.
Do not copy the source game, branding, palette, assets, audio, or narrative.

## Verified source stack

The supplied scene uses Three.js directly:
- THREE.Scene
- PerspectiveCamera
- WebGLRenderer
- GLTFLoader
- RoundedBoxGeometry
- Raycaster
- AudioListener

Renderer behavior includes:
- antialias
- DPR capped to 2
- shadow maps
- SRGB output
- ACES filmic tone mapping
## Verified source opening behavior

The HTML presents an opening overlay with a Begin button.

The scene code binds:
gameStartBtn.click -> beginExploration()

beginExploration():
- requires phase === opening
- changes the phase to exploring
- starts the one-minute timer
- starts radio playback when enabled

setGamePhase(exploring):
- removes the intro overlay
- exposes the room title/timer
- enables the exploration hint and interaction state

IMPORTANT:
The source lamp is NOT turned on by Begin.
The lamp is initialized as:

lampOn = true

and its key/fill lights are created at non-zero intensity.

The source therefore appears to "light up" on Begin mainly because the opening overlay disappears.
This is a visual reveal, not a true light-from-zero sequence.

For KNOuX, deliberately improve this mechanic:
ENTER KNOuX must trigger a real staged awakening from darkness.
## Verified source lighting model

The source uses several layered lights:
- dim ambient room light
- desk-lamp PointLight as key
- secondary lamp fill
- cool directional window fill
- soft wall fill
- desk bounce PointLight
- top-down room fill
- room-side fill

It also toggles lamp-driven material properties and a subtle flicker.

Useful lesson:
do not rely on one giant light.
Use layered low-intensity sources with one meaningful focal source.
## Verified source interaction model

The scene maintains an interactables registry.

Each interactable stores:
- mesh
- semantic id
- target camera position
- target look position
- optional outline behavior

A THREE.Raycaster maps pointer position to interactable objects.

This supports:
- hover/focus discovery
- click-to-focus
- camera movement toward selected objects
- object-specific actions
- contextual information card
## Verified source mobile behavior

The source detects coarse pointer input and maintains a reduced yaw/pitch view state.

Useful lesson:
mobile does not need desktop pointer behavior.

KNOuX should:
- preserve touch exploration
- reduce motion/particle density
- avoid tiny raycast targets
- provide equivalent DOM controls when needed
- never lock essential About information behind 3D interaction
## What NOT to preserve

Do not carry into KNOuX:
- one-minute game
- question / prize / answer flow
- restart flow
- radio gameplay
- guitar gameplay
- Omma references
- source GLB models
- source photos
- source audio
- warm brass / gold / brown identity
- Argentina clock behavior
- hidden native cursor as a requirement
- source Vite configuration
## KNOuX translation

Target sequence:

DARKNESS
→ ENTER KNOuX
→ canonical LivingParticleMark wakes
→ platinum/silver/violet light expands
→ architectural workspace becomes readable
→ five semantic objects become discoverable
→ selected object focuses smoothly
→ KNOuX information card appears
→ return restores home camera

The scene is an institutional interface, not a game.